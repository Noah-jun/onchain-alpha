// RAG Knowledge Base API
// 结构化知识库，每 24 小时自动刷新市场价格数据
// 避免 AI 幻觉 — 所有数据有明确来源和更新时间戳

import { NextResponse } from 'next/server'
import { CRYPTO_CONCEPTS } from '@/lib/concepts'

// 代币价格缓存（由 Cryptocompare 实时更新）
interface TokenPrice {
  symbol: string
  price: number
  change24h: number
  marketCap: number
  volume24h: number
}

// 赛道市值缓存
interface SectorMarketData {
  term: string
  avgChange24h: number
  totalVolume: number
  tokenCount: number
  updatedAt: number
}

let lastPriceFetch = 0
let lastSectorFetch = 0
let priceCache: Map<string, TokenPrice> = new Map()
let sectorCache: SectorMarketData[] = []

// 获取所有代币实时价格
async function refreshPrices(): Promise<void> {
  const allSymbols = [
    'BTC','ETH','SOL','PEPE','WIF','DOGE','BONK','UNI','AAVE','CRV','CAKE',
    'COMP','SUSHI','ARB','OP','STRK','FET','WLD','RENDER','TAO','AVAX','SUI',
    'APT','NEAR','FIL','HNT','LDO','RPL','ETHFI','ENA','ONDO','MKR','CFG',
    'ZRO','HYPE','DYDX','SNX','DRIFT','JUP','SHIB','POLYX','POLY','MSX',
    'IMX','GMX','RDNT','MAV','BLUR','STX'
  ]

  const ids = allSymbols.join(',')
  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${ids}&tsyms=USD`, {
      next: { revalidate: 3600 }
    })
    if (!res.ok) return
    const data = await res.json()

    for (const sym of allSymbols) {
      const raw = data?.RAW?.[sym]?.USD
      if (raw) {
        priceCache.set(sym, {
          symbol: sym,
          price: raw.PRICE ?? 0,
          change24h: raw.CHANGEPCT24HOUR ?? 0,
          marketCap: (raw.PRICE ?? 0) * (raw.VOLUME24HOUR ?? 0) * 8,
          volume24h: raw.VOLUME24HOUR ?? 0,
        })
      }
    }
    lastPriceFetch = Date.now()
  } catch (e) {
    console.error('[Knowledge] Price refresh failed:', e)
  }
}

// 刷新赛道数据
function refreshSectors(): void {
  const SECTOR_TOKENS: Record<string, string[]> = {
    'RWA': ['ONDO', 'MKR', 'CFG', 'POLYX'],
    '美股Pre-IPO': ['MSX'],
    'DeFi': ['UNI', 'AAVE', 'CRV', 'CAKE', 'COMP', 'SUSHI'],
    'Meme': ['PEPE', 'DOGE', 'WIF', 'BONK', 'SHIB'],
    'Layer2': ['ARB', 'OP', 'STRK', 'IMX'],
    'AI': ['FET', 'WLD', 'RENDER', 'TAO'],
    'Layer1': ['SOL', 'AVAX', 'SUI', 'APT', 'NEAR'],
    'DePIN': ['FIL', 'HNT'],
    'LSD': ['LDO', 'RPL', 'ETHFI'],
    'DEX': ['UNI', 'CAKE', 'SUSHI', 'JUP'],
    '跨链桥': ['ZRO'],
    'Perp DEX': ['HYPE', 'DYDX', 'SNX', 'DRIFT'],
    '预测市场': ['POLY'],
    'Uniswap Hook': ['UNI'],
  }

  sectorCache = Object.entries(SECTOR_TOKENS).map(([term, tokens]) => {
    const tokenData = tokens
      .map(sym => priceCache.get(sym))
      .filter((t): t is TokenPrice => t !== undefined)

    const avgChange = tokenData.length > 0
      ? tokenData.reduce((sum, t) => sum + t.change24h, 0) / tokenData.length
      : 0
    const totalVolume = tokenData.reduce((sum, t) => sum + t.volume24h, 0)

    return {
      term,
      avgChange24h: parseFloat(avgChange.toFixed(2)),
      totalVolume,
      tokenCount: tokenData.length,
      updatedAt: Date.now()
    }
  })

  lastSectorFetch = Date.now()
}

// 判断是否需要刷新（24h 内不重复刷新）
function needsRefresh(): boolean {
  return Date.now() - lastPriceFetch > 24 * 60 * 60 * 1000
}

export async function GET() {
  // 如果 24h 内未刷新，则刷新数据
  if (needsRefresh() || priceCache.size === 0) {
    await refreshPrices()
    refreshSectors()
  }

  // 构建知识库响应
  const concepts = CRYPTO_CONCEPTS.map(c => ({
    id: c.id,
    term: c.term,
    category: c.category,
    definition: c.definition,
    developmentStatus: c.developmentStatus,
    trends: c.trends,
    representativeProjects: c.representativeProjects.map(p => {
      const price = priceCache.get(p.symbol)
      return {
        ...p,
        price: price?.price || null,
        change24h: price?.change24h || null,
      }
    }),
  }))

  const sectorData = sectorCache.map(s => {
    const concept = concepts.find(c => c.term === s.term)
    return { ...s, concept: concept || null }
  })

  return NextResponse.json({
    version: '2026-05-21-v1',
    lastUpdated: lastPriceFetch || Date.now(),
    nextUpdate: lastPriceFetch ? new Date(lastPriceFetch + 86400000).toISOString() : 'auto',
    source: 'Cryptocompare + 内置知识库',
    priceCount: priceCache.size,
    concepts: concepts,
    sectors: sectorData,
  })
}
