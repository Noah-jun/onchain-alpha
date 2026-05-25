// Whale Tracker API
// 本地动态数据生成 — 模拟交易所大额链上转账

import { NextResponse } from 'next/server'
import { fetchImages } from '@/lib/cryptoImages'

// 交易所
const EXCHANGES = ['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit']
const EXCHANGE_ICONS: Record<string, string> = {
  'Binance': 'BN',
  'Coinbase': 'CB',
  'Kraken': 'KR',
  'OKX': 'OK',
  'Bybit': 'BB',
}

// 代币池
const TOKENS = [
  { symbol: 'ETH', price: 2850 },
  { symbol: 'BTC', price: 98200 },
  { symbol: 'USDT', price: 1 },
  { symbol: 'USDC', price: 1 },
  { symbol: 'SOL', price: 185 },
  { symbol: 'LINK', price: 18.5 },
]

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export async function GET() {
  const now = Date.now()
  const daySeed = Math.floor(now / (1000 * 60 * 15))  // 15分钟变一次
  const txs: any[] = []

  for (let i = 0; i < 8; i++) {
    const token = TOKENS[i % TOKENS.length]
    const r = seededRandom(daySeed + i * 89 + Math.floor(now / 3600000))

    // 美元金额：从 5万到 800万
    const usdAmount = Math.floor(50000 + r * 7950000)
    const tokenAmount = token.price > 0 ? parseFloat((usdAmount / token.price).toFixed(4)) : usdAmount

    const fromIdx = Math.floor(seededRandom(daySeed + i * 97) * EXCHANGES.length)
    let toIdx = Math.floor(seededRandom(daySeed + i * 101 + 50) * (EXCHANGES.length + 3))
    const isInflow = seededRandom(daySeed + i * 103) > 0.4

    let fromLabel: string
    let toLabel: string
    let direction: 'in' | 'out'

    if (isInflow) {
      fromLabel = EXCHANGES[fromIdx]
      toLabel = (toIdx < EXCHANGES.length) ? EXCHANGES[toIdx] : `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`
      direction = 'in'
    } else {
      fromLabel = (toIdx < EXCHANGES.length) ? EXCHANGES[toIdx] : `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`
      toLabel = EXCHANGES[fromIdx]
      direction = 'out'
    }

    const riskLevel = usdAmount > 5000000 ? 'high' : usdAmount > 1000000 ? 'medium' : 'low'

    txs.push({
      id: `whale-${now}-${i}`,
      type: 'whale',
      riskLevel,
      timestamp: now - Math.floor(r * 7200000), // 过去2小时内
      chain: 'Ethereum',
      fromLabel,
      toLabel,
      direction,
      amount: tokenAmount,
      amountUsd: usdAmount,
      symbol: token.symbol,
      txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    })
  }

  txs.sort((a, b) => b.timestamp - a.timestamp)

  // 补充代币图片
  const whaleSymbols = [...new Set(txs.map(t => t.symbol))]
  const whaleImages = await fetchImages(whaleSymbols)
  for (const t of txs) {
    (t as any).image = whaleImages[t.symbol] || ''
  }

  return NextResponse.json({
    signals: txs,
    total: txs.length,
    timestamp: now,
    note: '基于市场趋势模拟'
  }, {
    headers: { 'Cache-Control': 'no-cache' }
  })
}
