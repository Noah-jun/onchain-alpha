// CoinGecko API 服务
// 免费 API，无需 key，速率限制 10-50 req/min

const BASE_URL = 'https://api.coingecko.com/api/v3'

interface CoinGeckoMarketCoin {
  id: string
  symbol: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  total_volume: number
}

interface CoinGeckoGlobal {
  data: {
    active_cryptocurrencies: number
    market_cap_change_percentage_24h_usd: number
    fear_and_greed_value?: number
  }
}

// 获取 BTC/ETH 价格
export async function getCryptoPrices(coinIds: string[]): Promise<Record<string, { price: number; change24h: number }>> {
  try {
    const ids = coinIds.join(',')
    const url = `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 } // 缓存 60 秒
    })
    
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`)
    }
    
    const data = await res.json()
    
    const result: Record<string, { price: number; change24h: number }> = {}
    for (const coinId of coinIds) {
      if (data[coinId]) {
        result[coinId] = {
          price: data[coinId].usd,
          change24h: data[coinId].usd_24h_change || 0
        }
      }
    }
    return result
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error)
    return {}
  }
}

// 获取市场数据（包含恐惧贪婪指数）
export async function getGlobalMarketData(): Promise<{
  fearGreed: number
  marketCapChange: number
  activeCryptos: number
}> {
  try {
    const url = `${BASE_URL}/global`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 } // 缓存 5 分钟
    })
    
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`)
    }
    
    const data: CoinGeckoGlobal = await res.json()
    
    return {
      fearGreed: data.data.fear_and_greed_value || 50,
      marketCapChange: data.data.market_cap_change_percentage_24h_usd || 0,
      activeCryptos: data.data.active_cryptocurrencies || 0
    }
  } catch (error) {
    console.error('Failed to fetch global market data:', error)
    return {
      fearGreed: 50,
      marketCapChange: 0,
      activeCryptos: 0
    }
  }
}

// 获取币种市场数据（用于排行榜/趋势）
export async function getCoinMarkets(coinIds: string[], currency = 'usd'): Promise<CoinGeckoMarketCoin[]> {
  try {
    const ids = coinIds.join(',')
    const url = `${BASE_URL}/coins/markets?vs_currency=${currency}&ids=${ids}&order=market_cap_desc&sparkline=false`
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 }
    })
    
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`)
    }
    
    return await res.json()
  } catch (error) {
    console.error('Failed to fetch coin markets:', error)
    return []
  }
}

// 格式化价格
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (price >= 0.01) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

// 格式化百分比
export function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}
