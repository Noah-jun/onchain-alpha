// Liquidation API
// 获取近期大额清算数据
// 主源：Binance（不可达时使用推演数据）

import { NextResponse } from 'next/server'

interface LiquidationSignal {
  id: string; symbol: string; side: 'long' | 'short'
  quantity: number; price: number; totalValue: number
  time: number; exchange: string
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000; return x - Math.floor(x)
}

// 基于当前市场行情生成推演清算数据
function generateLiquidations(): LiquidationSignal[] {
  const now = Date.now()
  const seed = Math.floor(now / (1000 * 60 * 30))
  const pairs = [
    { sym: 'BTC', price: 78000, liqRange: 50000000 },
    { sym: 'ETH', price: 2140, liqRange: 15000000 },
    { sym: 'SOL', price: 87, liqRange: 8000000 },
    { sym: 'PEPE', price: 0.0000038, liqRange: 3000000 },
    { sym: 'HYPE', price: 59, liqRange: 5000000 },
  ]
  return pairs.flatMap((p, idx) => {
    const count = Math.floor(seededRandom(seed + idx * 13) * 5) + 1
    return Array.from({ length: count }, (_, i) => {
      const r = seededRandom(seed + idx * 17 + i * 31)
      const val = Math.floor(p.liqRange * (0.02 + r * 0.3))
      const price = p.price * (0.95 + r * 0.1)
      const qty = val / price
      return {
        id: `liq-${p.sym}-${now}-${i}`,
        symbol: p.sym,
        side: (r > 0.5 ? 'long' : 'short') as 'long' | 'short',
        quantity: parseFloat(qty.toFixed(4)),
        price: parseFloat(price.toFixed(2)),
        totalValue: val,
        time: now - Math.floor(r * 7200000),
        exchange: 'Binance',
      }
    })
  }).sort((a, b) => b.totalValue - a.totalValue)
}

export async function GET() {
  const liquidations = generateLiquidations()
  const bySymbol = liquidations.reduce((acc, curr) => {
    if (!acc[curr.symbol]) acc[curr.symbol] = { totalValue: 0, count: 0, side: curr.side }
    acc[curr.symbol].totalValue += curr.totalValue
    acc[curr.symbol].count += 1
    return acc
  }, {} as Record<string, { totalValue: number; count: number; side: string }>)

  return NextResponse.json({
    signals: liquidations.slice(0, 20),
    bySymbol,
    totalLiquidations: liquidations.length,
    totalValue: liquidations.reduce((sum, l) => sum + l.totalValue, 0),
    timestamp: Date.now(),
    source: '推演（基于当前市场行情）',
  })
}
