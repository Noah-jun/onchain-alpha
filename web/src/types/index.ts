// 信号类型
export type SignalType = 'anomaly' | 'whale' | 'funding' | 'liquidation'

// 风险等级
export type RiskLevel = 'high' | 'medium' | 'low'

// 信号方向
export type SignalDirection = 'up' | 'down' | 'neutral'

// 基础信号接口
export interface BaseSignal {
  id: string
  type: SignalType
  riskLevel: RiskLevel
  timestamp: number
  chain: string
}

// 异常波动信号
export interface AnomalySignal extends BaseSignal {
  type: 'anomaly'
  symbol: string
  icon: string
  price: number
  change5m: number
  change24h: number
  volumeChange: number
  volume: number
  marketCap: number
  description: string
  tags: ('whale_inflow' | 'sector_link' | 'isolated')[]
}

// 巨鲸转账信号
export interface WhaleSignal extends BaseSignal {
  type: 'whale'
  fromLabel: string
  toLabel: string
  direction: 'in' | 'out' | 'transfer'
  amount: number
  amountUsd: number
  symbol: string
}

// 资金费率信号
export interface FundingSignal extends BaseSignal {
  type: 'funding'
  exchange: string
  symbol: string
  rate: number
  nextFundingTime: number
  oiChange: number
  longShortRatio: number
}

// 大额清算信号
export interface LiquidationSignal extends BaseSignal {
  type: 'liquidation'
  platform: string
  amount: number
  amountUsd: number
  symbol: string
  side: 'long' | 'short'
  priceImpact: number
  txHash: string
}

// 联合类型
export type Signal = AnomalySignal | WhaleSignal | FundingSignal | LiquidationSignal

// 市场数据
export interface MarketData {
  fearGreed: {
    value: number
    label: string
    change: number
  }
  btc: {
    price: number
    change24h: number
  }
  eth: {
    price: number
    change24h: number
  }
  nasdaq: {
    price: number
    change: number
    status: 'pre' | 'post' | 'regular' | 'closed'
  }
  sp500: {
    price: number
    change: number
    status: 'pre' | 'post' | 'regular' | 'closed'
  }
}

// 筛选状态
export interface FilterState {
  types: SignalType[]
  symbols: string[]
  riskLevel?: RiskLevel
  direction?: SignalDirection
  showExchangeInflowOnly: boolean
  sortBy: 'time' | 'amount' | 'risk'
}
