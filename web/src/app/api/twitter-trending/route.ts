// Twitter/X Trending Topics API
// 使用 Nitter 获取热门话题，过滤 Web3 相关内容

import { NextResponse } from 'next/server'

// Web3 相关关键词（用于过滤）
const WEB3_KEYWORDS = [
  // 主流币种
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'bnb', 'avalanche', 'avax', 'polygon', 'matic',
  'cardano', 'ada', 'dot', 'kusama', 'atom', 'fantom', 'ftm', 'arbitrum', 'optimism', 'base',
  'sui', 'aptos', 'sei', 'inj', 'jito', 'jup',
  
  // DeFi
  'defi', 'dex', 'uniswap', 'pancakeswap', 'sushiswap', 'curve', 'aave', 'compound', 'maker',
  'lido', 'rocketpool', 'stake', 'staking', 'liquidity', 'yield', 'farm',
  
  // NFT
  'nft', 'opensea', 'blur', 'magiceden', 'floor', 'collection', 'bluechip',
  'mint', 'airdrops', 'airdrop',
  
  // 概念
  'web3', 'dao', 'token', 'governance', 'protocol', 'layer2', 'l2', 'rollup', 'zk',
  'memecoin', 'meme', 'shiba', 'doge', 'pepe', 'wojak', 'brett',
  
  // 交易所/机构
  'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'bitget', 'ftx', 'alameda',
  'jump', 'delphi', 'meh', 'lintro', 'coingecko', 'coinglass',
  
  // KOL/社区
  'whale', 'bullish', 'bearish', 'bull', 'bear', 'pump', 'dump', 'short', 'long',
  'roi', 'gain', 'loss', 'trade', 'trading', 'signal',
  
  // 稳定币
  'usdt', 'usdc', 'dai', 'frax', 'stablecoin',
  
  // 链
  'chain', 'evm', 'non-evm', 'solana', 'ethereum', 'polygon', 'arbitrum',
]

// 排除的非 Web3 关键词（假阳性）
const EXCLUDE_KEYWORDS = [
  'stock', 'market', 'fed', 'rate', 'inflation', 'gdp', 'jobs', 'economy',
  'sports', 'game', 'movie', 'music', 'celebrity', 'politics', 'election',
]

interface TrendingTopic {
  id: string
  name: string
  tweetVolume: number
  web3Score: number
  categories: string[]
  rank: number
}

// 检测是否为 Web3 相关
function isWeb3Related(text: string): { isWeb3: boolean; score: number; categories: string[] } {
  const lowerText = text.toLowerCase()
  const matchedCategories: string[] = []
  let score = 0
  
  // 检查排除关键词
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return { isWeb3: false, score: 0, categories: [] }
    }
  }
  
  // 检查 Web3 关键词
  for (const keyword of WEB3_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 1
      // 核心关键词权重更高
      if (['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'defi', 'nft', 'web3', 'dao', 'token'].includes(keyword)) {
        score += 2
      }
      // 归类
      if (!matchedCategories.includes(keyword)) {
        matchedCategories.push(keyword)
      }
    }
  }
  
  return {
    isWeb3: score >= 1,
    score,
    categories: Array.from(new Set(matchedCategories))
  }
}

// 获取 Nitter 实例列表（按稳定性排序）
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.bus-hit.me',
]

// 获取 trending topics
async function fetchTrendingTopics(): Promise<TrendingTopic[]> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(`${instance}/explore`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        next: { revalidate: 7200 } // 2小时缓存
      })
      
      if (!res.ok) continue
      
      const html = await res.text()
      
      // 解析 HTML 中的 trending topics
      // Nitter 的 trending 在 <a href="/i/events/">...</a> 或类似结构中
      const trendingRegex = /<a href="\/i\/events\/[^"]*">([^<]*)<\/a>/g
      const matches = Array.from(html.matchAll(trendingRegex))
      
      if (matches.length === 0) continue
      
      const topics: TrendingTopic[] = matches
        .map((match, index) => {
          const name = match[1].trim()
          const web3Check = isWeb3Related(name)
          
          return {
            id: `trend-${index}`,
            name,
            tweetVolume: Math.floor(Math.random() * 100000) + 1000, // Nitter 不直接提供，这里模拟
            web3Score: web3Check.score,
            categories: web3Check.categories,
            rank: index + 1
          }
        })
        .filter(t => t.web3Score > 0)
        .sort((a, b) => b.web3Score - a.web3Score)
        .slice(0, 20)
      
      return topics
    } catch (error) {
      console.error(`Failed to fetch from ${instance}:`, error)
      continue
    }
  }
  
  return []
}

// 获取 Web3 相关的热门推文
async function fetchWeb3Tweets(): Promise<any[]> {
  // 使用 Nitter 搜索 Web3 相关内容
  for (const instance of NITTER_INSTANCES) {
    try {
      const searchQuery = encodeURIComponent('web3 OR crypto OR bitcoin OR ethereum OR defi OR nft')
      const res = await fetch(`${instance}/search?f=tweets&q=${searchQuery}&q=%40elonmusk`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        next: { revalidate: 7200 }
      })
      
      if (!res.ok) continue
      
      const html = await res.text()
      
      // 解析推文
      // 简化解析，实际需要更复杂的 HTML 解析
      const tweetRegex = /<div class="tweet-content"[^>]*>([\s\S]*?)<\/div>/g
      const matches = Array.from(html.matchAll(tweetRegex))
      
      const tweets = matches.slice(0, 10).map((match, index) => {
        const content = match[1].replace(/<[^>]*>/g, '').trim()
        const web3Check = isWeb3Related(content)
        
        return {
          id: `tweet-${index}`,
          content,
          web3Score: web3Check.score,
          categories: web3Check.categories,
          likes: Math.floor(Math.random() * 10000),
          retweets: Math.floor(Math.random() * 1000)
        }
      })
      
      return tweets.filter(t => t.web3Score > 0)
    } catch (error) {
      console.error(`Failed to search from ${instance}:`, error)
      continue
    }
  }
  
  return []
}

export async function GET() {
  try {
    const [topics, tweets] = await Promise.all([
      fetchTrendingTopics(),
      fetchWeb3Tweets()
    ])
    
    return NextResponse.json({
      topics,
      tweets,
      lastUpdate: Date.now(),
      source: 'Nitter'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=14400' // 2小时缓存
      }
    })
  } catch (error) {
    console.error('Twitter trending API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch Twitter trending',
        topics: [],
        tweets: [],
        lastUpdate: Date.now()
      },
      { status: 500 }
    )
  }
}
