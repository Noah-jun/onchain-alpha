// Project Search API
// 使用 CoinGecko 搜索项目，支持模糊搜索
// 同时支持加密行业概念名词搜索

import { NextResponse } from 'next/server'
import { CRYPTO_CONCEPTS, searchConcepts, CryptoConcept } from '@/lib/concepts'
import { curlGetJSON } from '@/lib/proxyFetch'

export const dynamic = 'force-dynamic'

interface CoinGeckoSearchResult {
  id: string
  name: string
  symbol: string
  thumb: string
  large: string
  market_cap_rank: number
}

interface CoinGeckoCoinDetail {
  id: string
  symbol: string
  name: string
  image: {
    thumb: string
    small: string
    large: string
  }
  links: {
    homepage: string[]
    whitepaper: string
    blockchain_site: string[]
    telegram_channel_identifier: string
    twitter_screen_name: string
  }
  market_data: {
    current_price: { usd: number }
    market_cap: { usd: number }
    total_volume: { usd: number }
    price_change_percentage_24h: number
    price_change_percentage_7d: number
    price_change_percentage_30d: number
    circulating_supply: number
    total_supply: number
    max_supply: number
  }
  market_cap_rank: number
  genesis_date: string
  categories: string[]
  description: { en: string }
  sentiment_votes_up_percentage: number
  sentiment_votes_down_percentage: number
}

// 模糊搜索项目
async function searchProjects(query: string): Promise<CoinGeckoSearchResult[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    const data = curlGetJSON(url)
    return data.coins || []
  } catch (error) {
    console.error('Failed to search projects:', error)
    return []
  }
}

// 获取项目详情
async function getProjectDetails(coinId: string): Promise<CoinGeckoCoinDetail | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    return curlGetJSON(url)
  } catch (error) {
    console.error('Failed to get project details:', error)
    return null
  }
}

// 格式化链接
function formatLinks(coin: CoinGeckoCoinDetail) {
  const links = {
    website: '',
    twitter: '',
    telegram: '',
    whitepaper: '',
    blockchainSite: ''
  }
  
  if (!coin.links) return links
  
  // Website
  if (coin.links.homepage?.[0]) {
    links.website = coin.links.homepage[0]
  }
  
  // Twitter
  if (coin.links.twitter_screen_name) {
    links.twitter = `https://twitter.com/${coin.links.twitter_screen_name}`
  }
  
  // Telegram
  if (coin.links.telegram_channel_identifier) {
    links.telegram = `https://t.me/${coin.links.telegram_channel_identifier}`
  }
  
  // Whitepaper
  if (coin.links.whitepaper) {
    links.whitepaper = coin.links.whitepaper
  }
  
  // Blockchain site
  if (Array.isArray(coin.links.blockchain_site)) {
    const etherscanSite = coin.links.blockchain_site.find(s => s?.includes('etherscan'))
    if (etherscanSite) {
      links.blockchainSite = etherscanSite
    }
  }
  
  return links
}

// 获取项目赛道分类
function getSector(categories: string[]): string {
  if (!categories || categories.length === 0) return '未知'
  
  const category = categories[0].toLowerCase()
  
  if (category.includes('defi')) return 'DeFi'
  if (category.includes('nft')) return 'NFT'
  if (category.includes('game')) return 'GameFi'
  if (category.includes('storage')) return '存储'
  if (category.includes('layer1') || category.includes('layer 1')) return 'Layer1'
  if (category.includes('layer2') || category.includes('layer 2')) return 'Layer2'
  if (category.includes('dao')) return 'DAO'
  if (category.includes('meme')) return 'Memecoin'
  if (category.includes('stablecoin')) return '稳定币'
  if (category.includes('exchange')) return '交易所'
  if (category.includes('bridge')) return '跨链桥'
  if (category.includes('oracle')) return '预言机'
  if (category.includes('protocol')) return '协议'
  
  return categories[0]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const coinId = searchParams.get('id')
    const conceptId = searchParams.get('concept')
    
    // 获取概念详情
    if (conceptId) {
      const lowerId = conceptId.toLowerCase().trim()
      let concept = CRYPTO_CONCEPTS.find(c => c.id === lowerId)
      if (!concept) {
        // 模糊匹配：按 term 或 aliases 搜索
        concept = CRYPTO_CONCEPTS.find(c =>
          c.term.toLowerCase() === lowerId ||
          c.aliases.some(a => a.toLowerCase() === lowerId)
        )
      }
      if (!concept) {
        return NextResponse.json({ error: `未找到概念「${conceptId}」的相关信息` }, { status: 404 })
      }
      return NextResponse.json({
        type: 'concept',
        concept,
        timestamp: Date.now()
      })
    }
    
    // 搜索项目或概念
    if (query) {
      // 先搜索概念
      const conceptResults = searchConcepts(query)
      // 再搜索项目
      const projectResults = await searchProjects(query)
      
      // 只返回前20个结果，过滤掉没有排名的
      const filteredProjects = projectResults
        .filter(coin => coin.market_cap_rank)
        .slice(0, 20)
      
      return NextResponse.json({
        type: 'search',
        results: filteredProjects,
        concepts: conceptResults,
        timestamp: Date.now()
      })
    }
    
    // 获取项目详情
    if (coinId) {
      const details = await getProjectDetails(coinId)
      
      if (!details) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
      
      const links = formatLinks(details)
      const marketData = details.market_data || {}
      
      // 计算流通率
      const circulating = marketData.circulating_supply || 0
      const total = marketData.total_supply || 0
      const circulationRate = total > 0 ? (circulating / total * 100).toFixed(2) : 'N/A'
      
      return NextResponse.json({
        type: 'detail',
        project: {
          id: details.id,
          symbol: (details.symbol || '').toUpperCase(),
          name: details.name || '',
          image: details.image?.large || details.image?.small || details.image?.thumb || '',
          
          // 基本信息
          website: links.website,
          twitter: links.twitter,
          telegram: links.telegram,
          whitepaper: links.whitepaper,
          blockchainSite: links.blockchainSite,
          genesisDate: details.genesis_date || '',
          
          // 项目分类
          sector: getSector(details.categories || []),
          categories: details.categories || [],
          description: details.description?.en?.slice(0, 500) || '',
          
          // 市场数据
          price: marketData.current_price?.usd || 0,
          priceChange24h: marketData.price_change_percentage_24h || 0,
          priceChange7d: marketData.price_change_percentage_7d || 0,
          priceChange30d: marketData.price_change_percentage_30d || 0,
          marketCap: marketData.market_cap?.usd || 0,
          marketCapRank: details.market_cap_rank ?? 0,
          volume24h: marketData.total_volume?.usd || 0,
          
          // 代币信息
          circulatingSupply: circulating,
          totalSupply: total,
          maxSupply: marketData.max_supply ?? undefined,
          circulationRate: circulationRate,
          
          // 社区情绪
          sentimentUp: details.sentiment_votes_up_percentage ?? 0,
          sentimentDown: details.sentiment_votes_down_percentage ?? 0,
        },
        timestamp: Date.now()
      })
    }
    
    return NextResponse.json(
      { error: 'Missing query parameter: q or id' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Project search API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project data' },
      { status: 500 }
    )
  }
}
