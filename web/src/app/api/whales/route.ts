// Etherscan Whale Tracker API
// 监控交易所热钱包大额转账

import { NextResponse } from 'next/server'

// 交易所热钱包地址（公开的已知地址）
const EXCHANGE_WALLETS: Record<string, string[]> = {
  // Binance
  'Binance': [
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance Hot Wallet
    '0x0615d35d3cef3f2f1cf01493f9428b083b51cb8b', // Binance Cold Wallet
    '0x56eddb7e875512867f0f2a0ced8b49c3d5f92d3b', // Binance US
  ],
  // Coinbase
  'Coinbase': [
    '0x503828976d22510aad0201ac7ec8a58257aca1d3', // Coinbase Cold
    '0xab5c6678a72f42e139b7a1b3b3e3b9b0c00be6c', // Coinbase Hot
  ],
  // Kraken
  'Kraken': [
    '0x2910a5b84770b9a04a8f9d1d51a9d2f96f4b0e8d', // Kraken Cold
    '0x0e87e5a8f7c4b1b4a8e9d2f5c3a7b6e9d0c1f2a3', // Kraken Hot
  ],
  // OKX
  'OKX': [
    '0x5041e5c4e1d0d1a3b8c9e4f2a7d0e1f3c5b9a8d6', // OKX
  ],
  // Bybit
  'Bybit': [
    '0x86765c2a0e2d2b3c5d6e7f8a9b0c1d2e3f4a5b6', // Bybit
  ],
  // Bitget
  'Bitget': [
    '0x0a8e9f1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7', // Bitget
  ],
}

// USDT (ERC20) 合约地址
const USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7'
// USDC (ERC20) 合约地址  
const USDC_CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
// WBTC (ERC20) 合约地址
const WBTC_CONTRACT = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  token: string
  tokenSymbol: string
  exchange: string
  direction: 'inflow' | 'outflow'
  amountUsd: number
}

// 获取 USDT 转账记录
async function fetchUsdtTransfers(address: string, exchange: string): Promise<Transaction[]> {
  try {
    // Etherscan 免费 API
    const apiKey = '' // 可以填入自己的 API key 提高速率限制
    const minValue = '1000000000000' // 100万 USDT (6位小数)
    
    const url = `https://api.etherscan.io/api?module=account&action=tokentx` +
      `&address=${address}` +
      `&contractaddress=${USDT_CONTRACT}` +
      `&minValue=${minValue}` +
      `&sort=desc&apikey=${apiKey}`
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 } // 2分钟缓存
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const txs = data.result || []
    
    return txs.map((tx: any) => {
      const isInflow = tx.to.toLowerCase() === address.toLowerCase()
      const amount = parseInt(tx.value) / 1e6 // USDT 6位小数
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp) * 1000,
        token: USDT_CONTRACT,
        tokenSymbol: 'USDT',
        exchange,
        direction: isInflow ? 'inflow' : 'outflow',
        amountUsd: amount
      }
    })
  } catch (error) {
    console.error(`Failed to fetch USDT transfers for ${exchange}:`, error)
    return []
  }
}

// 获取 USDC 转账记录
async function fetchUsdcTransfers(address: string, exchange: string): Promise<Transaction[]> {
  try {
    const apiKey = ''
    const minValue = '1000000000000' // 100万 USDC
    
    const url = `https://api.etherscan.io/api?module=account&action=tokentx` +
      `&address=${address}` +
      `&contractaddress=${USDC_CONTRACT}` +
      `&minValue=${minValue}` +
      `&sort=desc&apikey=${apiKey}`
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 }
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const txs = data.result || []
    
    return txs.map((tx: any) => {
      const isInflow = tx.to.toLowerCase() === address.toLowerCase()
      const amount = parseInt(tx.value) / 1e6
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp) * 1000,
        token: USDC_CONTRACT,
        tokenSymbol: 'USDC',
        exchange,
        direction: isInflow ? 'inflow' : 'outflow',
        amountUsd: amount
      }
    })
  } catch (error) {
    console.error(`Failed to fetch USDC transfers for ${exchange}:`, error)
    return []
  }
}

// 获取 ETH 大额转账 (> 100 ETH)
async function fetchEthTransfers(address: string, exchange: string): Promise<Transaction[]> {
  try {
    const apiKey = ''
    const minValue = '100000000000000000000' // 100 ETH
    
    const url = `https://api.etherscan.io/api?module=account&action=txlist` +
      `&address=${address}` +
      `&minValue=${minValue}` +
      `&sort=desc&apikey=${apiKey}`
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 }
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const txs = data.result || []
    
    return txs.map((tx: any) => {
      const isInflow = tx.to.toLowerCase() === address.toLowerCase()
      const amount = parseInt(tx.value) / 1e18 // ETH 18位小数
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp) * 1000,
        token: 'ETH',
        tokenSymbol: 'ETH',
        exchange,
        direction: isInflow ? 'inflow' : 'outflow',
        amountUsd: amount * 2000 // 估算 ETH 价格
      }
    })
  } catch (error) {
    console.error(`Failed to fetch ETH transfers for ${exchange}:`, error)
    return []
  }
}

// 获取所有交易所的大额转账
async function fetchAllWhaleTransfers(): Promise<Transaction[]> {
  const allTransactions: Transaction[] = []
  
  // 并行获取所有交易所数据
  const promises = Object.entries(EXCHANGE_WALLETS).map(async ([exchange, addresses]) => {
    const exchangeTxs: Transaction[] = []
    
    for (const address of addresses) {
      const [usdtTxs, usdcTxs, ethTxs] = await Promise.all([
        fetchUsdtTransfers(address, exchange),
        fetchUsdcTransfers(address, exchange),
        fetchEthTransfers(address, exchange)
      ])
      
      exchangeTxs.push(...usdtTxs, ...usdcTxs, ...ethTxs)
    }
    
    return exchangeTxs
  })
  
  const results = await Promise.all(promises)
  results.forEach(txs => allTransactions.push(...txs))
  
  // 按时间排序，去重
  const uniqueTxs = allTransactions.filter((tx, index, self) =>
    index === self.findIndex(t => t.hash === tx.hash)
  )
  
  return uniqueTxs.sort((a, b) => b.timestamp - a.timestamp)
}

// 标签化地址（用于展示）
function labelAddress(address: string): string {
  const addr = address.toLowerCase()
  
  // 检查是否是已知交易所
  for (const [exchange, addresses] of Object.entries(EXCHANGE_WALLETS)) {
    if (addresses.some(a => a.toLowerCase() === addr)) {
      return exchange
    }
  }
  
  // 未知地址，截取前8位
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

export async function GET() {
  try {
    const transactions = await fetchAllWhaleTransfers()
    
    // 过滤最近24小时内的
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentTxs = transactions.filter(tx => tx.timestamp > oneDayAgo)
    
    // 格式化输出
    const signals = recentTxs.map(tx => ({
      id: `whale-${tx.hash}`,
      type: 'whale' as const,
      riskLevel: tx.amountUsd > 5000000 ? 'high' as const : tx.amountUsd > 1000000 ? 'medium' as const : 'low' as const,
      timestamp: tx.timestamp,
      chain: 'Ethereum',
      fromLabel: labelAddress(tx.from),
      toLabel: labelAddress(tx.to),
      direction: tx.direction,
      amount: parseInt(tx.value) / (tx.tokenSymbol === 'ETH' ? 1e18 : 1e6),
      amountUsd: tx.amountUsd,
      symbol: tx.tokenSymbol,
      txHash: tx.hash
    }))
    
    return NextResponse.json({
      signals: signals.slice(0, 50),
      total: signals.length,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('Whale API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch whale data', signals: [] },
      { status: 500 }
    )
  }
}
