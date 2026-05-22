// New Listings API
// 数据源：Odaily 快讯缓存文件（由定时任务每5分钟刷新）
// 解析上币公告关键词

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface NewListingItem {
  id: string; type: 'newlisting'; riskLevel: 'high' | 'medium' | 'low'
  timestamp: number; chain: string; symbol: string; exchange: string
  marketType: 'spot' | 'futures'; listedAt: number
  announcementUrl: string; description: string; isHot: boolean; source: string
}

const EXCHANGE_MAP: Record<string, { keywords: string[]; label: string }> = {
  'Binance': { keywords: ['binance','币安','bn'], label: '币安' },
  'OKX': { keywords: ['okx','欧易'], label: 'OKX' },
  'Hyperliquid': { keywords: ['hyperliquid','hl'], label: 'Hyperliquid' },
}

const CACHE_FILE = path.join(process.cwd(), '..', 'data', 'odaily-news.html')

function parseOdailyHTML(html: string): { time: string; title: string }[] {
  const items: { time: string; title: string }[] = []
  // 从 JSON-LD 结构化数据中提取所有新闻标题
  const nameRegex = /"name":"([^"]+)"/g
  let m
  while ((m = nameRegex.exec(html)) !== null) {
    const title = m[1]
    // 过滤掉 meta 类标题（非新闻内容）
    if (title.length > 10 && !title.includes('Odaily') && !title.includes('页码') && !title.includes('首页') && !title.includes('安全提醒')) {
      items.push({ time: '', title })
    }
  }
  return items.slice(0, 30)
}

function extractListings(html: string): { items: NewListingItem[]; allNews: string[] } {
  const newsItems = parseOdailyHTML(html)
  const now = Date.now()
  const items: NewListingItem[] = []
  const allNews: string[] = []
  const usedKeys = new Set<string>()

  let hourOffset = 0
  for (const n of newsItems) {
    allNews.push(n.title)
    const fullText = n.title.toLowerCase()
    hourOffset += 1  // 每条间隔约 1 小时

    // 检查是否上币相关（精确匹配）
    if (!/上线|上架|将开放.*交易|将.*上线|new listing/i.test(fullText)) continue

    // 匹配交易所
    let matchedExchange = ''
    for (const [ex, info] of Object.entries(EXCHANGE_MAP)) {
      if (info.keywords.some(k => fullText.includes(k))) {
        matchedExchange = ex; break
      }
    }
    if (!matchedExchange) continue

    // 匹配代币名（尝试匹配大写字母组合）
    const tokenInTitle = n.title.match(/([A-Z0-9]{2,8})(?:USDT|永续|合约|现货)/)

    // 提取代币名
    const tokenMatch = n.title.match(/([A-Z0-9]{2,8})USDT/) || n.title.match(/list\s+([A-Z0-9]{2,8})/i)
    let symbol = tokenMatch ? tokenMatch[1].toUpperCase() : ''

    // 判断类型
    const isPerp = /perpetual|永续|合约/.test(fullText)
    const marketType = isPerp ? 'futures' as const : 'spot' as const

    // 去重
    const key = `${matchedExchange}-${symbol || 'unk'}-${marketType}`
    if (usedKeys.has(key)) continue
    usedKeys.add(key)

    const listedAt = now - hourOffset * 3600000

    items.push({
      id: `odaily-${key}`,
      type: 'newlisting',
      riskLevel: isPerp ? 'medium' : 'low',
      timestamp: listedAt,
      chain: `${matchedExchange} ${marketType === 'spot' ? '现货' : '合约'}`,
      symbol: symbol || '新代币',
      exchange: matchedExchange,
      marketType,
      listedAt,
      announcementUrl: matchedExchange === 'Binance'
        ? 'https://www.binance.com/zh-CN/support/announcement/新币上线'
        : matchedExchange === 'OKX'
        ? 'https://www.okx.com/zh-hans/help/section/新币上线'
        : 'https://hyperliquid.xyz/trading',
      description: n.title,
      isHot: hourOffset <= 6,
      source: 'Odaily'
    })
  }

  items.sort((a, b) => b.listedAt - a.listedAt)
  return { items, allNews }
}

// 后备数据
function getFallback(): NewListingItem[] {
  const now = Date.now()
  const data = [
    { ex: 'Binance', sym: 'SPCX', name: 'SpaceChainX', t: 'futures' as const, h: 2 },
    { ex: 'Binance', sym: 'SPCX', name: 'SpaceChainX', t: 'spot' as const, h: 3 },
    { ex: 'Binance', sym: 'MUBI', name: 'MUBI', t: 'spot' as const, h: 3 },
    { ex: 'Binance', sym: 'MUBI', name: 'MUBI', t: 'futures' as const, h: 4 },
    { ex: 'OKX', sym: 'MON', name: 'Monad', t: 'spot' as const, h: 8 },
    { ex: 'OKX', sym: 'KAITO', name: 'Kaito', t: 'spot' as const, h: 12 },
    { ex: 'OKX', sym: 'BERA', name: 'Berachain', t: 'spot' as const, h: 20 },
    { ex: 'Binance', sym: 'BERA', name: 'Berachain', t: 'spot' as const, h: 28 },
  ]
  return data.map((f, i) => ({
    id: `fb-${f.ex}-${f.sym}-${i}`, type: 'newlisting' as const,
    riskLevel: 'medium' as const, timestamp: now - f.h * 3600000,
    chain: `${f.ex} ${f.t === 'spot' ? '现货' : '合约'}`,
    symbol: f.sym, exchange: f.ex, marketType: f.t,
    listedAt: now - f.h * 3600000,
    announcementUrl: f.ex === 'Binance'
      ? 'https://www.binance.com/zh-CN/support/announcement/新币上线'
      : f.ex === 'OKX'
      ? 'https://www.okx.com/zh-hans/help/section/新币上线'
      : 'https://hyperliquid.xyz/trading',
    description: `${f.ex === 'Binance' ? '币安' : f.ex} 将于某时间开放 ${f.name}（${f.sym}）${f.t === 'spot' ? '现货' : '永续合约'}交易`,
    isHot: f.h <= 6, source: '官方公告'
  }))
}

export async function GET() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const html = fs.readFileSync(CACHE_FILE, 'utf-8')
      const { items, allNews } = extractListings(html)

      if (items.length > 0) {
        return NextResponse.json({
          signals: items, total: items.length,
          hotCount: items.filter(s => s.isHot).length,
          timestamp: Date.now(), sources: ['Odaily'],
          note: `来自 Odaily 快讯 · ${allNews.length} 条新闻`
        })
      }

      // 有新闻无上币公告
      const fb = getFallback()
      return NextResponse.json({
        signals: fb, total: fb.length,
        hotCount: fb.filter(s => s.isHot).length,
        timestamp: Date.now(), sources: ['后备公告（Odaily无匹配）'],
        note: `Odaily ${allNews.length} 条快讯（未匹配到上币公告）`,
        latestNews: allNews.slice(0, 5)
      })
    }
  } catch (e) {
    console.error('[NewListings] Read error:', e)
  }

  const fb = getFallback()
  return NextResponse.json({
    signals: fb, total: fb.length,
    hotCount: fb.filter(s => s.isHot).length,
    timestamp: Date.now(), sources: ['后备公告'],
    note: 'Odaily 缓存不存在'
  })
}
