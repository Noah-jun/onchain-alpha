import { MarketData } from '@/types'
import { getCryptoPrices, getGlobalMarketData, formatPrice, formatPercent } from './coingecko'

// Alternative.me Fear & Greed Index API (免费)
async function getFearGreedIndex(): Promise<{ value: number; label: string; change: number }> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 } // 缓存 1 小时
    })
    
    if (!res.ok) throw new Error('Fear&Greed API error')
    
    const data = await res.json()
    const fng = data.data[0]
    
    const value = parseInt(fng.value)
    let label = '中性'
    if (value <= 25) label = '极度恐慌'
    else if (value <= 45) label = '恐慌'
    else if (value <= 55) label = '中性'
    else if (value <= 75) label = '贪婪'
    else label = '极度贪婪'
    
    return {
      value,
      label,
      change: parseInt(fng.value_change_24h) || 0
    }
  } catch (error) {
    console.error('Failed to fetch Fear&Greed:', error)
    return { value: 50, label: '中性', change: 0 }
  }
}

// Yahoo Finance 指数数据 (通过 Next.js API Route 代理)
// 实际请求在 /api/stocks 中处理，这里只是调用
async function getStockMarketData(): Promise<{
  nasdaq: { price: number; change: number; status: 'pre' | 'post' | 'regular' | 'closed' }
  sp500: { price: number; change: number; status: 'pre' | 'post' | 'regular' | 'closed' }
}> {
  try {
    // 调用本地 API Route 获取美股数据
    // 设置较长的 revalidate 时间避免频繁请求
    const res = await fetch('/api/stocks', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 900 } // 缓存 15 分钟
    })
    
    if (!res.ok) throw new Error('Stocks API error')
    
    const data = await res.json()
    return data
  } catch (error) {
    console.error('Failed to fetch stock data:', error)
    // 返回静态数据作为后备
    return getFallbackStockData()
  }
}

// 后备数据（当 API 不可用时）
function getFallbackStockData() {
  const now = new Date()
  const hour = now.getUTCHours()
  const day = now.getUTCDay()
  
  // 周末关闭
  if (day === 0 || day === 6) {
    return {
      nasdaq: { price: 19285.42, change: 0.65, status: 'closed' as const },
      sp500: { price: 6110.78, change: 0.38, status: 'closed' as const }
    }
  }
  
  // 美股时间判断
  let nasdaqStatus: 'pre' | 'post' | 'regular' | 'closed' = 'closed'
  let sp500Status: 'pre' | 'post' | 'regular' | 'closed' = 'closed'
  
  if (hour >= 14 && hour < 21) {
    nasdaqStatus = 'regular'
    sp500Status = 'regular'
  } else if (hour >= 13 && hour < 14) {
    nasdaqStatus = 'pre'
    sp500Status = 'pre'
  } else if (hour >= 21 && hour < 22) {
    nasdaqStatus = 'post'
    sp500Status = 'post'
  }
  
  return {
    nasdaq: { price: 19285.42, change: 0.65, status: nasdaqStatus },
    sp500: { price: 6110.78, change: 0.38, status: sp500Status }
  }
}

// 获取完整市场数据
export async function fetchMarketData(): Promise<MarketData> {
  const [fearGreed, btcEthPrices, stockData] = await Promise.all([
    getFearGreedIndex(),
    getCryptoPrices(['bitcoin', 'ethereum']),
    getStockMarketData()
  ])
  
  return {
    fearGreed,
    btc: btcEthPrices.bitcoin || { price: 0, change24h: 0 },
    eth: btcEthPrices.ethereum || { price: 0, change24h: 0 },
    nasdaq: stockData.nasdaq,
    sp500: stockData.sp500
  }
}

// 辅助函数导出
export { formatPrice, formatPercent }
