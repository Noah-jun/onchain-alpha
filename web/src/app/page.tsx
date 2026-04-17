'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import SignalCard from '@/components/SignalCard'
import SignalDetail from '@/components/SignalDetail'
import { fetchMarketData } from '@/lib/marketData'
import { MarketData, Signal, SignalType } from '@/types'
import { CryptoConcept } from '@/lib/concepts'
import { Search, ExternalLink, Globe, MessageCircle, FileText, TrendingUp, Users, DollarSign, PieChart, Clock, Star, X, BookOpen, TrendingDown, ArrowRight } from 'lucide-react'

// 项目搜索结果
interface SearchResult {
  id: string
  name: string
  symbol: string
  thumb: string
  market_cap_rank: number
}

// 概念搜索结果
interface ConceptResult {
  id: string
  term: string
  aliases: string[]
  category: string
  definition: string
}

// 项目详情
interface ProjectDetail {
  id: string
  symbol: string
  name: string
  image: string
  website: string
  twitter: string
  telegram: string
  whitepaper: string
  blockchainSite: string
  genesisDate: string
  sector: string
  categories: string[]
  description: string
  price: number
  priceChange24h: number
  priceChange7d: number
  priceChange30d: number
  marketCap: number
  marketCapRank: number
  volume24h: number
  circulatingSupply: number
  totalSupply: number
  maxSupply: number
  circulationRate: string
  sentimentUp: number
  sentimentDown: number
}

// 热门话题接口
interface TrendingTopic {
  id: string
  name: string
  tweetVolume?: number
  web3Score: number
  categories: string[]
  rank: number
  source: string
}

// 搜索组件
function ProjectSearch({ onSelect, initialQuery = '' }: { onSelect: (coinId: string) => void; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [conceptResults, setConceptResults] = useState<ConceptResult[]>([])

  // 当 initialQuery 改变时自动搜索
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/project-search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
        setConceptResults(data.concepts || [])
        setHasSearched(true)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 500) // 500ms 防抖

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="p-6">
      {/* 搜索框 */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索项目或概念... (如: Bitcoin, RWA, Layer2)"
          className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-lg"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* 搜索结果 */}
      {isSearching && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 mt-2">搜索中...</p>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && conceptResults.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">未找到相关项目或概念</p>
          <p className="text-xs mt-1">试试其他关键词</p>
        </div>
      )}

      {/* 概念搜索结果 */}
      {!isSearching && conceptResults.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-indigo-600 mb-2 font-medium">找到 {conceptResults.length} 个相关概念</p>
          <div className="space-y-2">
            {conceptResults.map((concept) => (
              <div
                key={concept.id}
                onClick={() => onSelect(`concept:${concept.id}`)}
                className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200 hover:border-indigo-400 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-indigo-800">{concept.term}</span>
                    <span className="px-2 py-0.5 bg-indigo-200 text-indigo-700 rounded text-xs">
                      {concept.category}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 mt-0.5 line-clamp-1">
                    {concept.definition.slice(0, 80)}...
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-2">找到 {results.length} 个相关项目</p>
          {results.map((coin) => (
            <div
              key={coin.id}
              onClick={() => onSelect(coin.id)}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors"
            >
              <img src={coin.thumb} alt={coin.name} className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{coin.name}</span>
                  <span className="text-slate-400 text-sm">${coin.symbol.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {coin.market_cap_rank && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                      #{coin.market_cap_rank}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-500">项目搜索</p>
          <p className="text-sm mt-1">输入项目名称查看详情</p>
          <div className="mt-6 text-left bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2">快速搜索：</p>
            <div className="flex flex-wrap gap-2">
              {['Bitcoin', 'RWA', 'Layer2', 'DeFi', 'Memecoin', 'AI+Crypto'].map(name => (
                <button
                  key={name}
                  onClick={() => setQuery(name)}
                  className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-indigo-300"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 热门话题组件
function TrendingTopics({ onSelect, onSearch }: { onSelect: (coinName: string) => void; onSearch: (query: string) => void }) {
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [status, setStatus] = useState<'ok' | 'fallback'>('ok')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/trending', { cache: 'no-store' })
        const data = await res.json()
        
        setTopics(data.topics || [])
        setSources(data.sources || [])
        setStatus(data.status || 'ok')
        if (data.lastUpdate) {
          setLastUpdate(new Date(data.lastUpdate).toLocaleString('zh-CN'))
        }
      } catch (error) {
        console.error('Failed to fetch trending:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrending()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  // 获取所有分类
  const allCategories = Array.from(new Set(topics.flatMap(t => t.categories))).slice(0, 10)
  
  // 过滤话题
  const filteredTopics = activeCategory === 'all' 
    ? topics 
    : topics.filter(t => t.categories.includes(activeCategory))

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            热门话题
          </h2>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          热门话题
        </h2>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <span className="text-xs text-slate-400">
              数据源: {sources.join(', ')}
            </span>
          )}
          {status === 'fallback' && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
              后备数据
            </span>
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索项目..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </form>

      {/* 分类过滤 */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === 'all' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 话题列表 */}
      {filteredTopics.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无热门话题</p>
          <p className="text-xs mt-1">正在从各数据源获取...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTopics.map((topic, index) => (
            <div 
              key={topic.id}
              onClick={() => onSelect(topic.name)}
              className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                {/* 排名 */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  index < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {index + 1}
                </div>
                
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{topic.name}</span>
                    {topic.web3Score >= 5 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-medium">
                        高相关
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                      {topic.source}
                    </span>
                  </div>
                  
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1">
                    {topic.categories.slice(0, 4).map(cat => (
                      <span 
                        key={cat}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* 热度 */}
                <div className="text-right">
                  <div className="flex items-center gap-1 text-slate-500">
                    <TrendingUp className="w-3 h-3" />
                    {topic.tweetVolume ? (
                      <span className="text-xs">{(topic.tweetVolume / 1000000).toFixed(1)}M</span>
                    ) : (
                      <span className="text-xs">TOP {topic.rank}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 提示 */}
      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-xs text-amber-800">
          💡 点击话题或搜索框查看项目详情 · 数据来源：Twitter + CoinGecko搜索（多源聚合）
        </p>
      </div>
    </div>
  )
}

// 概念详情组件
function ConceptView({ conceptId, onBack, onProjectSelect }: { conceptId: string; onBack: () => void; onProjectSelect: (coinId: string) => void }) {
  const [concept, setConcept] = useState<CryptoConcept | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchConcept = async () => {
      setIsLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/project-search?concept=${conceptId}`)
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setConcept(data.concept)
        }
      } catch (err) {
        setError('加载失败')
      } finally {
        setIsLoading(false)
      }
    }
    fetchConcept()
  }, [conceptId])

  if (isLoading) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-slate-500 mb-4 hover:text-slate-700">← 返回搜索</button>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-32 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  if (error || !concept) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-slate-500 mb-4 hover:text-slate-700">← 返回搜索</button>
        <div className="text-center py-12 text-slate-400">
          <p>{error || '概念不存在'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-sm text-slate-500 mb-4 hover:text-slate-700">← 返回搜索</button>
      
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{concept.term}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                {concept.category}
              </span>
              {concept.aliases.length > 0 && (
                <span className="text-xs text-slate-400">
                  {concept.aliases.slice(0, 2).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 什么是xxx */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          什么是 {concept.term}？
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{concept.definition}</p>
      </div>

      {/* 发展状况 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          当前发展状况
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{concept.developmentStatus}</p>
      </div>

      {/* 关键指标 */}
      {concept.keyIndicators && concept.keyIndicators.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            关键指标
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {concept.keyIndicators.map((ind, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{ind.label}</p>
                <p className="text-lg font-semibold text-indigo-600">{ind.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最新趋势 */}
      {concept.trends && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-4">
          <h3 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            最新趋势
          </h3>
          <p className="text-sm text-emerald-700">{concept.trends}</p>
        </div>
      )}

      {/* 代表项目 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-indigo-600" />
          代表项目
        </h3>
        <div className="space-y-3">
          {concept.representativeProjects.map((project, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => onProjectSelect(project.symbol.toLowerCase())}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                {project.symbol.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{project.name}</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                    ${project.symbol.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 项目详情组件
function ProjectDetailView({ coinId, onBack }: { coinId: string; onBack: () => void }) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/project-search?id=${coinId}`)
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setProject(data.project)
        }
      } catch (err) {
        setError('加载失败')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [coinId])

  if (isLoading) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-slate-500 mb-4 hover:text-slate-700">← 返回搜索</button>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-32 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-slate-500 mb-4 hover:text-slate-700">← 返回搜索</button>
        <div className="text-center py-12 text-slate-400">
          <p>{error || '项目不存在'}</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toLocaleString()
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-sm text-slate-500 mb-4 hover:text-slate-700">← 返回</button>
      
      {/* 头部信息 */}
      <div className="flex items-start gap-4 mb-6">
        <img src={project.image} alt={project.name} className="w-16 h-16 rounded-xl" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">{project.name}</h2>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-sm font-medium">
              ${project.symbol}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {project.marketCapRank && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                Rank #{project.marketCapRank}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
              {project.sector}
            </span>
          </div>
        </div>
      </div>

      {/* 价格信息 */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4">
        <div className="text-3xl font-bold text-slate-800 mb-1">
          ${project.price < 1 ? project.price.toFixed(6) : project.price.toLocaleString()}
        </div>
        <div className="flex items-center gap-3">
          <span className={project.priceChange24h >= 0 ? 'text-emerald-600' : 'text-red-500'}>
            {project.priceChange24h >= 0 ? '+' : ''}{project.priceChange24h.toFixed(2)}% (24h)
          </span>
          <span className="text-slate-400 text-sm">
            7d: {project.priceChange7d >= 0 ? '+' : ''}{project.priceChange7d.toFixed(2)}%
          </span>
          <span className="text-slate-400 text-sm">
            30d: {project.priceChange30d >= 0 ? '+' : ''}{project.priceChange30d.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 链接 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.website && (
          <a href={project.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-indigo-300">
            <Globe className="w-3 h-3" /> 官网
          </a>
        )}
        {project.twitter && (
          <a href={project.twitter} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-indigo-300">
            <MessageCircle className="w-3 h-3" /> Twitter
          </a>
        )}
        {project.telegram && (
          <a href={project.telegram} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-indigo-300">
            <MessageCircle className="w-3 h-3" /> Telegram
          </a>
        )}
        {project.whitepaper && (
          <a href={project.whitepaper} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-indigo-300">
            <FileText className="w-3 h-3" /> 白皮书
          </a>
        )}
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-indigo-600" /> 基本信息
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-400">分类</span>
            <p className="text-slate-800">{project.categories?.join(', ') || project.sector}</p>
          </div>
          <div>
            <span className="text-slate-400">创建时间</span>
            <p className="text-slate-800">{project.genesisDate || '未知'}</p>
          </div>
          <div>
            <span className="text-slate-400">公链</span>
            <p className="text-slate-800">{project.blockchainSite ? 'Ethereum' : '其他'}</p>
          </div>
          <div>
            <span className="text-slate-400">概念/赛道</span>
            <p className="text-slate-800">{project.sector}</p>
          </div>
        </div>
      </div>

      {/* 市场数据 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-600" /> 市场数据
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">市值</span>
            <span className="text-slate-800 font-medium">{formatCurrency(project.marketCap)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">24h 交易量</span>
            <span className="text-slate-800">{formatCurrency(project.volume24h)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">流通量</span>
            <span className="text-slate-800">{formatNumber(project.circulatingSupply)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">总供应量</span>
            <span className="text-slate-800">{project.totalSupply ? formatNumber(project.totalSupply) : '无限'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">最大供应量</span>
            <span className="text-slate-800">{project.maxSupply ? formatNumber(project.maxSupply) : '无限'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">流通率</span>
            <span className="text-slate-800">{project.circulationRate}%</span>
          </div>
        </div>
      </div>

      {/* 社区情绪 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" /> 社区情绪
        </h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <span className="text-emerald-600 text-2xl font-bold">{project.sentimentUp || 0}%</span>
            <p className="text-xs text-slate-400 mt-1">看好</p>
          </div>
          <div className="flex-1">
            <span className="text-red-500 text-2xl font-bold">{project.sentimentDown || 0}%</span>
            <p className="text-xs text-slate-400 mt-1">看跌</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 主页面组件
export default function Home() {
  const [activeTab, setActiveTab] = useState<'signals' | 'research'>('signals')
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null)
  const [activeFilters, setActiveFilters] = useState<SignalType[]>([])
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [signals, setSignals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [researchView, setResearchView] = useState<'trending' | 'search' | 'detail'>('trending')
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [market, signalData] = await Promise.all([
          fetchMarketData(),
          getAllSignals()
        ])
        setMarketData(market)
        setSignals(signalData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleProjectSelect = (coinId: string) => {
    setSelectedCoinId(coinId)
    setResearchView('detail')
  }

  const handleTrendingSelect = (name: string) => {
    setSearchQuery(name)
    setResearchView('search')
  }

  const handleBackToTrending = () => {
    setResearchView('trending')
    setSelectedCoinId(null)
    setSearchQuery('')
  }

  // 计算过滤后的信号
  const filteredSignals = activeFilters.length === 0
    ? signals
    : signals.filter((s: any) => activeFilters.includes(s.type))

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header
        marketData={activeTab === 'signals' ? (marketData || undefined) : undefined}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isLoading={isLoading}
        showMarketBar={activeTab === 'signals'}
      />

      {activeTab === 'signals' && (
        <main className="flex-1 flex">
          <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">筛选:</span>
                <button
                  onClick={() => setActiveFilters([])}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeFilters.length === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  全部
                </button>
                <button onClick={() => setActiveFilters(['anomaly'])} className={`px-3 py-1 rounded-full text-xs transition-colors ${activeFilters.includes('anomaly') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  异常波动
                </button>
                <button onClick={() => setActiveFilters(['whale'])} className={`px-3 py-1 rounded-full text-xs transition-colors ${activeFilters.includes('whale') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  巨鲸转账
                </button>
                <button onClick={() => setActiveFilters(['funding'])} className={`px-3 py-1 rounded-full text-xs transition-colors ${activeFilters.includes('funding') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  资金费率
                </button>
                <button onClick={() => setActiveFilters(['liquidation'])} className={`px-3 py-1 rounded-full text-xs transition-colors ${activeFilters.includes('liquidation') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  大额清算
                </button>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                实时推送中...
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin bg-slate-50/50">
              {filteredSignals.length === 0 && !isLoading && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">暂无信号数据</p>
                  <p className="text-xs mt-1">正在从各数据源获取...</p>
                </div>
              )}
              
              {filteredSignals.map(signal => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onClick={() => setSelectedSignal(signal)}
                />
              ))}

              {filteredSignals.length === 0 && isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-1/3" />
                          <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-96 bg-white flex flex-col">
            <SignalDetail signal={selectedSignal} />
          </div>
        </main>
      )}

      {activeTab === 'research' && (
        <main className="flex-1 flex bg-slate-50">
          <div className="flex-1 overflow-y-auto">
            {researchView === 'trending' && (
              <TrendingTopics onSelect={handleTrendingSelect} onSearch={handleTrendingSelect} />
            )}
            {researchView === 'search' && (
              <ProjectSearch onSelect={handleProjectSelect} initialQuery={searchQuery} />
            )}
            {researchView === 'detail' && selectedCoinId && (
              selectedCoinId.startsWith('concept:') 
                ? <ConceptView conceptId={selectedCoinId.replace('concept:', '')} onBack={handleBackToTrending} onProjectSelect={handleProjectSelect} />
                : <ProjectDetailView coinId={selectedCoinId} onBack={handleBackToTrending} />
            )}
          </div>
        </main>
      )}
    </div>
  )
}

// 辅助函数：获取所有信号
async function getAllSignals(): Promise<any[]> {
  try {
    const [fundingRes, liquidationRes, anomalyRes, whaleRes] = await Promise.all([
      fetch('/api/funding-rates', { cache: 'no-store' }),
      fetch('/api/liquidations', { cache: 'no-store' }),
      fetch('/api/anomalies', { cache: 'no-store' }),
      fetch('/api/whales', { cache: 'no-store' })
    ])
    
    const fundingData = await fundingRes.json()
    const liquidationData = await liquidationRes.json()
    const anomalyData = await anomalyRes.json()
    const whaleData = await whaleRes.json()
    
    const now = Date.now()
    
    const fundingSignals = (fundingData.signals || []).map((s: any, index: number) => ({
      id: `funding-${s.symbol}-${index}`,
      type: 'funding',
      riskLevel: Math.abs(s.rate) > 0.5 ? 'high' : Math.abs(s.rate) > 0.15 ? 'medium' : 'low',
      timestamp: now - index * 60000,
      chain: 'Ethereum',
      exchange: s.exchange,
      symbol: s.symbol,
      rate: s.rate,
      nextFundingTime: s.nextFundingTime || 0,
      oiChange: 0,
      longShortRatio: 0.5
    }))
    
    const liquidationSignals = (liquidationData.signals || []).map((s: any) => ({
      id: s.id,
      type: 'liquidation',
      riskLevel: s.totalValue > 100000 ? 'high' : s.totalValue > 10000 ? 'medium' : 'low',
      timestamp: s.time,
      chain: 'Ethereum',
      platform: s.exchange,
      amount: s.quantity,
      amountUsd: s.totalValue,
      symbol: s.symbol,
      side: s.side || 'long',
      priceImpact: 0,
      txHash: ''
    }))
    
    const anomalySignals = (anomalyData.signals || []).map((s: any, index: number) => {
      const change1h = s.change1h || 0
      const change24h = s.change24h || 0
      
      return {
        id: `anomaly-${s.id}`,
        type: 'anomaly',
        riskLevel: Math.abs(change1h) > 15 ? 'high' : 
                   Math.abs(change1h) > 6 ? 'medium' : 'low',
        timestamp: now - index * 30000,
        chain: 'Ethereum',
        symbol: s.symbol,
        icon: s.symbol.charAt(0),
        price: s.price,
        change5m: change1h,
        change24h: change24h,
        volumeChange: change24h,
        volume: s.volume || 0,
        marketCap: s.marketCap || 0,
        description: `${s.name} 出现异常波动`,
        tags: ['isolated']
      }
    })
    
    const whaleSignals = (whaleData.signals || []).map((s: any) => ({
      id: s.id,
      type: 'whale',
      riskLevel: s.amountUsd > 5000000 ? 'high' : s.amountUsd > 1000000 ? 'medium' : 'low',
      timestamp: s.timestamp,
      chain: 'Ethereum',
      fromLabel: s.fromLabel,
      toLabel: s.toLabel,
      direction: s.direction,
      amount: s.amount,
      amountUsd: s.amountUsd,
      symbol: s.symbol
    }))
    
    return [...fundingSignals, ...liquidationSignals, ...anomalySignals, ...whaleSignals]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
  } catch (error) {
    console.error('Failed to fetch real signals:', error)
    return []
  }
}
