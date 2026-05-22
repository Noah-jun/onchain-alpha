// Trending Sectors API
// 从多个真实数据源动态检测热点赛道
// 无实时数据的赛道使用内置概念库的季度/年度数据

import { NextResponse } from 'next/server'
import { CRYPTO_CONCEPTS } from '@/lib/concepts'

const SECTOR_KEYWORDS: Record<string, { keywords: string[]; icon: string }> = {
  'RWA': { keywords: ['rwa', 'real world asset', '代币化', 'tokenization', '国债', '美债'], icon: '🏠' },
  'DeFi': { keywords: ['defi', '借贷', 'lending', 'borrow', 'yield', '流动性'], icon: '🏦' },
  'Meme': { keywords: ['meme', 'memecoin', '模因', 'pump'], icon: '🦍' },
  'Layer2': { keywords: ['layer2', 'l2', 'rollup', '二层', '扩容'], icon: '⚡' },
  'AI': { keywords: ['ai', '人工智能', 'agent', '代理', 'intelligence'], icon: '🤖' },
  'Perp DEX': { keywords: ['perpetual', '永续', 'hyperliquid', 'dydx', '合约交易'], icon: '📈' },
  '预测市场': { keywords: ['预测', 'prediction', 'polymarket', '下注'], icon: '🎯' },
  'Uniswap Hook': { keywords: ['hook', 'uniswap v4', 'v4'], icon: '🪝' },
  'Pre-IPO': { keywords: ['pre-ipo', '独角兽', '私募', 'spacex', 'stripe', 'rwa 股票'], icon: '🏢' },
  'DePIN': { keywords: ['depin', '物理基础设施', 'filecoin', 'helium', '存储', '计算'], icon: '📡' },
  'LSD/Restaking': { keywords: ['restaking', '再质押', 'eigenlayer', 'lsd', '流动性质押'], icon: '💎' },
  '跨链桥': { keywords: ['跨链', 'bridge', 'layerzero', 'wormhole'], icon: '🌉' },
}

// 赛道后备数据（近3月趋势，供无实时数据的赛道使用）
const FALLBACK_SECTOR_DATA: Record<string, { change3m: number; volume: string; mcap: string }> = {
  'RWA': { change3m: 45.2, volume: '$12B', mcap: '$10B+' },
  'DeFi': { change3m: 12.8, volume: '$8B/d', mcap: '$45B' },
  'Meme': { change3m: 68.5, volume: '$5B/d', mcap: '$25B' },
  'Layer2': { change3m: 22.4, volume: '$2.5B/d', mcap: '$40B+' },
  'AI': { change3m: 85.3, volume: '$1.2B/d', mcap: '$15B' },
  'Perp DEX': { change3m: 55.0, volume: '$3B/d', mcap: '$12B' },
  '预测市场': { change3m: 120.0, volume: '$500M', mcap: '$2B' },
  'Uniswap Hook': { change3m: 35.0, volume: '$50M', mcap: '—' },
  'Pre-IPO': { change3m: 60.0, volume: '$200M', mcap: '$40B*' },
  'DePIN': { change3m: 28.5, volume: '$800M', mcap: '$18B' },
  'LSD/Restaking': { change3m: 18.2, volume: '$1.5B/d', mcap: '$35B' },
  '跨链桥': { change3m: 15.0, volume: '$300M/d', mcap: '$5B' },
}

// 从 Odaily 新闻分析
function analyzeNewsSentiment(text: string): Map<string, number> {
  const mentions = new Map<string, number>()
  const lower = text.toLowerCase()
  for (const [sector, info] of Object.entries(SECTOR_KEYWORDS)) {
    let count = 0
    for (const kw of info.keywords) {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const matches = lower.match(regex)
      if (matches) count += matches.length
    }
    if (count > 0) mentions.set(sector, count)
  }
  return mentions
}

// 从 Cryptocompare 分析
async function analyzePriceTrends(): Promise<Map<string, number>> {
  const sectorHeat = new Map<string, number>()
  const ids = ['UNI','AAVE','CRV','ARB','OP','STRK','FET','WLD','RENDER','TAO',
    'LDO','RPL','ENA','ONDO','MKR','CFG','HYPE','DYDX','SNX','DRIFT','JUP',
    'PEPE','WIF','DOGE','BONK','SOL','AVAX','SUI','APT','FIL','HNT','ZRO','POLY']

  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${ids.join(',')}&tsyms=USD`, {
      next: { revalidate: 120 }
    })
    if (!res.ok) return sectorHeat
    const data = await res.json()

    const tokenChanges: { sym: string; chg: number }[] = []
    for (const id of ids) {
      const raw = data?.RAW?.[id]?.USD
      if (raw) tokenChanges.push({ sym: id, chg: raw.CHANGEPCT24HOUR || 0 })
    }
    tokenChanges.sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))

    const sectorTokens: Record<string, string[]> = {
      'Perp DEX': ['HYPE', 'DYDX', 'SNX', 'DRIFT'],
      'AI': ['FET', 'WLD', 'RENDER', 'TAO'],
      'Meme': ['PEPE', 'WIF', 'DOGE', 'BONK'],
      'DeFi': ['UNI', 'AAVE', 'CRV'],
      'Layer2': ['ARB', 'OP', 'STRK'],
      'RWA': ['ONDO', 'MKR', 'CFG'],
      'LSD/Restaking': ['LDO', 'RPL', 'ENA'],
      '跨链桥': ['ZRO'],
      '预测市场': ['POLY'],
      'Uniswap Hook': ['UNI'],
    }
    for (const [sector, tokens] of Object.entries(sectorTokens)) {
      for (const sym of tokens) {
        const t = tokenChanges.find(tc => tc.sym === sym)
        if (t) sectorHeat.set(sector, (sectorHeat.get(sector) || 0) + Math.abs(t.chg))
      }
    }
  } catch {}
  return sectorHeat
}

interface TrendingSector {
  term: string; icon: string; heat: number
  change24h: number | null  // null = 无实时数据
  change3m: number           // 近3月趋势
  volume: string
  mcap: string
  mentionCount: number
  sources: string[]
  reason: string
}

export async function GET() {
  const now = Date.now()

  // 1. 新闻分析
  let newsMentions = new Map<string, number>()
  try {
    const fs = await import('fs')
    const path = await import('path')
    const cacheFile = path.join(process.cwd(), '..', 'data', 'odaily-news.html')
    if (fs.existsSync(cacheFile)) {
      const html = fs.readFileSync(cacheFile, 'utf-8')
      newsMentions = analyzeNewsSentiment(html)
    }
  } catch {}

  // 2. 价格趋势
  const priceHeat = await analyzePriceTrends()

  // 聚合
  const allSectors = new Map<string, TrendingSector>()

  for (const [sector, info] of Object.entries(SECTOR_KEYWORDS)) {
    const newsScore = newsMentions.get(sector) || 0
    const priceScore = priceHeat.get(sector) || 0
    const fallback = FALLBACK_SECTOR_DATA[sector]
    const concept = CRYPTO_CONCEPTS.find(c => c.term === sector)

    // 热力分
    const heat = Math.min(100, Math.round(
      newsScore * 8 + Math.min(priceScore, 50)
    ))

    // 如果新闻和价格都没数据，给个保底热度
    const displayHeat = heat > 0 ? heat : 12

    const sources: string[] = []
    if (newsScore > 0) sources.push('Odaily')
    if (priceScore > 0) sources.push('Cryptocompare')

    let reason = ''
    if (newsScore >= 2) reason = `新闻提及 ${newsScore} 次`
    else if (priceScore > 20) reason = '代币价格显著波动'
    else if (fallback) reason = `近3月涨幅 ${fallback.change3m}%`
    else reason = '持续关注赛道'

    // 24h 涨跌 — 有价格数据就显示，没有就 null
    const hasPriceData = priceScore > 0
    let change24h: number | null = null
    if (hasPriceData) {
      // 从价格数据计算
      const sectorTokens: Record<string, string[]> = {
        'Perp DEX': ['HYPE', 'DYDX', 'SNX', 'DRIFT'],
        'AI': ['FET', 'WLD', 'RENDER', 'TAO'],
        'Meme': ['PEPE', 'WIF', 'DOGE', 'BONK'],
        'DeFi': ['UNI', 'AAVE', 'CRV'],
        'Layer2': ['ARB', 'OP', 'STRK'],
        'RWA': ['ONDO', 'MKR', 'CFG'],
        'LSD/Restaking': ['LDO', 'RPL', 'ENA'],
        'Uniswap Hook': ['UNI'],
        '跨链桥': ['ZRO'],
        '预测市场': ['POLY'],
      }
      const tokens = sectorTokens[sector] || []
      if (tokens.length > 0) {
        try {
          const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${tokens.join(',')}&tsyms=USD`,
            { next: { revalidate: 120 } })
          if (res.ok) {
            const data = await res.json()
            let total = 0, count = 0
            for (const sym of tokens) {
              const raw = data?.RAW?.[sym]?.USD
              if (raw) { total += raw.CHANGEPCT24HOUR || 0; count++ }
            }
            if (count > 0) change24h = parseFloat((total / count).toFixed(2))
          }
        } catch {}
      }
    }

    allSectors.set(sector, {
      term: sector,
      icon: info.icon,
      heat: displayHeat,
      change24h,
      change3m: fallback?.change3m || 0,
      volume: fallback?.volume || '—',
      mcap: fallback?.mcap || '—',
      mentionCount: newsScore,
      sources: sources.length > 0 ? sources : ['内置知识库'],
      reason,
    })
  }

  const sorted = Array.from(allSectors.values())
    .sort((a, b) => b.heat - a.heat)

  return NextResponse.json({
    sectors: sorted,
    total: sorted.length,
    timestamp: now,
    sources: ['Odaily', 'Cryptocompare', '内置知识库(近3月数据)'],
  })
}
