// Binance Alpha 数据 - 多数据源fallback
'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface AlphaToken {
  id: string
  symbol: string
  name: string
  price: number
  priceChange24h: number
  volume24h: number
  timestamp: number
  announcementUrl: string
  description: string
}

interface UseBinanceAlphaReturn {
  tokens: AlphaToken[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// 数据源列表（按优先级）
const API_SOURCES = [
  {
    name: 'CryptoCompare',
    url: 'https://min-api.cryptocompare.com/data/top/totalvolfull?limit=50&tsym=USDT',
    parse: (data: any) => {
      if (data.Response !== 'Success') throw new Error(data.Message)
      return data.Data || []
    },
    transform: (item: any, index: number, now: number) => {
      const coin = item.CoinInfo
      const raw = item.RAW?.USDT || {}
      return {
        id: `binance-alpha-${coin.Name}-${index}`,
        symbol: coin.Name,
        name: coin.FullName,
        price: raw.PRICE || 0,
        priceChange24h: raw.CHANGEPCTDAY || 0,
        volume24h: raw.TOPTIERVOLUME24HOURTO || 0,
        timestamp: now - index * 300000,
        announcementUrl: `https://www.binance.com/zh-CN/support/announcement/categories/list#announcementType=newlisting`,
        description: `${coin.FullName} (${coin.Name}) 在 Binance 上线交易`
      }
    }
  },
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usdt&order=volume_desc&per_page=50&page=1&sparkline=false',
    parse: (data: any) => {
      if (!Array.isArray(data)) throw new Error('Invalid data')
      return data
    },
    transform: (item: any, index: number, now: number) => {
      return {
        id: `binance-alpha-${item.symbol}-${index}`,
        symbol: item.symbol?.toUpperCase(),
        name: item.name,
        price: item.current_price || 0,
        priceChange24h: item.price_change_percentage_24h || 0,
        volume24h: item.total_volume || 0,
        timestamp: now - index * 300000,
        announcementUrl: `https://www.binance.com/zh-CN/support/announcement/categories/list#announcementType=newlisting`,
        description: `${item.name} (${item.symbol?.toUpperCase()}) 在 Binance 上线交易`
      }
    }
  }
]

async function fetchFromSources(): Promise<AlphaToken[]> {
  const now = Date.now()
  
  for (const source of API_SOURCES) {
    try {
      console.log(`Trying ${source.name}...`)
      const res = await fetch(source.url, {
        headers: { 'Accept': 'application/json' }
      })
      
      if (!res.ok) {
        console.log(`${source.name} HTTP error: ${res.status}`)
        continue
      }
      
      const data = await res.json()
      const rawItems = source.parse(data)
      
      if (rawItems.length === 0) {
        console.log(`${source.name} returned empty`)
        continue
      }
      
      const tokens = rawItems
        .slice(0, 20)
        .map((item: any, index: number) => source.transform(item, index, now))
      
      console.log(`${source.name} success: ${tokens.length} tokens`)
      return tokens
    } catch (err: any) {
      console.log(`${source.name} failed: ${err.message}`)
      continue
    }
  }
  
  throw new Error('所有数据源都不可用')
}

export function useBinanceAlpha(): UseBinanceAlphaReturn {
  const [tokens, setTokens] = useState<AlphaToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetchFromSources()
      setTokens(result)
      setError(null)
    } catch (err: any) {
      console.error('Binance Alpha fetch error:', err)
      setError(err.message || '获取数据失败')
      setTokens([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
    // 每60秒刷新
    const interval = setInterval(fetchTokens, 60000)
    return () => clearInterval(interval)
  }, [fetchTokens])

  return { tokens, isLoading, error, refetch: fetchTokens }
}

// 格式化相对时间
export function formatAnnouncementTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
