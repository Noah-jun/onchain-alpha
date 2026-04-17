// CoinGecko Anomaly Detection API
// 检测异常波动的代币：1h K线涨跌超过 6%

import { NextResponse } from 'next/server'

interface CoinGeckoCoin {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_1h_in_currency: number
  price_change_percentage_24h: number
  price_change_percentage_7d_in_currency: number
  total_volume: number
  market_cap: number
}

interface AnomalySignal {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  change1h: number
  change24h: number
  change7d: number
  volume: number
  marketCap: number
}

// 获取所有代币的市场数据并检测异常
async function fetchAnomalyCoins(): Promise<AnomalySignal[]> {
  try {
    // CoinGecko markets API - 获取市值前500的币种
    const url = 'https://api.coingecko.com/api/v3/coins/markets?' +
      'vs_currency=usd&' +
      'order=volume_desc&' +
      'per_page=250&' +
      'page=1&' +
      'sparkline=false&' +
      'price_change_percentage=1h,24h,7d'
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 } // 2分钟缓存
    })
    
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`)
    }
    
    const data: CoinGeckoCoin[] = await res.json()
    
    // 检测异常波动
    // 条件：1h > 6%
    const anomalies = data.filter(coin => {
      const change1h = coin.price_change_percentage_1h_in_currency || 0
      
      return Math.abs(change1h) > 6
    })
    
    // 转换为信号格式
    const signals: AnomalySignal[] = anomalies.map(coin => ({
      id: `anomaly-${coin.id}`,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      price: coin.current_price,
      change1h: coin.price_change_percentage_1h_in_currency || 0,
      change24h: coin.price_change_percentage_24h || 0,
      change7d: coin.price_change_percentage_7d_in_currency || 0,
      volume: coin.total_volume,
      marketCap: coin.market_cap
    }))
    
    // 按异常程度排序（综合 1h 和 24h 波动）
    signals.sort((a, b) => {
      const scoreA = Math.abs(a.change1h) * 2 + Math.abs(a.change24h)
      const scoreB = Math.abs(b.change1h) * 2 + Math.abs(b.change24h)
      return scoreB - scoreA
    })
    
    return signals
  } catch (error) {
    console.error('Failed to fetch anomaly coins:', error)
    return []
  }
}

export async function GET() {
  try {
    const anomalies = await fetchAnomalyCoins()
    
    return NextResponse.json({
      signals: anomalies.slice(0, 30), // 最多30条
      total: anomalies.length,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('Anomaly API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch anomaly data', signals: [] },
      { status: 500 }
    )
  }
}
