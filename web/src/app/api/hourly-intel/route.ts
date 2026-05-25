// 小时情报 API
// Wizz 小时情报风格 — 整点抓取 @hourintel 频道内容并结构化输出

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { isVercel } from '@/lib/serverEnv'

export const dynamic = 'force-dynamic'

// 本地缓存目录（写入 data/hourly-intel 或 Vercel /tmp）
const LOCAL_DIR = path.join(process.cwd(), 'data', 'hourly-intel')
const VERCEL_TMP = '/tmp/onchain-alpha-hourly-intel'

function getCacheDir(): string {
  return isVercel ? VERCEL_TMP : LOCAL_DIR
}

function hourKey(date?: Date): string {
  const d = date || new Date()
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`
}

function hourCachePath(date?: Date): string {
  return path.join(getCacheDir(), `${hourKey(date)}.json`)
}

// 内存缓存（Vercel 冷启动时用）
const memCache = new Map<string, { data: any; ts: number }>()

function readCache(): any {
  // 1. 本地文件
  try {
    const p = hourCachePath()
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8'))
      if (Date.now() - raw.generatedAt < 15 * 60 * 1000) return raw
    }
  } catch {}
  // 2. 内存缓存
  const memKey = hourKey()
  const mem = memCache.get(memKey)
  if (mem && Date.now() - mem.ts < 15 * 60 * 1000) return mem.data
  return null
}

function writeCache(data: any) {
  const memKey = hourKey()
  memCache.set(memKey, { data, ts: Date.now() })
  try {
    const dir = getCacheDir()
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, `${memKey}.json`), JSON.stringify(data, null, 2))
  } catch {}
}

// 从 @hourintel 频道抓取最新一期情报
async function fetchWizzIntel(): Promise<{ latest: { raw: string; hour: string; date: string }; history: { raw: string; hour: string; date: string }[] } | null> {
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
    // 提取最新12条消息（页面按时间正序，最后12条即最近12小时）
    const matches = [...html.matchAll(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g)]
    const latest = matches.slice(-12)
    if (!latest.length) return null

    const results: { raw: string; hour: string; date: string }[] = []
    for (const m of latest) {
      let text = m[1]
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

      const hMatch = text.match(/📡\s*(\d+)点情报/)
      const dMatch = text.match(/🕐\s*(\d{4}-\d{2}-\d{2})/)
      results.push({
        raw: text,
        hour: hMatch ? `${hMatch[1]}:00` : '',
        date: dMatch ? dMatch[1] : '',
      })
    }
    return { latest: results[results.length - 1], history: results.slice(0, -1) }
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

// 读取过去 hours 小时内的所有缓存文件
function readRecentCaches(hours: number): any[] {
  const items: any[] = []
  const now = Date.now()
  const checked = new Set<string>()

  // 尝试的缓存源
  const cacheFiles = (h: number): string[] => {
    const d = new Date(now - h * 60 * 60 * 1000)
    const key = hourKey(d)
    const paths: string[] = [path.join(getCacheDir(), `${key}.json`)]
    // 也检查本地目录（本机开发环境写入了 data/）
    if (isVercel) paths.push(path.join(LOCAL_DIR, `${key}.json`))
    return paths
  }

  for (let h = 0; h < hours; h++) {
    const d = new Date(now - h * 60 * 60 * 1000)
    const key = hourKey(d)
    if (checked.has(key)) continue
    checked.add(key)

    let data: any = null

    // 1. 内存缓存
    const mem = memCache.get(key)
    if (mem) data = mem.data

    // 2. 文件缓存
    if (!data) {
      for (const fp of cacheFiles(h)) {
        try {
          if (fs.existsSync(fp)) {
            data = JSON.parse(fs.readFileSync(fp, 'utf-8'))
            break
          }
        } catch {}
      }
    }

    if (data) {
      items.push({
        ...data,
        hourKey: key,
        hourLabel: data.hour || `${d.getHours()}:00`,
      })
    }
  }

  return items.sort((a, b) => (b.hourKey || '').localeCompare(a.hourKey || ''))
}

export async function GET(request: Request) {
  // mode=list → 返回过去 24h 的历史列表
  const mode = new URL(request.url).searchParams.get('mode') || ''
  if (mode === 'list') {
    return NextResponse.json({ items: readRecentCaches(24) })
  }

  // 默认 mode → 返回当前小时数据
  const cached = readCache()
  if (cached) return NextResponse.json(cached)

  try {
    const wizz = await fetchWizzIntel()
    if (wizz?.latest?.raw) {
      const output = parseWizzIntel(wizz.latest.raw, wizz.latest.hour, wizz.latest.date)
      // 附加历史列表
      if (wizz.history?.length) {
        output.recentHours = wizz.history.map(h => ({
          hour: h.hour,
          date: h.date,
          summary: parseWizzIntel(h.raw, h.hour, h.date).summary || {},
          priceAnomalies: parseWizzIntel(h.raw, h.hour, h.date).priceAnomalies || [],
          keyInfo: parseWizzIntel(h.raw, h.hour, h.date).keyInfo || [],
        }))
      }
      writeCache(output)
      return NextResponse.json(output)
    }

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
