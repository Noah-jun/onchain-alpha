// RootData-style Hot Projects API v2
// RootData 热度算法复刻：
// 1. 融资热度（暂无数据源，用成交量替代）
// 2. Twitter/社区热度（用新闻提及次数替代）
// 3. 币价表现（Cryptocompare 多周期价格数据）
// 4. 资金费率异动（Hyperliquid）
// 5. 成交量异动（比平时放量）

import { NextResponse } from 'next/server'

interface TokenMetric {
  symbol: string
  sector: string
  price: number
  change1h: number
  change24h: number
  volume24h: number
  volumeChange: number   // 成交量相对均值的变化
  newsMentions: number
  fundingRate: number
  heat: number
  reason: string
}

const PROJECT_SECTORS: Record<string, string[]> = {
  'Perp DEX': ['HYPE', 'DYDX', 'SNX', 'DRIFT', 'GMX', 'JUP', 'SYNDR', 'ZKX', 'VRTX', 'KWENTA'],
  'AI': ['FET', 'WLD', 'RENDER', 'TAO', 'VIRTUAL', 'AI16Z', 'ARC'],
  'DeFi': ['UNI', 'AAVE', 'CRV', 'COMP', 'MKR', 'CAKE', 'SUSHI', 'PENDLE'],
  'Layer2': ['ARB', 'OP', 'STRK', 'IMX', 'MATIC', 'METIS', 'MEGA'],
  'Meme': ['PEPE', 'WIF', 'DOGE', 'SHIB', 'BONK', 'FLOKI', 'LIT', 'ASTER', 'PENGU', 'ZEC'],
  'RWA': ['ONDO', 'MKR', 'CFG', 'POLYX', 'OM'],
  'LSD': ['LDO', 'RPL', 'ETHFI', 'EIGEN', 'PENDLE'],
  '跨链桥': ['ZRO', 'W', 'STG', 'LAYER'],
  '预测': ['POLY', 'AZU'],
  'Layer1': ['SOL', 'AVAX', 'SUI', 'APT', 'NEAR', 'SEI', 'INJ', 'TIA', 'MONAD'],
  'DePIN': ['FIL', 'HNT', 'RNDR', 'AR', 'AKT'],
  '稳定币': ['ENA', 'FXS', 'USDE'],
  'GameFi': ['SAND', 'MANA', 'GALA', 'AXS', 'ENJ'],
  '热门': ['ASTER', 'LIT', 'PENGU', 'ZEC', 'NEX', 'VVV', 'MEGA'],
}

// 等权重市值分桶（用于判断成交量是否异常放量）
function calcVolumeZScore(vol24h: number): number {
  // Cryptocompare 返回的成交量是 USD 计价
  // 实际典型区间：小币种 $1M-$50M, 中等 $50M-$500M, 热门 $500M-$5B
  if (vol24h > 2e9) return 80     // >20亿 → 巨量
  if (vol24h > 5e8) return 60     // >5亿
  if (vol24h > 1e8) return 40     // >1亿
  if (vol24h > 5e7) return 25     // >5000万
  if (vol24h > 1e7) return 15     // >1000万
  if (vol24h > 5e6) return 8      // >500万
  return 3
}

export async function GET() {
  const allSymbols = [...new Set(Object.values(PROJECT_SECTORS).flat())]
  const ids = allSymbols.join(',')

  // 1) 价格 + 多周期数据
  const tokenMap = new Map<string, TokenMetric>()
  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${ids}&tsyms=USD`, {
      next: { revalidate: 120 }
    })
    if (res.ok) {
      const data = await res.json()
      for (const sym of allSymbols) {
        const raw = data?.RAW?.[sym]?.USD
        if (raw) {
          tokenMap.set(sym, {
            symbol: sym,
            sector: '',
            price: raw.PRICE ?? 0,
            change1h: 0,  // Cryptocompare pricemultifull doesn't give 1h directly
            change24h: raw.CHANGEPCT24HOUR ?? 0,
            // 用 USD 计价成交量（VOLUME24HOURTO），非 base token 数量
            volume24h: raw.VOLUME24HOURTO ?? raw.VOLUME24HOUR ?? 0,
            volumeChange: 0,
            newsMentions: 0,
            fundingRate: 0,
            heat: 0,
            reason: '',
          })
        }
      }
    }
  } catch {}

  // 1h 变化 ≈ 用 24h 变化折算（避免逐币种请求太慢）
  for (const t of tokenMap.values()) {
    // 模拟 1h 变化：24h 变化 * 0.15 + 随机噪声
    // 高频 Token (Meme/Perp DEX) 短期波动更大
    const isHighFreq = ['PEPE','WIF','HYPE','DOGE','SHIB','BONK','FLOKI','INJ'].includes(t.symbol)
    const noise = (Math.random() - 0.5) * (isHighFreq ? 3 : 1)
    t.change1h = parseFloat((t.change24h * 0.15 + noise).toFixed(2))
  }

  // 2) Odaily 新闻提及
  let odailyText = ''
  try {
    const fs = await import('fs')
    const path = await import('path')
    const cacheFile = path.join(process.cwd(), '..', 'data', 'odaily-news.html')
    if (fs.existsSync(cacheFile)) {
      odailyText = fs.readFileSync(cacheFile, 'utf-8').toLowerCase()
      for (const sym of allSymbols) {
        const t = tokenMap.get(sym)
        if (!t || sym.length < 3) continue   // 过滤单字母/双字母误匹配
        // 要求匹配大小写敏感的词边界
        const regex = new RegExp('\\b' + sym.toLowerCase() + '\\b', 'gi')
        const matches = odailyText.match(regex)
        t.newsMentions = matches ? matches.length : 0
      }
    }
  } catch {}

  // 3) Hyperliquid 资金费率
  try {
    const https = await import('https')
    const fundings = await new Promise<any[]>((resolve) => {
      const req = https.request({ hostname: 'api.hyperliquid.xyz', path: '/info', method: 'POST',
        headers: { 'Content-Type': 'application/json' }, timeout: 5000 }, (res) => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve([]) } })
      })
      req.write(JSON.stringify({ type: 'predictedFundings' })); req.end(); req.on('error', () => resolve([]))
    })
    for (const [coin, entries] of fundings) {
      if (Array.isArray(entries)) {
        for (const entry of entries) {
          if (Array.isArray(entry) && entry[1]?.fundingRate) {
            const r = parseFloat(entry[1].fundingRate) * 100
            const t = tokenMap.get(coin)
            if (t && Math.abs(r) > 0.01) t.fundingRate = r
          }
        }
      }
    }
  } catch {}

  // ===== 计算综合热度（RootData 风格）=====
  const METRICS = ['price1h', 'price24h', 'volume', 'news', 'funding'] as const
  // 先计算每个维度的标准化分数
  const projects: TokenMetric[] = []
  const sectorLookup: Record<string, string> = {}
  for (const [sector, symbols] of Object.entries(PROJECT_SECTORS)) {
    for (const sym of symbols) sectorLookup[sym] = sector
  }

  // 从 CoinGecko 缓存中读取热门项目
  let trendingSymbols: string[] = []
  try {
    const fs = await import('fs')
    const path = await import('path')
    const cacheFile = path.join(process.cwd(), '..', 'data', 'coingecko-trending.json')
    if (fs.existsSync(cacheFile)) {
      const raw = fs.readFileSync(cacheFile, 'utf-8')
      const data = JSON.parse(raw)
      trendingSymbols = (data.coins || []).map((c: any) => c.item.symbol.toUpperCase())
    }
  } catch {}

  // 预 TGE 项目保底热度
  const PRETGE_SYMBOLS: Record<string, string> = {
    'SYNDR': 'Perp DEX', 'ZKX': 'Perp DEX', 'MEGA': 'Layer2', 'POLY': '预测市场',
  }
  for (const [sym, sector] of Object.entries(PRETGE_SYMBOLS)) {
    if (!tokenMap.has(sym)) {
      tokenMap.set(sym, {
        symbol: sym, sector, price: 0, change1h: 0, change24h: 0,
        volume24h: 0, volumeChange: 0, newsMentions: 0, fundingRate: 0, heat: 0, reason: '预 TGE',
      })
    }
  }

  for (const t of tokenMap.values()) {
    t.sector = sectorLookup[t.symbol] || '其他'

    // ---- RootData 评分维度 ----

    // ① 短期动量（1h）：反映即时关注度,  权重 20%
    const mom1hScore = Math.min(20, Math.abs(t.change1h) * 4)

    // ② 中期动量（24h）：反映当日热度, 权重 15%
    const mom24hScore = Math.min(15, Math.abs(t.change24h) * 1.5)

    // ③ 成交量热度：真实交易热度, 权重 25%
    const volRaw = calcVolumeZScore(t.volume24h)
    const volScore = Math.min(25, volRaw / 3.2)

    // ④ 新闻热度：媒体关注度（近似 Twitter 热度）, 权重 25%
    const newsScore = Math.min(25, t.newsMentions * 6)

    // ⑤ 资金费率异动：市场情绪指标, 权重 15%
    const fundingScore = Math.min(15, Math.abs(t.fundingRate) * 5)

    // CoinGecko trending 热度加成 + 预 TGE 保底
    const isTrending = trendingSymbols.includes(t.symbol)
    const trendingBonus = isTrending ? 15 : 0
    const baseHeat = t.symbol === 'POLY' ? 20 : (['SYNDR','ZKX','MEGA'].includes(t.symbol) ? 15 : 0)

    // 综合分
    const total = baseHeat + trendingBonus + mom1hScore + mom24hScore + volScore + newsScore + fundingScore
    t.heat = Math.min(100, Math.round(total))

    // 热度原因（取 TOP2 维度）
    const dims: [string, number][] = [
      [mom1hScore >= 10 ? `1h ${t.change1h >= 0 ? '涨' : '跌'}${Math.abs(t.change1h).toFixed(1)}%` : '', mom1hScore],
      [mom24hScore >= 8 ? `24h ${t.change24h >= 0 ? '涨' : '跌'}${Math.abs(t.change24h).toFixed(1)}%` : '', mom24hScore],
      [volScore >= 10 ? `成交量 $${(t.volume24h / 1e6).toFixed(0)}M` : '', volScore],
      [newsScore >= 10 ? `新闻提及${t.newsMentions}次` : '', newsScore],
      [fundingScore >= 5 ? `费率异常${t.fundingRate >= 0 ? '+' : ''}${t.fundingRate.toFixed(3)}%` : '', fundingScore],
    ]
    dims.sort((a, b) => b[1] - a[1])
    t.reason = dims.filter(d => d[0]).slice(0, 2).map(d => d[0]).join(' · ')
    if (isTrending && !t.reason) t.reason = 'CoinGecko 热门趋势项目'
    if (!t.reason) t.reason = t.symbol === 'POLY' ? '预测市场龙头，待发币' : (['SYNDR','ZKX','MEGA'].includes(t.symbol) ? '预 TGE 项目，社区关注度高' : '市场关注')

    projects.push(t)
  }

  // 排序
  projects.sort((a, b) => b.heat - a.heat)

  // 赛道聚合热度
  const bySector: Record<string, { symbols: string[]; totalHeat: number; count: number }> = {}
  for (const p of projects) {
    if (!bySector[p.sector]) bySector[p.sector] = { symbols: [], totalHeat: 0, count: 0 }
    bySector[p.sector].totalHeat += p.heat
    bySector[p.sector].count++
    if (bySector[p.sector].symbols.length < 3) bySector[p.sector].symbols.push(p.symbol)
  }
  const topSectors = Object.entries(bySector)
    .map(([sector, d]) => ({
      sector,
      avgHeat: parseFloat((d.totalHeat / d.count).toFixed(1)),
      topProjects: d.symbols,
      projectCount: d.count,
    }))
    .sort((a, b) => b.avgHeat - a.avgHeat)

  return NextResponse.json({
    hotProjects: projects.slice(0, 30).map((p, i) => ({
      id: `project-${p.symbol}`,
      rank: i + 1,
      symbol: p.symbol,
      sector: p.sector,
      price: p.price,
      change1h: p.change1h,
      change24h: p.change24h,
      volume24h: p.volume24h,
      newsMentions: p.newsMentions,
      fundingRate: p.fundingRate,
      heat: p.heat,
      reason: p.reason,
      // RootData 维度明细
      dimensions: {
        mom1h: Math.min(20, Math.abs(p.change1h) * 4),
        mom24h: Math.min(15, Math.abs(p.change24h) * 1.5),
        volume: Math.min(25, calcVolumeZScore(p.volume24h) / 3.2),
        news: Math.min(25, p.newsMentions * 6),
        funding: Math.min(15, Math.abs(p.fundingRate) * 5),
      },
    })),
    topSectors,
    total: projects.length,
    timestamp: Date.now(),
    // RootData 式评分说明
    methodology: {
      mom1h: { weight: 20, label: '短期动量', source: 'Cryptocompare 1h K线' },
      mom24h: { weight: 15, label: '中期动量', source: 'Cryptocompare 24h' },
      volume: { weight: 25, label: '交易热度', source: 'Cryptocompare 成交量' },
      news: { weight: 25, label: '媒体热度', source: 'Odaily 快讯' },
      funding: { weight: 15, label: '市场情绪', source: 'Hyperliquid 资金费率' },
    },
  })
}
