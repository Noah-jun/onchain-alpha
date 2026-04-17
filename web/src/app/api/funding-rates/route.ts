// Binance Funding Rate API
// 获取所有交易对的资金费率数据

import { NextResponse } from 'next/server'

interface BinancePremiumIndex {
  symbol: string
  markPrice: string
  indexPrice: string
  lastFundingRate: string
  nextFundingTime: number
  time: number
}

interface FundingSignal {
  symbol: string
  rate: number
  nextFundingTime: number
  markPrice: number
  exchange: string
}

// 获取所有交易对的资金费率
async function fetchAllFundingRates(): Promise<FundingSignal[]> {
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 } // 1分钟缓存
    })
    
    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status}`)
    }
    
    const data: BinancePremiumIndex[] = await res.json()
    
    // 筛选出资金费率不为0的交易对，并计算异常
    const signals = data
      .filter(item => parseFloat(item.lastFundingRate) !== 0)
      .map(item => {
        const rate = parseFloat(item.lastFundingRate) * 100 // 转换为百分比
        return {
          symbol: item.symbol.replace('USDT', ''),
          rate,
          nextFundingTime: item.nextFundingTime,
          markPrice: parseFloat(item.markPrice),
          exchange: 'Binance'
        }
      })
      .sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate)) // 按费率绝对值排序
    
    return signals
  } catch (error) {
    console.error('Failed to fetch funding rates:', error)
    return []
  }
}

// 找出异常的資金费率（高费率可能表示多头/空头拥挤）
function detectFundingAnomalies(rates: FundingSignal[], threshold = 0.05): FundingSignal[] {
  return rates.filter(signal => Math.abs(signal.rate) > threshold)
}

export async function GET() {
  try {
    const allRates = await fetchAllFundingRates()
    
    // 筛选出异常的费率（> 0.15% 或 < -0.15%）
    const anomalies = detectFundingAnomalies(allRates, 0.15)
    
    // 只返回前20个最异常的
    const topAnomalies = anomalies.slice(0, 20)
    
    return NextResponse.json({
      signals: topAnomalies,
      total: allRates.length,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('Funding rates API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funding rates', signals: [] },
      { status: 500 }
    )
  }
}
