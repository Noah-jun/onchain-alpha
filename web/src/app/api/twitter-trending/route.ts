// Twitter/X Trending Topics API
// 使用 CoinGecko Trending 作为替代数据源
// Nitter 实例已全部失效，使用趋势数据近似 Twitter 热度

import { NextResponse } from 'next/server'

interface TrendingTopic {
  id: string
  name: string
  tweetVolume: number
  web3Score: number
  categories: string[]
  rank: number
}

// Web3 领域分类
function inferCategories(symbol: string, name: string): string[] {
  const sym = symbol.toUpperCase()
  const nameLower = name.toLowerCase()
  const cats: string[] = []

  if (['BTC', 'ETH', 'SOL', 'AVAX', 'SUI', 'APT', 'NEAR', 'DOT', 'ADA', 'ALGO'].includes(sym)) cats.push('Layer1')
  if (['UNI', 'AAVE', 'CRV', 'CAKE', 'MKR', 'COMP'].includes(sym)) cats.push('DeFi')
  if (['PEPE', 'DOGE', 'SHIB', 'WIF', 'BONK', 'FLOKI'].includes(sym)) cats.push('Meme')
  if (['ONDO', 'MKR', 'CFG'].includes(sym)) cats.push('RWA')
  if (['FET', 'AGIX', 'WLD', 'RENDER', 'TAO', 'AI'].includes(sym) || nameLower.includes('ai')) cats.push('AI')
  if (['LINK', 'PYTH', 'API3'].includes(sym)) cats.push('预言机')
  if (['ARB', 'OP', 'STRK', 'IMX'].includes(sym)) cats.push('Layer2')
  if (['LDO', 'RPL', 'ETHFI', 'EIGEN'].includes(sym)) cats.push('LSD/再质押')
  if (['ENA', 'ETHENA', 'USDe'].includes(sym)) cats.push('稳定币')

  if (cats.length === 0) cats.push('其他')
  return cats
}

export async function GET() {
  try {
    // 从 CoinGecko Trending 获取数据作为替代
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 600 }
    })

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)

    const data = await res.json()
    const coins = data.coins || []

    const topics: TrendingTopic[] = coins.slice(0, 15).map((item: any, index: number) => {
      const coin = item.item
      const web3Score = 5 + (coin.market_cap_rank ? 3 : 0) + Math.max(0, 5 - (coin.score || 0))
      const tweetVolume = (coin.data?.market_cap || coin.market_cap_rank || 100) * 1000

      return {
        id: `x-${coin.id}`,
        name: coin.name,
        tweetVolume,
        web3Score,
        categories: inferCategories(coin.symbol, coin.name),
        rank: index + 1
      }
    })

    return NextResponse.json({
      topics,
      tweets: [],
      lastUpdate: Date.now(),
      source: 'CoinGecko'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
      }
    })
  } catch (error) {
    console.error('Twitter trending API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch trending',
      topics: [
        { id: 'x-fb-btc', name: 'Bitcoin', tweetVolume: 85000000, web3Score: 10, categories: ['Layer1'], rank: 1 },
        { id: 'x-fb-eth', name: 'Ethereum', tweetVolume: 65000000, web3Score: 10, categories: ['Layer1'], rank: 2 },
        { id: 'x-fb-sol', name: 'Solana', tweetVolume: 42000000, web3Score: 9, categories: ['Layer1'], rank: 3 },
        { id: 'x-fb-pepe', name: 'Pepe', tweetVolume: 38000000, web3Score: 8, categories: ['Meme'], rank: 4 },
      ],
      tweets: [],
      lastUpdate: Date.now()
    })
  }
}
