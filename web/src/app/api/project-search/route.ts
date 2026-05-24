// Project Search API
// 使用 CoinGecko 搜索项目，支持模糊搜索
// 同时支持加密行业概念名词搜索
// Vercel 上用 fetch 直连，本地用 curl+代理

import { NextResponse } from 'next/server'
import { CRYPTO_CONCEPTS, searchConcepts, CryptoConcept } from '@/lib/concepts'
import { externalFetch, isVercel, DATA_DIR } from '@/lib/serverEnv'
import { getProjectInfo } from '@/lib/projectsDB'
import fs from 'fs'
import path from 'path'

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
  image: { thumb: string; small: string; large: string }
  links: { homepage: string[]; whitepaper: string; blockchain_site: string[]; telegram_channel_identifier: string; twitter_screen_name: string }
  market_data: {
    current_price: { usd: number }; market_cap: { usd: number }; total_volume: { usd: number }
    price_change_percentage_24h: number; price_change_percentage_7d: number; price_change_percentage_30d: number
    circulating_supply: number; total_supply: number; max_supply: number
  }
  market_cap_rank: number; genesis_date: string; categories: string[]
  description: { en: string }
  sentiment_votes_up_percentage: number; sentiment_votes_down_percentage: number
}

// 模糊搜索项目
async function searchProjects(query: string): Promise<CoinGeckoSearchResult[]> {
  try {
    const data = await externalFetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`)
    return data.coins || []
  } catch (error) {
    console.error('Failed to search projects:', error)
    return []
  }
}

// 获取项目详情
async function getProjectDetails(coinId: string): Promise<CoinGeckoCoinDetail | null> {
  try {
    return await externalFetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`)
  } catch (error) {
    console.error('Failed to get project details:', error)
    return null
  }
}

// 通过 symbol 查找项目（兜底：symbol 不是 CoinGecko ID 时使用）
async function getProjectDetailsBySymbol(symbol: string): Promise<CoinGeckoCoinDetail | null> {
  try {
    const searchData = await externalFetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`)
    if (!searchData?.coins?.length) return null
    // 取 symbol 完全匹配的第一个结果
    const match = searchData.coins.find((c: any) => c.symbol?.toUpperCase() === symbol.toUpperCase())
    if (!match?.id) return null
    return getProjectDetails(match.id)
  } catch {
    return null
  }
}

// 格式化链接
function formatLinks(coin: CoinGeckoCoinDetail) {
  const links = { website: '', twitter: '', telegram: '', whitepaper: '', blockchainSite: '' }
  if (!coin.links) return links
  if (coin.links.homepage?.[0]) links.website = coin.links.homepage[0]
  if (coin.links.twitter_screen_name) links.twitter = `https://twitter.com/${coin.links.twitter_screen_name}`
  if (coin.links.telegram_channel_identifier) links.telegram = `https://t.me/${coin.links.telegram_channel_identifier}`
  if (coin.links.whitepaper) links.whitepaper = coin.links.whitepaper
  if (Array.isArray(coin.links.blockchain_site)) {
    const etherscanSite = coin.links.blockchain_site.find(s => s?.includes('etherscan'))
    if (etherscanSite) links.blockchainSite = etherscanSite
  }
  return links
}

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

// 本地兜底：从 projectsDB + 缓存文件中构建项目信息
function getLocalProjectFallback(symbol: string): any {
  const dbInfo = getProjectInfo(symbol)
  if (!dbInfo) return null

  // 尝试从缓存文件获取价格数据
  let price = 0, change24h = 0, marketCap = 0, volume = 0, image = ''
  try {
    const trending = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'coingecko-trending.json'), 'utf-8'))
    if (trending?.coins) {
      for (const c of trending.coins) {
        if (c.item.symbol.toUpperCase() === symbol) {
          price = c.item.data?.price || 0
          change24h = c.item.data?.price_change_percentage_24h?.usd || 0
          marketCap = c.item.data?.market_cap?.usd || 0
          volume = c.item.data?.total_volume?.usd || 0
          image = c.item.large || c.item.thumb || ''
          break
        }
      }
    }
  } catch {}

  return {
    id: symbol.toLowerCase(),
    symbol,
    name: dbInfo.name || symbol,
    image,
    website: dbInfo.website || '',
    twitter: dbInfo.twitter || '',
    telegram: dbInfo.telegram || '',
    whitepaper: dbInfo.whitepaper || '',
    blockchainSite: '',
    genesisDate: '',
    sector: dbInfo.sector || '其他',
    categories: [dbInfo.sector].filter(Boolean),
    description: dbInfo.description || `${dbInfo.name || symbol} 是加密市场热门项目`,
    price,
    priceChange24h: change24h,
    priceChange7d: 0,
    priceChange30d: 0,
    marketCap,
    marketCapRank: 0,
    volume24h: volume,
    circulatingSupply: 0,
    totalSupply: 0,
    maxSupply: undefined,
    circulationRate: 'N/A',
    sentimentUp: 0,
    sentimentDown: 0,
  }
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
        concept = CRYPTO_CONCEPTS.find(c =>
          c.term.toLowerCase() === lowerId ||
          c.aliases.some(a => a.toLowerCase() === lowerId)
        )
      }
      if (!concept) {
        return NextResponse.json({ error: `未找到概念「${conceptId}」的相关信息` }, { status: 404 })
      }
      return NextResponse.json({ type: 'concept', concept, timestamp: Date.now() })
    }

    // 搜索项目或概念
    if (query) {
      const conceptResults = searchConcepts(query)
      const projectResults = await searchProjects(query)
      const filteredProjects = projectResults
        .filter(coin => coin.market_cap_rank)
        .slice(0, 20)

      return NextResponse.json({ type: 'search', results: filteredProjects, concepts: conceptResults, timestamp: Date.now() })
    }

    // 获取项目详情
    if (coinId) {
      // 1. 先按 CoinGecko ID 查找
      let details = await getProjectDetails(coinId)
      
      // 2. 失败则按 symbol 兜底搜索
      if (!details) {
        details = await getProjectDetailsBySymbol(coinId)
      }

      // 3. CoinGecko 全部不可用时，使用本地项目数据库 + 缓存文件兜底
      if (!details) {
        const localFallback = getLocalProjectFallback(coinId.toUpperCase())
        if (localFallback) {
          return NextResponse.json({ type: 'detail', project: localFallback, timestamp: Date.now() })
        }
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const links = formatLinks(details)
      const marketData = details.market_data || {}
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
          website: links.website,
          twitter: links.twitter,
          telegram: links.telegram,
          whitepaper: links.whitepaper,
          blockchainSite: links.blockchainSite,
          genesisDate: details.genesis_date || '',
          sector: getSector(details.categories || []),
          categories: details.categories || [],
          description: details.description?.en?.slice(0, 500) || '',
          price: marketData.current_price?.usd || 0,
          priceChange24h: marketData.price_change_percentage_24h || 0,
          priceChange7d: marketData.price_change_percentage_7d || 0,
          priceChange30d: marketData.price_change_percentage_30d || 0,
          marketCap: marketData.market_cap?.usd || 0,
          marketCapRank: details.market_cap_rank ?? 0,
          volume24h: marketData.total_volume?.usd || 0,
          circulatingSupply: circulating,
          totalSupply: total,
          maxSupply: marketData.max_supply ?? undefined,
          circulationRate: circulationRate,
          sentimentUp: details.sentiment_votes_up_percentage ?? 0,
          sentimentDown: details.sentiment_votes_down_percentage ?? 0,
        },
        timestamp: Date.now()
      })
    }

    return NextResponse.json({ error: 'Missing query parameter: q or id' }, { status: 400 })
  } catch (error) {
    console.error('Project search API error:', error)
    return NextResponse.json({ error: 'Failed to fetch project data' }, { status: 500 })
  }
}
