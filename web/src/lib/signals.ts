// Real Signals Aggregator
// 聚合多个数据源的信号

import { Signal, SignalType, RiskLevel } from '@/types'

interface FundingRateSignal extends Omit<Signal, never> {
  type: 'funding'
  riskLevel: RiskLevel
  timestamp: number
  chain: string
  exchange: string
  symbol: string
  rate: number
  nextFundingTime: number
  oiChange: number
  longShortRatio: number
}

interface LiquidationSignalData extends Omit<Signal, never> {
  type: 'liquidation'
  riskLevel: RiskLevel
  timestamp: number
  chain: string
  platform: string
  amount: number
  amountUsd: number
  symbol: string
  side: 'long' | 'short'
  priceImpact: number
  txHash: string
}

// 从资金费率 API 获取信号
async function fetchFundingSignals(): Promise<FundingRateSignal[]> {
  try {
    const res = await fetch('/api/funding-rates', {
      next: { revalidate: 60 }
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const now = Date.now()
    
    return data.signals.map((s: any, index: number) => ({
      id: `funding-${s.symbol}-${index}`,
      type: 'funding' as const,
      riskLevel: Math.abs(s.rate) > 0.5 ? 'high' : Math.abs(s.rate) > 0.15 ? 'medium' : 'low',
      timestamp: now - index * 60000, // 分散时间戳
      chain: 'Ethereum',
      exchange: s.exchange,
      symbol: s.symbol,
      rate: s.rate,
      nextFundingTime: s.nextFundingTime || 0,
      oiChange: 0,
      longShortRatio: 0.5
    }))
  } catch (error) {
    console.error('Failed to fetch funding signals:', error)
    return []
  }
}

// 从清算 API 获取信号
async function fetchLiquidationSignals(): Promise<LiquidationSignalData[]> {
  try {
    const res = await fetch('/api/liquidations', {
      next: { revalidate: 60 }
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    
    return data.signals.map((s: any) => ({
      id: s.id,
      type: 'liquidation' as const,
      riskLevel: s.totalValue > 100000 ? 'high' : s.totalValue > 10000 ? 'medium' : 'low',
      timestamp: s.time,
      chain: 'Ethereum',
      platform: s.exchange,
      amount: s.quantity,
      amountUsd: s.totalValue,
      symbol: s.symbol,
      side: s.side || 'long',
      priceImpact: 0,
      txHash: ''
    }))
  } catch (error) {
    console.error('Failed to fetch liquidation signals:', error)
    return []
  }
}

// 获取所有真实信号
export async function fetchRealSignals(): Promise<Signal[]> {
  const [fundingSignals, liquidationSignals] = await Promise.all([
    fetchFundingSignals(),
    fetchLiquidationSignals()
  ])
  
  // 合并并按时间排序
  const allSignals = [...fundingSignals, ...liquidationSignals]
    .sort((a, b) => b.timestamp - a.timestamp)
  
  return allSignals.slice(0, 50) // 最多50条
}
