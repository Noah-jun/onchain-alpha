// 小时情报 API
// Wizz 小时情报风格 — 整点抓取 @hourintel 频道内容并结构化输出

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { isVercel } from '@/lib/serverEnv'

export const dynamic = 'force-dynamic'

const CACHE_DIR = path.join(process.cwd(), 'data', 'hourly-intel')

function hourCachePath(): string {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  const now = new Date()
  const hourKey = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}`
  return path.join(CACHE_DIR, `${hourKey}.json`)
}

function readCache(): any {
  try {
    const p = hourCachePath()
    if (!fs.existsSync(p)) return null
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'))
    if (Date.now() - raw.generatedAt < 60 * 60 * 1000) return raw
  } catch {}
  return null
}

function writeCache(data: any) {
  if (isVercel) return
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(hourCachePath(), JSON.stringify(data, null, 2))
  } catch {}
}

// 从 @hourintel 频道抓取最新一期情报
async function fetchWizzIntel(): Promise<{ raw: string; hour: string; date: string } | null> {
  let html: string
  try {
    if (isVercel) {
      // Vercel 上直接 fetch（无 GFW）
      const res = await fetch('https://t.me/s/hourintel', { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      html = await res.text()
    } else {
      // 本地：curl 走代理
      html = execSync(
        `curl -sL --max-time 15 --connect-timeout 5 --proxy http://127.0.0.1:7897 "https://t.me/s/hourintel"`,
        { timeout: 20000, encoding: 'utf-8' }
      )
    }
    // 提取第一条消息
    const match = html.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)
    if (!match || !match[1]) return null
    let text = match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#036;/g, '$')
      .replace(/\s*─+\s*/g, '\n──────────────────\n')
      .trim()

    // 提取小时和日期
    const hourMatch = text.match(/📡\s*(\d+)点情报/)
    const dateMatch = text.match(/🕐\s*(\d{4}-\d{2}-\d{2})/)

    return {
      raw: text,
      hour: hourMatch ? `${hourMatch[1]}:00` : '',
      date: dateMatch ? dateMatch[1] : '',
    }
  } catch (e) {
    console.error('[Hourly Intel] Fetch wizz error:', e)
    return null
  }
}

// 解析 Wizz 原始文本为结构化数据
function parseWizzIntel(raw: string, hour: string, date: string): any {
  const result: any = {
    hour,
    date,
    period: `${hour.replace(':00', ':00')}→${String(parseInt(hour) + 1).padStart(2, '0')}:00 SGT`,
    summary: { totalItems: 0, highPriority: 0, topSymbol: '' },
    priceAnomalies: [],
    keyInfo: [],
    analysis: [],
    watchlist: [],
    narrativeTemp: [],
    macroEvents: [],
    eventCalendar: [],
    marketStructure: [],
    rawText: raw,
    sources: ['Wizz 小时情报 (@hourintel)'],
    generatedAt: Date.now(),
  }

  // 解析各个区块
  const sections: Record<string, string> = {}
  let currentSection = ''
  const lines = raw.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('🚨')) { currentSection = 'priceAnomalies'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('⭐')) { currentSection = 'keyInfo'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('🧠')) { currentSection = 'analysis'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('👀')) { currentSection = 'watchlist'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('🧩')) { currentSection = 'narrativeTemp'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('🌐')) { currentSection = 'macroEvents'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('🗓')) { currentSection = 'eventCalendar'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('📊')) { currentSection = 'marketStructure'; sections[currentSection] = ''; continue }
    if (trimmed.startsWith('─')) continue
    if (currentSection && sections[currentSection] !== undefined) {
      sections[currentSection] += (sections[currentSection] ? '\n' : '') + trimmed
    }
  }

  // 解析价格异动
  if (sections.priceAnomalies) {
    const blockLines = sections.priceAnomalies.split('\n').filter((l: string) => l.trim())
    for (const line of blockLines) {
      if (!line.includes('+') && !line.includes('-')) continue
      const symMatch = line.match(/^(?:🟢|🔻|🔴|🟡)\s*(\w+)/)
      if (!symMatch) continue
      const a: any = { symbol: symMatch[1], change24h: 0, change5m: 0, oi: '', volumeRatio: '', tags: [] }

      const chg24 = line.match(/([+-]\d+\.?\d*)%\s*\(24h\)/)
      if (chg24) a.change24h = parseFloat(chg24[1])

      const chg5 = line.match(/([+-]\d+\.?\d*)%\s*\(5m\)/)
      if (chg5) a.change5m = parseFloat(chg5[1])

      const oi = line.match(/OI\s*([\d.]+[MK]?)(\([^)]*\))?/)
      if (oi) a.oi = oi[0].replace('OI ', '')

      const vol = line.match(/量(\d+x)/)
      if (vol) a.volumeRatio = vol[1]

      const tag = line.match(/#(\w+)(?:⬆|⬇)?/)
      if (tag) a.tags = [tag[0]]

      if (!result.summary.topSymbol) result.summary.topSymbol = a.symbol
      result.priceAnomalies.push(a)
    }
  }

  // 解析重点信息
  if (sections.keyInfo) {
    const items = sections.keyInfo.split('\n').filter((l: string) => l.trim())
    let current: any = null
    for (const line of items) {
      const rankMatch = line.match(/^(\d+)\.\s*(.*)/)
      if (rankMatch) {
        if (current) result.keyInfo.push(current)
        current = { rank: parseInt(rankMatch[1]), title: rankMatch[2], tags: [], sources: [] }
      } else if (current) {
        if (line.startsWith('[') && line.endsWith(']')) {
          // Tags like [筹码] [新增] [需盯盘]
          const tags = line.match(/\[([^\]]+)\]/g)
          if (tags) current.tags = tags.map((t: string) => t.replace(/[\[\]]/g, ''))
        } else if (line.includes('｜') || line.includes('http')) {
          // Sources: 来源名｜X1 TG1 or URL
          const sources = line.split('｜').filter((s: string) => s.trim())
          for (const src of sources) {
            const urlMatch = src.match(/(https?:\/\/[^\s]+)/)
            const nameMatch = src.replace(urlMatch?.[1] || '', '').trim()
            current.sources.push({ name: nameMatch || '来源', url: urlMatch?.[1] || '' })
          }
        }
      }
    }
    if (current) result.keyInfo.push(current)
  }

  // 解析研判与分析
  if (sections.analysis) {
    const items = sections.analysis.split('\n').filter((l: string) => l.trim())
    for (const line of items) {
      const match = line.match(/^•\s*(?:\[([^\]]+)\])?\s*(.*?)(?:\s+(https?:\/\/[^\s]+))?$/)
      if (match) {
        result.analysis.push({
          type: match[1] || '分析',
          content: match[2]?.trim() || match[1]?.trim() || '',
          source: match[3] ? { name: new URL(match[3]).hostname.replace('www.', ''), url: match[3] } : undefined,
        })
      }
    }
  }

  // 解析 Watchlist
  if (sections.watchlist) {
    const items = sections.watchlist.split('\n').filter((l: string) => l.trim())
    for (const line of items) {
      const match = line.match(/^•\s*(.*?)(?:\s+\[([^\]]+)\]\s*\[([^\]]+)\])?$/)
      if (match) {
        const w: any = { title: match[1]?.trim() || match[0]?.trim() || '', tags: [] }
        if (line.includes('[')) {
          const tags = line.match(/\[([^\]]+)\]/g)
          if (tags) {
            // Last one or two are source tags, rest are content tags
            const contentTags = tags.map((t: string) => t.replace(/[\[\]]/g, ''))
            w.tags = contentTags
          }
        }
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/)
        if (urlMatch) {
          w.source = { name: new URL(urlMatch[1]).hostname.replace('www.', ''), url: urlMatch[1] }
        }
        result.watchlist.push(w)
      }
    }
  }

  // 解析叙事温度
  if (sections.narrativeTemp) {
    const items = sections.narrativeTemp.split('\n').filter((l: string) => l.trim())
    for (const line of items) {
      const match = line.match(/^•\s*(?:\[([^\]]+)\])?\s*(.*?)(?:\s+(https?:\/\/[^\s]+))?$/)
      if (match) {
        result.narrativeTemp.push({
          trend: match[1] || '观察',
          title: match[2]?.trim() || '',
          source: match[3] ? { name: new URL(match[3]).hostname.replace('www.', ''), url: match[3] } : undefined,
        })
      }
    }
  }

  // 解析市场结构
  if (sections.marketStructure) {
    const items = sections.marketStructure.split('\n').filter((l: string) => l.trim())
    for (const line of items) {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/)
      result.marketStructure.push({
        text: line.startsWith('•') ? line.substring(1).trim() : line,
        source: urlMatch ? { name: new URL(urlMatch[1]).hostname.replace('www.', ''), url: urlMatch[1] } : undefined,
      })
    }
  }

  // 解析宏观与监管
  if (sections.macroEvents) {
    const items = sections.macroEvents.split('\n').filter((l: string) => l.trim())
    for (const line of items) {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/)
      result.macroEvents.push({
        text: line.startsWith('•') ? line.substring(1).trim() : line,
        source: urlMatch ? { name: new URL(urlMatch[1]).hostname.replace('www.', ''), url: urlMatch[1] } : undefined,
      })
    }
  }

  // Summary
  result.summary = {
    totalItems: (result.keyInfo?.length || 0) + (result.analysis?.length || 0) + (result.watchlist?.length || 0),
    highPriority: result.keyInfo?.length || 0,
    topSymbol: result.summary.topSymbol || (result.priceAnomalies?.[0]?.symbol || ''),
  }

  return result
}

export async function GET() {
  // 读缓存
  const cached = readCache()
  if (cached) return NextResponse.json(cached)

  try {
    // 抓取 Wizz 小时情报
    const wizz = await fetchWizzIntel()
    if (wizz?.raw) {
      const output = parseWizzIntel(wizz.raw, wizz.hour, wizz.date)
      writeCache(output)
      return NextResponse.json(output)
    }

    // 抓取失败 → 返回空数据
    console.error('[Hourly Intel] Failed to fetch Wizz intel')
    return NextResponse.json({
      hour: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().slice(0, 10),
      period: '',
      summary: { totalItems: 0, highPriority: 0, topSymbol: '' },
      priceAnomalies: [], keyInfo: [], analysis: [], watchlist: [],
      narrativeTemp: [], macroEvents: [], marketStructure: [],
      sources: ['抓取失败'],
      generatedAt: Date.now(),
      error: 'Wizz 小时情报抓取失败',
    })
  } catch (error: any) {
    console.error('[Hourly Intel] Error:', error)
    return NextResponse.json({
      hour: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().slice(0, 10),
      period: '', summary: { totalItems: 0, highPriority: 0, topSymbol: '' },
      priceAnomalies: [], keyInfo: [], analysis: [], watchlist: [],
      narrativeTemp: [], macroEvents: [], marketStructure: [],
      generatedAt: Date.now(), error: error.message,
    })
  }
}
