// Multi-Source Trending API
// 从多个数据源获取热门项目，确保至少有数据可用

import { NextResponse } from 'next/server'

// Web3 相关关键词（用于过滤）
const WEB3_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'bnb', 'avalanche', 'avax', 'polygon', 'matic',
  'cardano', 'ada', 'dot', 'kusama', 'atom', 'fantom', 'ftm', 'arbitrum', 'optimism', 'base',
  'sui', 'aptos', 'sei', 'inj', 'jito', 'jup',
  'defi', 'dex', 'uniswap', 'pancakeswap', 'sushiswap', 'curve', 'aave', 'compound', 'maker',
  'lido', 'rocketpool', 'stake', 'staking', 'liquidity', 'yield', 'farm',
  'nft', 'opensea', 'blur', 'magiceden', 'floor', 'collection', 'bluechip',
  'mint', 'airdrops', 'airdrop',
  'web3', 'dao', 'token', 'governance', 'protocol', 'layer2', 'l2', 'rollup', 'zk',
  'memecoin', 'meme', 'shiba', 'doge', 'pepe', 'wojak', 'brett',
  'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'bitget', 'ftx', 'alameda',
  'jump', 'delphi', 'meh', 'lintro', 'coingecko', 'coinglass',
  'whale', 'bullish', 'bearish', 'bull', 'bear', 'pump', 'dump', 'short', 'long',
  'roi', 'gain', 'loss', 'trade', 'trading', 'signal',
  'usdt', 'usdc', 'dai', 'frax', 'stablecoin',
  'chain', 'evm', 'non-evm', 'solana', 'ethereum', 'polygon', 'arbitrum',
]

// 数据源接口
interface TrendingTopic {
  id: string
  name: string
  tweetVolume?: number
  web3Score: number
  categories: string[]
  rank: number
  source: string
}

// 来源1: Nitter Twitter Trending
async function fetchNitterTrending(): Promise<TrendingTopic[]> {
  const NITTER_INSTANCES = [
    'https://nitter.net',
    'https://nitter.privacydev.net',
  ]
  
  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(`${instance}/explore`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        next: { revalidate: 7200 } // 2小时
      })
      
      if (!res.ok) continue
      
      const html = await res.text()
      
      // 解析 trending topics
      const trendingRegex = /<a href="\/i\/events\/[^"]*">([^<]*)<\/a>/g
      const matches = Array.from(html.matchAll(trendingRegex))
      
      if (matches.length === 0) continue
      
      const topics: TrendingTopic[] = matches
        .map((match, index) => {
          const name = match[1].trim()
          const nameLower = name.toLowerCase()
          let web3Score = 0
          const categories: string[] = []
          
          for (const keyword of WEB3_KEYWORDS) {
            if (nameLower.includes(keyword)) {
              web3Score += 2 // Twitter 关键词权重更高
              if (!categories.includes(keyword)) categories.push(keyword)
            }
          }
          
          return {
            id: `nitter-${index}`,
            name,
            web3Score,
            categories,
            rank: index + 1,
            source: 'Twitter'
          }
        })
        .filter(t => t.web3Score > 0)
        .slice(0, 15)
      
      return topics
    } catch (error) {
      console.error(`Nitter ${instance} failed:`, error)
      continue
    }
  }
  
  return []
}

// 来源3: 热门币种搜索趋势（CoinGecko Search）
async function fetchCoinGeckoSearchTrending(): Promise<TrendingTopic[]> {
  try {
    // CoinGecko 的 trending 搜索
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }
    })
    
    if (!res.ok) throw new Error(`CoinGecko trending error: ${res.status}`)
    
    const data = await res.json()
    const coins = data.coins || []
    
    const topics: TrendingTopic[] = coins.slice(0, 20).map((item: any, index: number) => {
      const coin = item.item
      const nameLower = coin.name.toLowerCase()
      const symbolLower = coin.symbol.toLowerCase()
      let web3Score = 0
      const categories: string[] = []
      
      for (const keyword of WEB3_KEYWORDS) {
        if (nameLower.includes(keyword) || symbolLower.includes(keyword)) {
          web3Score += 1
          if (!categories.includes(keyword)) categories.push(keyword)
        }
      }
      
      return {
        id: `search-${coin.id}`,
        name: coin.name,
        tweetVolume: coin.market_cap_rank ? undefined : undefined,
        web3Score,
        categories: coin.categories || categories,
        rank: index + 1,
        source: 'CoinGecko搜索'
      }
    })
    
    return topics
  } catch (error) {
    console.error('CoinGecko search trending failed:', error)
    return []
  }
}

// 合并多个数据源，去重
function mergeAndDeduplicate(allTopics: TrendingTopic[]): TrendingTopic[] {
  // 按 name 去重，保留得分最高的
  const map = new Map<string, TrendingTopic>()
  
  for (const topic of allTopics) {
    const existing = map.get(topic.name)
    if (!existing || topic.web3Score > existing.web3Score) {
      map.set(topic.name, topic)
    }
  }
  
  return Array.from(map.values())
    .sort((a, b) => {
      // Web3 相关度优先，其次按排名
      if (b.web3Score !== a.web3Score) return b.web3Score - a.web3Score
      return a.rank - b.rank
    })
    .slice(0, 30)
}

export async function GET() {
  try {
    // 并行从多个数据源获取
    const [nitterTrending, searchTrending] = await Promise.all([
      fetchNitterTrending(),
      fetchCoinGeckoSearchTrending()
    ])
    
    // 合并所有数据
    const allTopics = [
      ...nitterTrending,
      ...searchTrending
    ]
    
    const mergedTopics = mergeAndDeduplicate(allTopics)
    
    // 如果所有源都失败，返回后备数据
    if (mergedTopics.length === 0) {
      const fallbackTopics: TrendingTopic[] = [
        { id: 'fallback-btc', name: 'Bitcoin', web3Score: 10, categories: ['Layer1', '支付'], rank: 1, source: 'Twitter' },
        { id: 'fallback-eth', name: 'Ethereum', web3Score: 10, categories: ['Layer1', 'DeFi'], rank: 2, source: 'Twitter' },
        { id: 'fallback-sol', name: 'Solana', web3Score: 9, categories: ['Layer1', 'DeFi'], rank: 3, source: 'Twitter' },
        { id: 'fallback-bnb', name: 'BNB', web3Score: 8, categories: ['交易所Token'], rank: 4, source: 'Twitter' },
        { id: 'fallback-arb', name: 'Arbitrum', web3Score: 8, categories: ['Layer2'], rank: 5, source: 'Twitter' },
      ]
      
      return NextResponse.json({
        topics: fallbackTopics,
        sources: [],
        lastUpdate: Date.now(),
        status: 'fallback'
      })
    }
    
    // 记录哪些源有数据
    const activeSources = []
    if (nitterTrending.length > 0) activeSources.push('Twitter')
    if (searchTrending.length > 0) activeSources.push('CoinGecko搜索')
    
    return NextResponse.json({
      topics: mergedTopics,
      sources: activeSources,
      total: mergedTopics.length,
      lastUpdate: Date.now(),
      status: 'ok'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    console.error('Trending API error:', error)
    
    // 返回后备数据
    return NextResponse.json({
      topics: [
        { id: 'fb-btc', name: 'Bitcoin', web3Score: 10, categories: ['Layer1'], rank: 1, source: 'CoinGecko' },
        { id: 'fb-eth', name: 'Ethereum', web3Score: 10, categories: ['Layer1'], rank: 2, source: 'CoinGecko' },
        { id: 'fb-sol', name: 'Solana', web3Score: 9, categories: ['Layer1'], rank: 3, source: 'CoinGecko' },
      ],
      sources: [],
      lastUpdate: Date.now(),
      status: 'fallback'
    })
  }
}
