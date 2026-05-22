// Binance Market Signals API
// 本地动态数据生成 — 模拟币安高活跃度/高涨幅信号
// 数据每30分钟变化一次

import { NextResponse } from 'next/server'

const SYMBOLS = [
  { symbol: 'PEPE', basePrice: 0.0000085, baseVol: 500000000 },
  { symbol: 'SOL', basePrice: 185, baseVol: 4200000000 },
  { symbol: 'WIF', basePrice: 0.85, baseVol: 350000000 },
  { symbol: 'DOGE', basePrice: 0.142, baseVol: 1800000000 },
  { symbol: 'ONDO', basePrice: 0.95, baseVol: 250000000 },
  { symbol: 'UNI', basePrice: 12.3, baseVol: 450000000 },
  { symbol: 'AAVE', basePrice: 245, baseVol: 380000000 },
  { symbol: 'LINK', basePrice: 18.5, baseVol: 620000000 },
  { symbol: 'SUI', basePrice: 2.45, baseVol: 580000000 },
  { symbol: 'FET', basePrice: 1.62, baseVol: 280000000 },
  { symbol: 'WLD', basePrice: 2.85, baseVol: 310000000 },
  { symbol: 'RENDER', basePrice: 8.20, baseVol: 220000000 },
  { symbol: 'ARB', basePrice: 0.88, baseVol: 410000000 },
  { symbol: 'OP', basePrice: 1.95, baseVol: 350000000 },
  { symbol: 'AVAX', basePrice: 35.8, baseVol: 720000000 },
  { symbol: 'BONK', basePrice: 0.000024, baseVol: 520000000 },
  { symbol: 'TAO', basePrice: 425, baseVol: 180000000 },
  { symbol: 'BNB', basePrice: 610, baseVol: 1800000000 },
  { symbol: 'ENA', basePrice: 0.55, baseVol: 190000000 },
  { symbol: 'JUP', basePrice: 0.92, baseVol: 160000000 },
]

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export async function GET() {
  const now = Date.now()
  const seed = Math.floor(now / (1000 * 60 * 30))  // 30分钟更新一次

  const signals = SYMBOLS
    .filter((_, i) => seededRandom(seed + i * 53) > 0.3)  // 随机保留约 70%
    .map((coin, i) => {
      const r = seededRandom(seed + i * 67 + Math.floor(now / 3600000))
      const priceChange = (r * 55 - 20)  // -20% ~ +35%
      const price = coin.basePrice * (1 + priceChange / 100)
      const isHighVol = Math.abs(priceChange) > 20
      const volMultiplier = isHighVol ? 1.5 + r * 2 : 0.5 + r * 1.5
      const volume = Math.floor(coin.baseVol * volMultiplier)

      return {
        symbol: coin.symbol,
        name: coin.symbol,
        price: parseFloat(price.toFixed(coin.basePrice < 1 ? 8 : 2)),
        priceChange24h: parseFloat(priceChange.toFixed(1)),
        volume24h: volume,
      }
    })
    .sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h))
    .slice(0, 15)

  const formatted = signals.map((s, index) => ({
    id: `binance-alpha-${s.symbol}-${index}`,
    type: 'binance-alpha',
    riskLevel: (Math.abs(s.priceChange24h) > 30 ? 'high' : Math.abs(s.priceChange24h) > 10 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    timestamp: now - index * 300000,
    announcementTime: now - index * 300000,
    chain: 'Binance',
    symbol: s.symbol,
    name: s.symbol,
    price: s.price,
    priceChange24h: s.priceChange24h,
    volume24h: s.volume24h,
    marketCap: s.price * Math.max(s.volume24h, 1000000),
    announcementUrl: `https://www.binance.com/zh-CN/trade/${s.symbol}_USDT`,
    description: `${s.symbol} 24h ${s.priceChange24h >= 0 ? '涨幅' : '跌幅'} ${Math.abs(s.priceChange24h).toFixed(1)}%，成交量 $${(s.volume24h / 1000000).toFixed(1)}M`
  }))

  return NextResponse.json({
    signals: formatted,
    source: 'local',
    lastUpdate: now,
    status: 'ok'
  }, {
    headers: { 'Cache-Control': 'no-cache' }
  })
}
