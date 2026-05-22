// Hot Sectors API
// 数据源：Trending API（从 Odaily / Cryptocompare / Hyperliquid 动态检测）
// 辅以内置概念库的知识内容
// 不再硬编码赛道列表

import { NextResponse } from 'next/server'
import { CRYPTO_CONCEPTS } from '@/lib/concepts'

// 赛道 → 代表代币
const SECTOR_TOKENS: Record<string, string[]> = {
  'RWA': ['ONDO', 'MKR', 'CFG'],
  'DeFi': ['UNI', 'AAVE', 'CRV', 'CAKE'],
  'Meme': ['PEPE', 'DOGE', 'WIF', 'BONK'],
  'Layer2': ['ARB', 'OP', 'STRK'],
  'AI': ['FET', 'WLD', 'RENDER', 'TAO'],
  'Layer1': ['SOL', 'AVAX', 'SUI', 'APT'],
  'DePIN': ['FIL', 'HNT'],
  'LSD/Restaking': ['LDO', 'RPL', 'ETHFI'],
  'Perp DEX': ['HYPE', 'DYDX', 'SNX', 'DRIFT'],
  '预测市场': ['POLY'],
  'Uniswap Hook': ['UNI'],
  'Pre-IPO': ['MSX'],
  '跨链桥': ['ZRO'],
}

async function fetchTokenPrices(symbols: string[]): Promise<Map<string, { price: number; change24h: number }>> {
  const result = new Map()
  if (!symbols.length) return result
  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols.join(',')}&tsyms=USD`, {
      next: { revalidate: 120 }
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    for (const sym of symbols) {
      const raw = data?.RAW?.[sym]?.USD
      if (raw) result.set(sym, { price: raw.PRICE ?? 0, change24h: raw.CHANGEPCT24HOUR ?? 0 })
    }
  } catch {}
  return result
}

export async function GET() {
  // 读取 trending 动态数据
  let trendingData: any[] = []
  try {
    const fs = await import('fs')
    const path = await import('path')
    // 获取 trending 数据（直接请求本地 API）
    const trendingRes = await fetch('http://localhost:3001/api/trending', { next: { revalidate: 120 } })
    if (trendingRes.ok) {
      const data = await trendingRes.json()
      trendingData = data.sectors || []
    }
  } catch {}

  // 获取价格数据
  const allTokens = [...new Set(Object.values(SECTOR_TOKENS).flat())]
  const prices = await fetchTokenPrices(allTokens)

  // 合并 trending 数据 + 概念库知识
  const sectors = trendingData.map((t: any) => {
    const concept = CRYPTO_CONCEPTS.find(c =>
      c.term === t.term || c.aliases.includes(t.term)
    )

    const tokens = SECTOR_TOKENS[t.term] || []
    const tokenPrices = tokens
      .map(sym => {
        const p = prices.get(sym)
        return p ? { symbol: sym, price: p.price, change24h: p.change24h } : null
      })
      .filter(Boolean)

    return {
      id: t.term.toLowerCase().replace(/\s+/g, '-'),
      term: t.term,
      icon: t.icon || '📊',
      heat: t.heat || 0,
      reason: t.reason || '',
      sources: t.sources || [],
      change24h: t.change24h ?? null,
      change3m: t.change3m || 0,
      volume: t.volume || '—',
      mcap: t.mcap || '—',
      definition: concept?.definition?.slice(0, 150) || '',
      developmentStatus: concept?.developmentStatus?.slice(0, 100) || '',
      trends: concept?.trends || '',
      representativeProjects: concept?.representativeProjects?.slice(0, 5) || [],
      marketData: {
        avgChange24h: tokenPrices.length > 0
          ? parseFloat((tokenPrices.reduce((s, t) => s + (t?.change24h || 0), 0) / tokenPrices.length).toFixed(2))
          : (t.change24h || 0),
        tokenCount: tokenPrices.length,
        tokens: tokenPrices.slice(0, 5),
      },
    }
  })

  return NextResponse.json({
    sectors,
    total: sectors.length,
    timestamp: Date.now(),
    note: trendingData.length > 0
      ? '基于 Odaily + Cryptocompare + Hyperliquid 实时数据'
      : '基于内置知识库'
  })
}
