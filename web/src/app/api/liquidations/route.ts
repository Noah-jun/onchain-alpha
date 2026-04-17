// Binance Liquidation API
// 获取最近24小时的所有强平订单

import { NextResponse } from 'next/server'

interface BinanceForceOrder {
  symbol: string
  side: 'SELL' | 'BUY'
  quantity: string
  price: string
  orderPriceType: string
  avgPrice: string
  origQuantity: string
  liquidateSymbol: string  // 被强平的交易对
  totalLargeLiquidateQuantity: string
  time: number
  updatedCollateralForPosition: string
  updatedMaintMarginWithSS: string
}

interface LiquidationSignal {
  id: string
  symbol: string
  side: 'long' | 'short'
  quantity: number
  price: number
  totalValue: number  // USDT 价值
  time: number
  exchange: string
}

// 获取最近24小时强平订单
async function fetchRecentLiquidations(): Promise<LiquidationSignal[]> {
  try {
    // Binance 返回最近500个强平订单
    const res = await fetch('https://api.binance.com/fapi/v1/allForceOrders?limit=500', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 } // 1分钟缓存
    })
    
    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status}`)
    }
    
    const data: BinanceForceOrder[] = await res.json()
    
    // 过滤最近1小时内的清算
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    
    const signals: LiquidationSignal[] = data
      .filter(order => order.time >= oneHourAgo)
      .map((order, index) => {
        const quantity = parseFloat(order.origQuantity)
        const price = parseFloat(order.avgPrice) || parseFloat(order.price)
        const totalValue = quantity * price
        
        return {
          id: `liq-${order.time}-${index}`,
          symbol: order.symbol.replace('USDT', '').replace('USDC', ''),
          side: (order.side === 'SELL' ? 'long' : 'short') as 'long' | 'short',
          quantity,
          price,
          totalValue,
          time: order.time,
          exchange: 'Binance'
        }
      })
      .filter(signal => signal.totalValue > 1000) // 只保留价值 > 1000 USDT 的
      .sort((a, b) => b.totalValue - a.totalValue) // 按价值排序
    
    return signals
  } catch (error) {
    console.error('Failed to fetch liquidations:', error)
    return []
  }
}

export async function GET() {
  try {
    const liquidations = await fetchRecentLiquidations()
    
    // 按币种分组统计
    const bySymbol = liquidations.reduce((acc, curr) => {
      if (!acc[curr.symbol]) {
        acc[curr.symbol] = { totalValue: 0, count: 0, side: curr.side }
      }
      acc[curr.symbol].totalValue += curr.totalValue
      acc[curr.symbol].count += 1
      return acc
    }, {} as Record<string, { totalValue: number; count: number; side: string }>)
    
    return NextResponse.json({
      signals: liquidations.slice(0, 50), // 最多50条
      bySymbol,
      totalLiquidations: liquidations.length,
      totalValue: liquidations.reduce((sum, l) => sum + l.totalValue, 0),
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('Liquidations API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch liquidations', signals: [] },
      { status: 500 }
    )
  }
}
