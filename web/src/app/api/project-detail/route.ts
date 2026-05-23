// Project Detail API v2
// 聚合：CoinGecko 缓存 + DeFiLlama 缓存 + Cryptocompare + 项目数据库
// 所有数据源基于缓存文件，确保稳定性和速度

import { NextResponse } from 'next/server'
import { getProjectInfo } from '@/lib/projectsDB'
import { DATA_DIR, fetchTokenPrices, isVercel } from '@/lib/serverEnv'
import fs from 'fs'
import path from 'path'

function readJSON(filename: string): any {
  try {
    const p = path.join(DATA_DIR, filename)
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {}
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') || '').toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

  // 1. CoinGecko trending 数据（基本项目信息 + 排名）
  const trending = readJSON('coingecko-trending.json')
  let cgData: any = null
  if (trending?.coins) {
    for (const c of trending.coins) {
      if (c.item.symbol.toUpperCase() === symbol) {
        cgData = c.item
        break
      }
    }
  }

  // 2. CoinGecko discovered 数据（更全的搜索匹配）
  if (!cgData) {
    const discovered = readJSON('coingecko-discovered.json')
    if (discovered) {
      for (const c of discovered) {
        if (c.symbol.toUpperCase() === symbol) {
          cgData = c
          break
        }
      }
    }
  }

  // 3. 项目数据库（团队、融资、链接等详细信息）
  const dbInfo = getProjectInfo(symbol)

  // 4. DeFiLlama TVL
  let tvl = 0, tvlChange = 0
  const protocols = readJSON('defillama-protocols.json')
  if (protocols && dbInfo?.defillamaId) {
    for (const p of protocols) {
      if (p.id === dbInfo.defillamaId || p.name.toLowerCase() === (dbInfo.name || '').toLowerCase()) {
        tvl = p.tvl || 0
        break
      }
    }
  }

  // 5. Cryptocompare 价格
  let price = 0, change24h = 0, volume = 0
  try {
    const prices = await fetchTokenPrices([symbol])
    const p = prices.get(symbol)
    if (p) {
      price = p.price
      change24h = p.change24h
    }
  } catch {}

  return NextResponse.json({
    // 从 CoinGecko 获取的基础信息
    symbol,
    name: dbInfo?.name || cgData?.name || symbol,
    description: dbInfo?.description || `${symbol} 是加密市场热门项目`,
    sector: dbInfo?.sector || cgData?.categories?.[0] || '其他',
    chain: dbInfo?.chain || '—',
    tgeStatus: dbInfo?.tgeStatus || (price > 0 ? '已发币' : '待确认'),
    image: cgData?.large || cgData?.thumb || '',
    marketCapRank: cgData?.market_cap_rank || null,

    // 价格数据（Cryptocompare）
    price, change24h, volume24h: volume,

    // TVL（DeFiLlama）
    tvl,
    tvlChange7d: tvlChange,

    // 数据库详细数据（如果有）
    website: dbInfo?.website || '',
    twitter: dbInfo?.twitter || '',
    telegram: dbInfo?.telegram || '',
    discord: dbInfo?.discord || '',
    github: dbInfo?.github || '',
    team: dbInfo?.team || [],
    funding: dbInfo?.funding || [],

    lastUpdated: Date.now(),
    dataSources: {
      price: price > 0 ? 'Cryptocompare' : 'not available',
      tvl: tvl > 0 ? 'DeFiLlama' : 'not available',
      info: dbInfo ? 'knowledge base' : (cgData ? 'CoinGecko' : 'not available'),
    },
  })
}
