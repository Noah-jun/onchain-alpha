import { Signal, MarketData } from '@/types'

// Mock 市场数据
export const mockMarketData: MarketData = {
  fearGreed: {
    value: 72,
    label: '贪婪',
    change: 5.2,
  },
  btc: {
    price: 98200,
    change24h: 1.85,
  },
  eth: {
    price: 2850,
    change24h: -0.42,
  },
  nasdaq: {
    price: 19285,
    change: 0.65,
    status: 'post',
  },
  sp500: {
    price: 6110,
    change: 0.38,
    status: 'regular',
  },
}

// Mock 信号数据
export const mockSignals: Signal[] = [
  {
    id: '1',
    type: 'anomaly',
    riskLevel: 'high',
    timestamp: Date.now() - 2 * 60 * 1000,
    chain: 'Solana',
    symbol: 'SOL',
    icon: 'S',
    price: 142.56,
    change5m: 28.5,
    change24h: 42.3,
    volumeChange: 280,
    volume: 2800000000,
    marketCap: 72000000000,
    amplitude: 42.3,
    description: 'Solana DEX 成交量暴涨',
    tags: ['whale_inflow'],
  },
  {
    id: '2',
    type: 'whale',
    riskLevel: 'high',
    timestamp: Date.now() - 3 * 60 * 1000,
    chain: 'Ethereum',
    fromLabel: 'Jump Trading',
    toLabel: 'Binance',
    direction: 'in',
    amount: 500,
    amountUsd: 32.5,
    symbol: 'BTC',
  },
  {
    id: '3',
    type: 'anomaly',
    riskLevel: 'high',
    timestamp: Date.now() - 5 * 60 * 1000,
    chain: 'Ethereum',
    symbol: 'DOGE',
    icon: 'D',
    price: 0.124,
    change5m: -15.2,
    change24h: -22.5,
    volumeChange: 156,
    volume: 1560000000,
    marketCap: 18200000000,
    amplitude: 22.5,
    description: 'memecoin 板块普跌',
    tags: ['isolated'],
  },
  {
    id: '4',
    type: 'funding',
    riskLevel: 'medium',
    timestamp: Date.now() - 8 * 60 * 1000,
    chain: 'Ethereum',
    exchange: 'Binance',
    symbol: 'BTC',
    rate: -0.08,
    nextFundingTime: Date.now() + 4 * 60 * 60 * 1000,
    oiChange: 15,
    longShortRatio: 0.52,
  },
  {
    id: '5',
    type: 'liquidation',
    riskLevel: 'medium',
    timestamp: Date.now() - 12 * 60 * 1000,
    chain: 'Ethereum',
    platform: 'Aave',
    amount: 1.2,
    amountUsd: 1.2,
    symbol: 'USDC',
    side: 'long',
    priceImpact: 0.12,
    txHash: '0x742d35Cc6634C0532925a3b844Bc9e7595f',
  },
  {
    id: '6',
    type: 'whale',
    riskLevel: 'low',
    timestamp: Date.now() - 28 * 60 * 1000,
    chain: 'Ethereum',
    fromLabel: '未知钱包',
    toLabel: 'Coinbase',
    direction: 'out',
    amount: 5,
    amountUsd: 5,
    symbol: 'USDT',
  },
]

// 格式化相对时间
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

// 格式化金额
export function formatAmount(amount: number, symbol: string): string {
  if (symbol === 'BTC' || symbol === 'ETH') {
    return `${amount} ${symbol}`
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`
  }
  return `$${amount.toFixed(2)}`
}

// 格式化价格
export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
