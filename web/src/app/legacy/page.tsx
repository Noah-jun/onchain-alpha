'use client'

import React, { useState, useEffect, useCallback } from 'react'

import Header from '@/components/Header'

import SignalCard from '@/components/SignalCard'
import V4WalletPanel from '@/components/V4WalletPanel'

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

              onClick={() => onSelect(coin.symbol)}

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
  const [items, setItems] = useState<any[]>([])
  const [current, setCurrent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIntel, setSelectedIntel] = useState<any>(null)
  const [showAllHours, setShowAllHours] = useState(false)

  // 获取小时情报数据（含自动刷新）
  const fetchIntel = useCallback(async () => {
    const [listData, currentData] = await Promise.all([
      fetch('/api/hourly-intel?mode=list').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/hourly-intel').then(r => r.json()).catch(() => null),
    ])
    // 合并缓存文件 + recentHours（确保至少展示12条）
    const cacheItems = listData.items || []
    const recentItems = (currentData?.recentHours || []).map((h: any, i: number) => ({
      ...h,
      hourKey: `${h.date}-${String(h.hour || i).replace(':', '')}`,
      hourLabel: h.hour,
    }))
    const merged = [...cacheItems]
    for (const r of recentItems) {
      if (!merged.find((m: any) => m.hourKey === r.hourKey)) merged.push(r)
    }
    // 去重后按时间倒序
    merged.sort((a: any, b: any) => ((b.hourKey || '') > (a.hourKey || '') ? 1 : -1))
    setItems(merged)
    setCurrent(currentData)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchIntel()
    // 每 60 秒自动刷新，确保新小时数据及时展示
    const interval = setInterval(fetchIntel, 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchIntel])

  // 关闭右侧面板
  const closePanel = () => setSelectedIntel(null)

  // 渲染右侧情报详情面板
  const IntelDetailPanel = ({ data, onClose }: { data: any; onClose: () => void }) => {
    const r = data
    const fmt = (n: number) => n >= 0 ? '+' + n.toFixed(1) + '%' : n.toFixed(1) + '%'

    return (
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto animate-slide-in">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="font-bold text-slate-800">📡 {r.hour || ''} 情报</p>
            <p className="text-[10px] text-slate-500">{r.date} | {r.period}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div className="p-5 space-y-4">

          {/* 摘要 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
            <div className="flex justify-between text-xs">
              <span>新增 <strong>{r.summary?.totalItems || '?'}</strong></span>
              <span>高优先 <strong className="text-amber-600">{r.summary?.highPriority || '?'}</strong></span>
              {r.summary?.topSymbol && <span>热门 <strong className="text-indigo-600">{r.summary.topSymbol}</strong></span>}
            </div>
          </div>

          {/* 价格异动 */}
          {r.priceAnomalies?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-red-500 mb-3">🚨 价格异动</p>
              <div className="space-y-3">
                {r.priceAnomalies.map((a: any, i: number) => (
                  <div key={i} className="text-xs border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{a.symbol}</span>
                      <span className={a.change24h >= 0 ? 'text-emerald-600 font-mono' : 'text-red-500 font-mono'}>{fmt(a.change24h)} (24h)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      {a.oi && <span>OI {a.oi}</span>}
                      {a.volumeRatio && <span>量{a.volumeRatio}</span>}
                      {a.tags?.length > 0 && a.tags.map((t: string, j: number) => <span key={j} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{t}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 重点信息 */}
          {r.keyInfo?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-indigo-600 mb-3">⭐ 重点信息</p>
              <div className="space-y-3">
                {r.keyInfo.map((k: any, i: number) => (
                  <div key={i} className="text-xs">
                    <p className="text-slate-800 font-medium leading-relaxed">{k.rank}. {k.title}</p>
                    {k.tags?.length > 0 && <p className="text-[10px] text-slate-400 mt-0.5">{k.tags.map((t: string) => '[' + t + ']').join(' ')}</p>}
                    {k.sources?.length > 0 && <div className="text-[10px] text-indigo-500 mt-0.5">{k.sources.map((s: any, j: number) => s.url ? <a key={j} href={s.url} target="_blank" className="hover:underline mr-2">{s.name}</a> : <span key={j} className="mr-2">{s.name}</span>)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 研判分析 */}
          {r.analysis?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-amber-600 mb-3">🧠 研判与分析</p>
              <div className="space-y-2">
                {r.analysis.map((a: any, i: number) => (
                  <div key={i} className="text-xs flex items-start gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 shrink-0 mt-0.5">{a.type || '分析'}</span>
                    <div>
                      <span className="text-slate-700">{a.content}</span>
                      {a.source?.url && <a href={a.source.url} target="_blank" className="text-indigo-500 ml-1 hover:underline text-[10px]">[{a.source.name}]</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Watchlist */}
          {r.watchlist?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-emerald-600 mb-3">👀 Watchlist</p>
              <div className="space-y-2">
                {r.watchlist.map((w: any, i: number) => (
                  <div key={i} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <div>
                      <span>{w.title}</span>
                      {w.tags?.length > 0 && <span className="text-slate-400 ml-1">{w.tags.map((t: string) => '[' + t + ']').join(' ')}</span>}
                      {w.source?.url && <a href={w.source.url} target="_blank" className="text-indigo-500 ml-1 hover:underline text-[10px]">[{w.source.name}]</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 叙事温度 */}
          {r.narrativeTemp?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-purple-600 mb-3">🧩 叙事温度</p>
              <div className="space-y-2">
                {r.narrativeTemp.map((n: any, i: number) => (
                  <div key={i} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className={'font-medium shrink-0 ' + (n.trend === '升温' ? 'text-red-500' : 'text-blue-500')}>[{n.trend}]</span>
                    <div>
                      <span>{n.title}</span>
                      {n.source?.url && <a href={n.source.url} target="_blank" className="text-indigo-500 ml-1 hover:underline text-[10px]">[{n.source.name}]</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 数据源 */}
          <div className="bg-slate-50 rounded-xl p-3 text-[10px] text-slate-400">
            <p>数据来源：{(r.sources || ['Cryptocompare', 'Hyperliquid', 'Odaily', 'DeepSeek AI']).join(' · ')}</p>
            <p className="mt-0.5">生成时间：{new Date(r.generatedAt).toLocaleString('zh-CN')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}</div>

  return (
    <div className="relative h-full">
      {/* 主体列表 */}
      <div className="p-6">
        {/* 当前小时情报横幅 */}
        {current && <div onClick={() => setSelectedIntel(current)} className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 mb-4 cursor-pointer hover:from-indigo-600 hover:to-purple-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-bold text-lg">📡 {current.hour || '最新'} 情报</p>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-[10px]">最新</span>
          </div>
          <p className="text-indigo-100 text-xs">{current.date} | {current.period}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-indigo-100 text-[10px]">新增 {(current.summary?.totalItems || 0)}</span>
            <span className="text-amber-200 text-[10px]">高优先 {(current.summary?.highPriority || 0)}</span>
            {current.summary?.topSymbol && <span className="text-emerald-200 text-[10px]">热门: {current.summary.topSymbol}</span>}
          </div>
        </div>}

        {/* 历史情报列表 */}
        {items.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">🕐 历史情报</p>
            <div className="space-y-2">
              {(showAllHours ? items : items.slice(0, 3)).map((item: any, i: number) => (
                <div key={item.hourKey || i} onClick={() => setSelectedIntel(item)} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 cursor-pointer transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">📡 {item.hourLabel || '整点情报'}</span>
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-[10px] text-slate-500">
                    <span>新增 {(item.summary?.totalItems || 0)}</span>
                    <span>高优先 {(item.summary?.highPriority || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
            {!showAllHours && items.length > 3 && (
              <button
                onClick={() => setShowAllHours(true)}
                className="w-full mt-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5"
              >
                加载更多（共 {items.length} 条） <span className="text-indigo-400">↓</span>
              </button>
            )}
          </div>
        )}

        {!current && items.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <span className="text-4xl mb-3 block">⏰</span>
            <p className="text-sm">暂无情报数据</p>
            <p className="text-xs mt-1">AI 正在生成当前小时情报...</p>
          </div>
        )}
      </div>

      {/* 右侧滑出面板 */}
      {selectedIntel && <IntelDetailPanel data={selectedIntel} onClose={closePanel} />}

      {/* 遮罩层 */}
      {selectedIntel && <div className="fixed inset-0 bg-black/20 z-40" onClick={closePanel} />}

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
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

  const [extendedData, setExtendedData] = useState<any>(null)

  const [aiResearch, setAiResearch] = useState<any>(null)

  const [aiLoading, setAiLoading] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  const [error, setError] = useState('')

  useEffect(() => {

    const fetchProject = async () => {

      setIsLoading(true)

      setError('')

      setAiResearch(null)

      const symbol = coinId.toUpperCase()

      try {

        const [res, detailRes] = await Promise.all([

          fetch(`/api/project-search?id=${coinId}`),

          fetch(`/api/project-detail?symbol=${symbol}`),

        ])

        const data = await res.json()

        const detail = await detailRes.json()

        if (data.error) {

          setError(data.error)

        } else {

          setProject(data.project)

          if (detail && !detail.error) setExtendedData(detail)

          // 如果团队或融资信息缺失，用 AI 搜索补充
          const teamEmpty = !detail?.team?.length && !data.project?.team?.length
          const fundingEmpty = !detail?.funding?.length
          if (teamEmpty || fundingEmpty) {
            setAiLoading(true)
            fetch(`/api/ai-project-detail?symbol=${symbol}`).then(r => r.json()).then(ai => {
              if (ai?.people?.team?.length || ai?.people?.vcs?.length) {
                setAiResearch(ai.people)
              }
              setAiLoading(false)
            }).catch(() => setAiLoading(false))
          }
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

      {/* 团队信息：数据库数据 → AI搜索数据 兜底 */}

      {(() => {

        const teamMembers = (extendedData?.team?.length > 0) ? extendedData.team : (aiResearch?.team || [])

        const hasTeam = teamMembers.length > 0

        return (hasTeam || aiLoading) ? (

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">

            <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">

              <Users className="w-4 h-4 text-indigo-600" /> 核心团队

              {aiLoading && <span className="ml-auto text-[10px] text-indigo-500 font-normal flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />AI搜索中</span>}

              {(!extendedData?.team?.length && aiResearch?.team?.length) && <span className="ml-auto text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">AI搜索</span>}

            </h3>

            <div className="space-y-3">

              {teamMembers.map((member: any, i: number) => (

                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">

                  {/* 头像占位 */}

                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">

                    {(member.name?.charAt(0) || member.charAt(0) || '?').toUpperCase()}

                  </div>

                  <div className="flex-1 min-w-0">

                    <div className="flex items-center justify-between gap-2">

                      <span className="text-sm font-medium text-slate-800">{member.name}</span>

                      <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">{member.role}</span>

                    </div>

                    {member.twitter && (

                      <a href={`https://twitter.com/${member.twitter.replace('https://twitter.com/', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-500 hover:underline mt-0.5 inline-block">

                        🐦 @{member.twitter.replace('https://twitter.com/', '')}

                      </a>

                    )}

                    {member.background && (

                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{member.background}</p>

                    )}

                  </div>

                </div>

              ))}

              {!hasTeam && aiLoading && (

                <div className="text-center py-4">

                  <div className="inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />

                  <p className="text-xs text-slate-400 mt-2">AI正在搜索团队信息...</p>

                </div>

              )}

            </div>

          </div>

        ) : null

      })()}

      {/* 融资信息：数据库数据 → AI搜索数据 兜底 */}

      {(() => {

        const fundingRounds = (extendedData?.funding?.length > 0) ? extendedData.funding : (() => {
          if (!aiResearch?.vcs?.length) return []
          return [{ round: '融资', amount: '', date: '', investors: aiResearch.vcs }]
        })()

        const hasFunding = fundingRounds.length > 0

        return (hasFunding || aiLoading) ? (

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">

            <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">

              <DollarSign className="w-4 h-4 text-indigo-600" /> 融资情况

              {aiLoading && <span className="ml-auto text-[10px] text-indigo-500 font-normal flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />AI搜索中</span>}

              {(!extendedData?.funding?.length && aiResearch?.vcs?.length) && <span className="ml-auto text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">AI搜索</span>}

            </h3>

            <div className="space-y-3">

              {fundingRounds.map((round: any, i: number) => (

                <div key={i} className="p-3 bg-slate-50 rounded-lg">

                  <div className="flex items-center justify-between mb-1">

                    <span className="text-sm font-medium text-slate-800">{round.round}</span>

                    {round.amount && <span className="text-sm font-bold text-indigo-600">{round.amount}</span>}

                  </div>

                  {round.date && <p className="text-xs text-slate-400 mb-1">📅 {round.date}</p>}

                  {round.investors?.length > 0 && (

                    <div className="flex flex-wrap gap-1 mt-1">

                      <span className="text-[10px] text-slate-400 mr-1">领投/参投:</span>

                      {round.investors.map((inv: string, j: number) => (

                        <span key={j} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px]">{inv}</span>

                      ))}

                    </div>

                  )}

                </div>

              ))}

              {!hasFunding && aiLoading && (

                <div className="text-center py-4">

                  <div className="inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />

                  <p className="text-xs text-slate-400 mt-2">AI正在搜索融资信息...</p>

                </div>

              )}

            </div>

          </div>

        ) : null

      })()}

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

function ProjectQuickView({ symbol, onBack }: { symbol: string; onBack: () => void }) {
  // 实时数据（毫秒级加载）
  const [realtime, setRealtime] = useState<any>({ price: null, change24h: null, volume24h: null, tvl: null })
  const [realtimeLoading, setRealtimeLoading] = useState(true)
  // AI 快速概览（5-10s 后台加载）
  const [aiQuick, setAiQuick] = useState<any>(null)
  const [aiQuickLoading, setAiQuickLoading] = useState(true)
  // AI 深度报告（点击触发，15-20s）
  const [deep, setDeep] = useState<any>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepExpanded, setDeepExpanded] = useState(false)
  // 加载进度指示器
  const [loadProgress, setLoadProgress] = useState(0)

  useEffect(() => {
    const up = symbol.toUpperCase()

    // 1. 实时数据 - 立即加载（毫秒级）
    fetch(`/api/project-detail?symbol=${up}`).then(r => r.json()).then(d => {
      if (!d.error) setRealtime({ price: d.price, change24h: d.change24h, volume24h: d.volume24h, tvl: d.tvl, name: d.name, sector: d.sector, chain: d.chain, website: d.website, twitter: d.twitter, tgeStatus: d.tgeStatus, team: d.team, funding: d.funding })
      setRealtimeLoading(false)
    }).catch(() => setRealtimeLoading(false))

    // 2. AI 快速概览 - 后台加载（5-10s）
    fetch(`/api/ai-project-detail?symbol=${up}`).then(r => r.json()).then(d => {
      if (!d.error && d.depth === 'quick') setAiQuick(d)
      setAiQuickLoading(false)
    }).catch(() => setAiQuickLoading(false))
  }, [symbol])

  // Layer1 → Layer2 进度动画
  useEffect(() => {
    if (aiQuickLoading && !realtimeLoading) {
      setLoadProgress(0)
      const startTime = Date.now()
      const targetMs = 9000 // 目标 9 秒到 90%
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime
        const pct = Math.min(90, (elapsed / targetMs) * 90)
        setLoadProgress(pct)
      }, 100)
      return () => clearInterval(timer)
    }
    if (!aiQuickLoading) setLoadProgress(100)
  }, [aiQuickLoading, realtimeLoading])

  const loadDeep = async () => {
    if (deep) { setDeepExpanded(true); return }
    setDeepLoading(true); setDeepExpanded(true)
    try {
      const res = await fetch(`/api/ai-project-detail?symbol=${symbol.toUpperCase()}&depth=deep`, { cache: 'no-store' })
      const d = await res.json()
      if (!d.error && d.depth === 'deep') setDeep(d)
    } catch {} finally { setDeepLoading(false) }
  }

  // 实时数据还没到 -> 骨架屏
  if (realtimeLoading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}</div>

  const rt = realtime
  const aq = aiQuick
  const ov = aq?.overview || {}
  const pb = aq?.problem || {}
  const pd = aq?.product || {}
  const tk = aq?.token || {}
  const pp = aq?.people || {}
  const rk = aq?.risk || {}
  const allSources = aq?.sources || ['Cryptocompare', 'DeFiLlama']

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-sm text-slate-500 mb-4 hover:text-slate-700 flex items-center gap-1">← 返回</button>

      {/* ===== HERO（实时数据，即时展示） ===== */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-2xl font-bold text-slate-900">{rt.name || symbol}</span>
              <span className="text-slate-400 text-sm font-mono">{symbol}</span>
              {rt.tgeStatus && <span className={"px-2.5 py-1 rounded-full text-xs font-medium " + (rt.tgeStatus === '未发币' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{rt.tgeStatus}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-medium">{rt.sector || ov.sector || '其他'}</span>
              {(rt.chain || ov.chain) && <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-xs">{rt.chain || ov.chain}</span>}
            </div>
          </div>
          {rt.price > 0 && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold font-mono text-slate-900">{'$'}{(rt.price < 0.01 ? rt.price.toFixed(6) : rt.price.toLocaleString())}</p>
              <p className={"text-sm font-mono " + (rt.change24h >= 0 ? 'text-emerald-600' : 'text-red-500')}>{rt.change24h >= 0 ? '+' : ''}{rt.change24h?.toFixed(2)}%</p>
            </div>
          )}
        </div>
        {ov.oneLiner && <p className="text-sm text-slate-700 leading-relaxed mb-4 border-t border-slate-100 pt-4">{ov.oneLiner}</p>}
        {[rt.website, rt.twitter].some(Boolean) && (
          <div className="flex flex-wrap gap-1.5">
            {rt.website && <a href={rt.website} target="_blank" className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-600 hover:bg-indigo-50 transition-colors">🌐 官网</a>}
            {rt.twitter && <a href={rt.twitter} target="_blank" className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-600 hover:bg-sky-50 transition-colors">🐦 Twitter</a>}
          </div>
        )}
      </div>

      {/* ===== 实时数据仪表板（即时展示） ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {rt.price > 0 && <MetricCard label="价格" value={'$' + (rt.price < 0.01 ? rt.price.toFixed(6) : rt.price.toLocaleString())} subtitle={(rt.change24h || 0) >= 0 ? '+' + rt.change24h?.toFixed(2) + '%' : rt.change24h?.toFixed(2) + '%'} />}
        <MetricCard label="24h成交量" value={rt.volume24h ? fmtUSD(rt.volume24h) : '—'} />
        <MetricCard label="TVL" value={rt.tvl ? fmtUSD(rt.tvl) : '—'} />
        <MetricCard label="团队" value={rt.team?.length ? rt.team.length + ' 人' : '—'} subtitle={rt.funding?.length ? rt.funding.length + ' 轮融资' : ''} />
      </div>

      {/* ===== AI 加载进度条 ===== */}
      {aiQuickLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-600">更多信息加载中</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{Math.round(loadProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: loadProgress + '%' }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">AI 正在生成6维投研概览（预计5-10秒）...</p>
        </div>
      )}

      {!aiQuickLoading && !aq && (
        <div className="text-center py-6 text-slate-400 bg-white rounded-xl border border-slate-200 mb-4">
          <p className="text-xs">AI 分析暂不可用，请稍后重试</p>
        </div>
      )}

      {aq && (
        <div className="space-y-3 mb-4">
          {/* Project */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">📌 Project 是什么</h3>
            <p className="text-xs text-slate-700 leading-relaxed">{pd.description || ov.oneLiner || '暂无数据'}</p>
          </div>

          {/* Problem */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">❗ Problem 为什么存在</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {pb.painPoint && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">痛点</span><span className="text-slate-700">{pb.painPoint}</span></div>}
              {pb.advantage && <div className="bg-indigo-50 rounded-lg p-3"><span className="text-indigo-600 font-medium block mb-0.5">核心优势</span><span className="text-indigo-700">{pb.advantage}</span></div>}
              {!pb.painPoint && !pb.advantage && <p className="text-slate-400">暂无数据</p>}
            </div>
          </div>

          {/* Product */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">📊 Product 有没有人用</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <MetricCard label="TVL" value={pd.tvl ? fmtUSD(pd.tvl) : rt.tvl ? fmtUSD(rt.tvl) : '—'} />
              <MetricCard label="Volume" value={pd.volume24h ? fmtUSD(pd.volume24h) : rt.volume24h ? fmtUSD(rt.volume24h) : '—'} />
              <MetricCard label="DAU" value={pd.dailyActiveUsers ? fmtNum(pd.dailyActiveUsers) : '—'} />
            </div>
            {pd.description && <p className="text-xs text-slate-600 leading-relaxed">{pd.description}</p>}
          </div>

          {/* Token */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">🪙 Token 币值逻辑</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {tk.utility && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">Token 功能</span><span className="text-slate-700">{tk.utility}</span></div>}
              {tk.supply && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">供给结构</span><span className="text-slate-700">{tk.supply}</span></div>}
              {tk.fdv && <MetricCard label="FDV" value={fmtUSD(tk.fdv)} />}
              {tk.unlockRisk && <div className="bg-amber-50 rounded-lg p-3"><span className="text-amber-600 font-medium block mb-0.5">解锁风险</span><span className="text-amber-700">{tk.unlockRisk}</span></div>}
            </div>
          </div>

          {/* People */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">👥 People 谁在做</h3>
            {(pp.team?.length || rt.team?.length) ? (
              <div className="mb-3">
                <h4 className="text-[10px] text-slate-400 font-medium mb-2">团队</h4>
                <div className="space-y-2">
                  {(pp.team?.length ? pp.team : rt.team).map((m: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-0.5"><span className="text-xs font-medium text-slate-700">{m.name || m}</span><span className="text-[10px] text-indigo-600 font-medium">{m.role || ''}</span></div>
                      {m.background && <p className="text-[10px] text-slate-400 leading-relaxed">{m.background}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {(pp.vcs?.length || rt.funding?.length > 0) && (
              <div>
                <h4 className="text-[10px] text-slate-400 font-medium mb-2">投资机构</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(pp.vcs?.length ? pp.vcs : [...new Set((rt.funding || []).flatMap((f: any) => f.investors || []))]).map((v: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px]">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {!pp.team?.length && !rt.team?.length && !pp.vcs?.length && !rt.funding?.length && <p className="text-xs text-slate-400">暂无数据</p>}
          </div>

          {/* Risk */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">⚠️ Risk 怎么死</h3>
            {rk.level && <div className="flex items-center gap-2 mb-3"><span className="text-xs text-slate-500">综合风险</span><span className={"text-xs font-bold px-2.5 py-1 rounded-full " + (rk.level === '低' ? 'bg-emerald-100 text-emerald-700' : rk.level === '中' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>{rk.level}</span></div>}
            <div className="grid grid-cols-1 gap-2 text-xs">
              {rk.tech && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><span className="text-amber-800 font-medium block mb-0.5">技术风险</span><span className="text-amber-700">{rk.tech}</span></div>}
              {rk.regulatory && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><span className="text-amber-800 font-medium block mb-0.5">监管风险</span><span className="text-amber-700">{rk.regulatory}</span></div>}
              {rk.competition && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><span className="text-amber-800 font-medium block mb-0.5">竞争风险</span><span className="text-amber-700">{rk.competition}</span></div>}
              {!rk.tech && !rk.regulatory && !rk.competition && <p className="text-slate-400">暂无数据</p>}
            </div>
          </div>
        </div>
      )}

      {/* ===== AI 深度分析按钮 ===== */}
      <div className="mb-4">
        <button
          onClick={loadDeep}
          disabled={deepLoading}
          className={"w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 " + (deepLoading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : deepExpanded && deep ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-sm')}
        >
          {deepLoading ? (
            <><span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> AI 深度研究生成中（约15-20s）...</>
          ) : deepExpanded && deep ? (
            <><span>🔼 收起深度研究</span></>
          ) : (
            <><span>🤖 AI深度解读</span><span className="text-xs opacity-75">15-20s</span></>
          )}
        </button>
      </div>

      {/* ===== 深度报告 ===== */}
      {deepExpanded && (deepLoading || deep) && (
        <div className="border-t-2 border-indigo-100 pt-4 mb-4">
          {deepLoading && !deep && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-500">AI 正在生成机构级投研报告...</p>
            </div>
          )}
          {deep && <AiReportView report={deep.report} news={deep.news} sources={deep.sources} />}
        </div>
      )}

      {/* 数据源 */}
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-[10px] text-slate-400">数据来源：{allSources.join(' · ')}{deep ? ' · DeepSeek AI 深度报告' : aiQuickLoading ? '' : ' · DeepSeek AI'}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{aq ? 'AI分析时间：' + new Date(aq.generatedAt).toLocaleString('zh-CN') : '实时数据（毫秒级）'}</p>
      </div>
    </div>
  )
}

function AiReportView({ report, news, sources }: { report: any; news?: string[]; sources?: string[] }) {

  if (!report?.summary?.overview?.oneLiner) return null

  const s = report.summary

  const nav = report.narrative

  const prod = report.product

  const tok = report.tokenomics

  const oc = report.onchain

  const team = report.team

  const risk = report.risk

  const conc = report.conclusion

  const ratingColors: Record<string, string> = {

    'Strong Buy': 'bg-emerald-100 text-emerald-800 border-emerald-300',

    'Watchlist': 'bg-indigo-100 text-indigo-800 border-indigo-300',

    'Neutral': 'bg-amber-100 text-amber-800 border-amber-300',

    'Avoid': 'bg-red-100 text-red-800 border-red-300',

  }

  const riskColors: Record<string, string> = {

    '低': 'bg-emerald-100 text-emerald-700', '中': 'bg-amber-100 text-amber-700', '高': 'bg-red-100 text-red-700',

  }

  const levelColors: Record<string, string> = {

    'Strong Buy': 'from-emerald-500 to-green-600', 'Watchlist': 'from-indigo-500 to-purple-600', 'Neutral': 'from-amber-400 to-orange-500', 'Avoid': 'from-red-500 to-rose-600',

  }

  const ScoreBar = ({ label, score, maxScore = 10 }: { label: string; score?: number; maxScore?: number }) => {

    if (score == null) return null

    const pct = (score / maxScore) * 100

    const c = pct >= 80 ? 'text-emerald-600 bg-emerald-500' : pct >= 60 ? 'text-indigo-600 bg-indigo-500' : pct >= 40 ? 'text-amber-600 bg-amber-500' : 'text-red-600 bg-red-500'

    return <div className="mb-2"><div className="flex justify-between text-xs mb-0.5"><span className="text-slate-600">{label}</span><span className={`font-bold font-mono ${c.split(' ')[0]}`}>{score}/{maxScore}</span></div><div className="bg-slate-100 rounded-full h-1.5"><div className={`${c.split(' ')[1]} h-full rounded-full transition-all`} style={{ width: pct + '%' }} /></div></div>

  }

  const InfoBlock = ({ title, children }: { title?: string; children: React.ReactNode }) => (

    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">{title && <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>}{children}</div>

  )

  const RiskyBlock = ({ children }: { children: React.ReactNode }) => (

    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">{children}</div>

  )

  return (

    <div>

      <div className="flex items-center gap-2 mb-4">

        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">🤖 AI深度报告</span>

        <span className="text-[10px] text-slate-400">· 约15-20s生成</span>

      </div>

      {/* 评级摘要 */}

      <InfoBlock>

        <div className="flex items-center justify-between mb-3">

          <div><p className="text-xs text-slate-500">最终研究评级</p><p className={`text-xl font-bold ${conc.rating === 'Strong Buy' ? 'text-emerald-600' : conc.rating === 'Watchlist' ? 'text-indigo-600' : conc.rating === 'Neutral' ? 'text-amber-600' : 'text-red-600'}`}>{conc.rating}</p></div>

          {conc.finalScore && <div className="text-right"><p className="text-xs text-slate-500">综合评分</p><p className={`text-2xl font-bold font-mono ${(conc.finalScore || 0) >= 80 ? 'text-emerald-600' : (conc.finalScore || 0) >= 60 ? 'text-indigo-600' : (conc.finalScore || 0) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{conc.finalScore}</p></div>}

          {risk.level && <div className="text-right"><p className="text-xs text-slate-500">风险等级</p><p className={`text-sm font-bold px-2.5 py-1 rounded-full inline-block ${riskColors[risk.level] || 'bg-slate-100 text-slate-600'}`}>{risk.level}</p></div>}

        </div>

        <div className="grid grid-cols-2 gap-x-4">

          <ScoreBar label="Narrative 强度" score={nav.score} />

          <ScoreBar label="PMF 可能性" score={prod.pmfScore} />

          <ScoreBar label="技术壁垒" score={prod.techMoatScore} />

          <ScoreBar label="Token 价值捕获" score={tok.score} />

          <ScoreBar label="增长质量" score={oc.score} />

          <ScoreBar label="团队执行力" score={team.score} />

        </div>

      </InfoBlock>

      {/* 1. 项目概览 */}

      <InfoBlock title="📋 1. 项目概览">

        <div className="grid grid-cols-2 gap-3 text-xs mb-3">

          <div><span className="text-slate-400">解决问题</span><p className="text-slate-700 mt-0.5">{s.overview.problemSolved || '—'}</p></div>

          <div><span className="text-slate-400">目标用户</span><p className="text-slate-700 mt-0.5">{s.overview.targetUsers || '—'}</p></div>

          <div><span className="text-slate-400">所属赛道</span><p className="text-slate-700 mt-0.5">{s.overview.sector || '—'}</p></div>

          <div><span className="text-slate-400">公链</span><p className="text-slate-700 mt-0.5">{s.overview.chain || '—'}</p></div>

        </div>

        {s.overview.coreProducts?.length > 0 && (

          <div><span className="text-[10px] text-slate-400">核心产品</span>

            <div className="flex flex-wrap gap-1.5 mt-1">{s.overview.coreProducts.map((p: string, i: number) => <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs">{p}</span>)}</div>

          </div>

        )}

      </InfoBlock>

      {/* 2. Narrative */}

      <InfoBlock title="🎯 2. Narrative 与市场定位">

        <ScoreBar label="Narrative 强度" score={nav.score} />

        {nav.analysis && <p className="text-xs text-slate-700 leading-relaxed mb-3">{nav.analysis}</p>}

        <div className="grid grid-cols-1 gap-2 text-xs">

          {nav.marketCycleFit && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">市场周期适配</span><span className="text-slate-700">{nav.marketCycleFit}</span></div>}

          {nav.whyNeeded && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">市场需求</span><span className="text-slate-700">{nav.whyNeeded}</span></div>}

          {nav.differentiation && <div className="bg-indigo-50 rounded-lg p-3"><span className="text-indigo-600 font-medium block mb-0.5">差异化优势</span><span className="text-indigo-700">{nav.differentiation}</span></div>}

        </div>

      </InfoBlock>

      {/* 3. 产品与技术 */}

      <InfoBlock title="🔧 3. 产品与技术分析">

        <div className="grid grid-cols-2 gap-2 mb-3">

          <ScoreBar label="PMF 可能性" score={prod.pmfScore} />

          <ScoreBar label="技术壁垒" score={prod.techMoatScore} />

        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">

          {prod.architecture && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">技术架构</span><span className="text-slate-700 leading-relaxed">{prod.architecture}</span></div>}

          {prod.performance && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">性能</span><span className="text-slate-700">{prod.performance}</span></div>}

          {prod.ux && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">用户体验</span><span className="text-slate-700">{prod.ux}</span></div>}

          {prod.moat && <div className="bg-indigo-50 rounded-lg p-3"><span className="text-indigo-600 font-medium block mb-0.5">护城河</span><span className="text-indigo-700">{prod.moat}</span></div>}

        </div>

      </InfoBlock>

      {/* 4. Tokenomics */}

      <InfoBlock title="🪙 4. Tokenomics 与价值捕获">

        <ScoreBar label="Token 价值捕获" score={tok.score} />

        <div className="grid grid-cols-1 gap-2 text-xs">

          {tok.tokenUtility && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">Token 功能</span><span className="text-slate-700">{tok.tokenUtility}</span></div>}

          {tok.supplyStructure && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">供给结构</span><span className="text-slate-700">{tok.supplyStructure}</span></div>}

          {tok.unlockPressure && <RiskyBlock><span className="text-amber-600 font-medium block mb-0.5">解锁压力</span><span className="text-amber-700">{tok.unlockPressure}</span></RiskyBlock>}

          {tok.feeModel && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-500 font-medium block mb-0.5">Fee 与收入模型</span><span className="text-slate-700">{tok.feeModel}</span></div>}

          {tok.valueCapture && <div className="bg-indigo-50 rounded-lg p-3"><span className="text-indigo-600 font-medium block mb-0.5">价值捕获</span><span className="text-indigo-700">{tok.valueCapture}</span></div>}

        </div>

      </InfoBlock>

      {/* 5. 链上数据 */}

      <InfoBlock title="📊 5. 链上与业务数据">

        <ScoreBar label="增长质量" score={oc.score} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">

          <MetricCard label="TVL" value={oc.tvl ? fmtUSD(oc.tvl) : '—'} />

          <MetricCard label="24h成交量" value={oc.volume24h ? fmtUSD(oc.volume24h) : '—'} />

          <MetricCard label="日活用户" value={oc.dailyActiveUsers ? fmtNum(oc.dailyActiveUsers) : '—'} />

          <MetricCard label="收入" value={oc.revenue ? fmtUSD(oc.revenue) : '—'} />

        </div>

        {oc.growthTrend && <div className="bg-slate-50 rounded-lg p-3 text-xs mb-2"><span className="text-slate-500 font-medium block mb-0.5">增长趋势</span><span className="text-slate-700 leading-relaxed">{oc.growthTrend}</span></div>}

        {oc.dataAssessment && <div className="bg-slate-50 rounded-lg p-3 text-xs"><span className="text-slate-500 font-medium block mb-0.5">数据真实性</span><span className="text-slate-700">{oc.dataAssessment}</span></div>}

      </InfoBlock>

      {/* 6. 团队 */}

      <InfoBlock title="👥 6. 团队与资本背景">

        <ScoreBar label="执行力评分" score={team.score} />

        {team.members?.length > 0 && (

          <div className="mb-3">

            <h4 className="text-[10px] text-slate-400 font-medium mb-2">核心团队</h4>

            <div className="space-y-2">{team.members.map((m: any, i: number) => (

              <div key={i} className="bg-slate-50 rounded-lg p-3">

                <div className="flex items-center justify-between mb-0.5"><span className="text-xs font-medium text-slate-700">{m.name}</span><span className="text-[10px] text-indigo-600 font-medium">{m.role}</span></div>

                {m.background && <p className="text-[10px] text-slate-400 leading-relaxed">{m.background}</p>}

              </div>

            ))}</div>

          </div>

        )}

        {team.vcs?.length > 0 && (

          <div className="mb-3">

            <h4 className="text-[10px] text-slate-400 font-medium mb-2">投资机构</h4>

            <div className="flex flex-wrap gap-1.5">{team.vcs.map((v: string, i: number) => <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px]">{v}</span>)}</div>

          </div>

        )}

        {team.resources && <div className="bg-slate-50 rounded-lg p-3 text-xs mb-2"><span className="text-slate-500 font-medium block mb-0.5">资源优势</span><span className="text-slate-700">{team.resources}</span></div>}

        {team.reputation && <div className="bg-slate-50 rounded-lg p-3 text-xs"><span className="text-slate-500 font-medium block mb-0.5">历史信誉</span><span className="text-slate-700">{team.reputation}</span></div>}

      </InfoBlock>

      {/* 7. 风险 */}

      <InfoBlock title="⚠️ 7. 风险分析">

        {risk.level && <div className="flex items-center gap-2 mb-3"><span className="text-xs text-slate-500">综合风险等级</span><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${riskColors[risk.level] || 'bg-slate-100 text-slate-600'}`}>{risk.level}</span></div>}

        <div className="grid grid-cols-1 gap-2 text-xs">

          {risk.techRisk && <RiskyBlock><span className="text-amber-800 font-medium block mb-0.5">技术风险</span><span className="text-amber-700">{risk.techRisk}</span></RiskyBlock>}

          {risk.liquidityRisk && <RiskyBlock><span className="text-amber-800 font-medium block mb-0.5">流动性风险</span><span className="text-amber-700">{risk.liquidityRisk}</span></RiskyBlock>}

          {risk.regulatoryRisk && <RiskyBlock><span className="text-amber-800 font-medium block mb-0.5">监管风险</span><span className="text-amber-700">{risk.regulatoryRisk}</span></RiskyBlock>}

          {risk.unlockRisk && <RiskyBlock><span className="text-amber-800 font-medium block mb-0.5">Token 解锁风险</span><span className="text-amber-700">{risk.unlockRisk}</span></RiskyBlock>}

          {risk.narrativeRisk && <RiskyBlock><span className="text-amber-800 font-medium block mb-0.5">Narrative 失效风险</span><span className="text-amber-700">{risk.narrativeRisk}</span></RiskyBlock>}

        </div>

      </InfoBlock>

      {/* 8. 投资结论 */}

      <div className="rounded-2xl border-2 p-5 mb-4" style={{ borderColor: conc.rating === 'Strong Buy' ? '#10b981' : conc.rating === 'Watchlist' ? '#6366f1' : conc.rating === 'Neutral' ? '#f59e0b' : '#ef4444' }}>

        <div className="flex items-center justify-between mb-4">

          <h3 className="text-sm font-bold text-slate-800">📌 8. 投资结论</h3>

          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${ratingColors[conc.rating] || ''}`}>{conc.rating}</span>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

          {conc.bullCase && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><h4 className="text-xs font-bold text-emerald-800 mb-2">🟢 Bull Case</h4><p className="text-xs text-emerald-700 leading-relaxed">{conc.bullCase}</p></div>}

          {conc.bearCase && <div className="bg-red-50 border border-red-200 rounded-xl p-4"><h4 className="text-xs font-bold text-red-800 mb-2">🔴 Bear Case</h4><p className="text-xs text-red-700 leading-relaxed">{conc.bearCase}</p></div>}

        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">

          {conc.stage && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-400 block mb-0.5">当前阶段</span><span className="text-slate-700 font-medium">{conc.stage}</span></div>}

          {conc.strategy && <div className="bg-slate-50 rounded-lg p-3"><span className="text-slate-400 block mb-0.5">投资策略</span><span className="text-slate-700 font-medium">{conc.strategy}</span></div>}

        </div>

        {conc.finalScore && (

          <div className="mt-3">

            <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">综合评分</span><span className={`font-bold font-mono ${(conc.finalScore || 0) >= 80 ? 'text-emerald-600' : (conc.finalScore || 0) >= 60 ? 'text-indigo-600' : (conc.finalScore || 0) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{conc.finalScore}/100</span></div>

            <div className="bg-slate-100 rounded-full h-2"><div className={`h-full rounded-full bg-gradient-to-r ${levelColors[conc.rating] || 'from-slate-400 to-slate-500'}`} style={{ width: conc.finalScore + '%' }} /></div>

          </div>

        )}

      </div>



    </div>

  )

}

const fmtUSD = (v: any) => {

  if (v == null || v === 0) return '—'

  const n = Number(v)

  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'

  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'

  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'

  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'

  return '$' + n.toLocaleString()

}

const fmtNum = (v: any) => {

  if (v == null || v === 0) return '—'

  const n = Number(v)

  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'

  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'

  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'

  return n.toLocaleString()

}

// 指标卡片组件

function MetricCard({ label, value, subtitle }: { label: string; value: any; subtitle?: any }) {

  if (value === '—' && !subtitle) return null

  return (

    <div className="bg-white rounded-xl border border-slate-200 p-3">

      <p className="text-[10px] text-slate-400 mb-1">{label}</p>

      <p className="text-sm font-bold font-mono text-slate-800">{value}</p>

      {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}

    </div>

  )

}


// ===== 热门赛道看板 =====
function SectorDashboard({ onSelect }: { onSelect: (id: string) => void }) {
  const [sectors, setSectors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    fetch('/api/ai-sectors').then(r => r.json()).then(d => {
      if (d.sectors?.length > 0) setSectors(d.sectors)
      else fetch('/api/sectors').then(r2 => r2.json()).then(d2 => setSectors(d2.sectors || [])).catch(() => {})
      setIsLoading(false)
    }).catch(() => fetch('/api/sectors').then(r => r.json()).then(d => setSectors(d.sectors || [])).catch(() => setIsLoading(false)))
  }, [])
  if (isLoading) return <div className="p-6 animate-pulse space-y-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}</div>
  const isAi = sectors.length > 0 && 'rank' in sectors[0]
  const sectorNameToConceptId = (name: string): string | null => {
    const m: Record<string, string> = { 'rwa':'rwa','defi':'defi','layer2':'layer2','restaking':'restaking','lsd':'liquid-staking','memecoin':'memecoin','meme':'memecoin','ai':'ai-crypto','depin':'depin','dex':'dex','perp dex':'perp-dex','永续合约':'perp-dex','跨链桥':'bridge','预测市场':'prediction-market','uniswap hook':'uniswap-hook','pre-ipo':'us-pre-ipo','模块化':'modular','ordinals':'ordinals','机构':'institutional','yield':'yield' }
    return m[name.toLowerCase().trim()] || null
  }
  return <div className="p-6">
    {isAi && <div className="text-[10px] text-slate-400 mb-4">AI 每24h全网检索分析 · 数据来源: CoinGecko + Odaily + OnChain Alpha</div>}
    <div className="space-y-2">
      {sectors.map((s: any, i: number) => {
        const id = s.id || (s.name || '').toLowerCase().replace(/\s+/g, '-')
        return <div key={id} onClick={() => {
          if (isAi) {
            const n = s.name || ''; const cid = sectorNameToConceptId(n)
            onSelect(cid ? `concept:${cid}` : `sector:${n}`)
          } else onSelect(`concept:${id}`)
        }} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 cursor-pointer transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-800">{s.name || s.term}</span>
            <span className="text-sm font-mono text-indigo-600">{(s.heat || s.change24h || 0) > 0 ? '+' : ''}{(s.heat || s.change24h || 0)}</span>
          </div>
          {isAi && s.reason && <p className="text-xs text-slate-500">{s.reason}</p>}
          {!isAi && s.tokens?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{s.tokens.slice(0,4).map((t: string, j: number) => <span key={j} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">{t}</span>)}</div>}
        </div>
      })}
    </div>
  </div>
}

// ===== 热门项目 =====
function HotProjects({ onSelect }: { onSelect: (id: string) => void }) {
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    // AI 24h 热度分析 -> 优先，失败降级到本地算法
    fetch('/api/ai-intelligence').then(r => r.json()).then(d => {
      if (d.hotTopics?.length > 0) {
        setProjects(d.hotTopics.map((t: any, i: number) => ({
          id: t.id || i,
          rank: i + 1,
          symbol: t.symbol || t.name?.split(' ')[0] || '',
          sector: t.sector || '热门',
          price: t.price || 0,
          change24h: t.change24h || 0,
          heat: t.heat || t.score || 50,
          reason: t.reason || t.summary?.slice(0, 30) || '',
        })))
        setIsLoading(false)
      } else {
        fetch('/api/projects').then(r2 => r2.json()).then(d2 => { setProjects(d2.hotProjects || []); setIsLoading(false) }).catch(() => setIsLoading(false))
      }
    }).catch(() => fetch('/api/projects').then(r => r.json()).then(d => { setProjects(d.hotProjects || []); setIsLoading(false) }).catch(() => setIsLoading(false)))
  }, [])
  if (isLoading) return <div className="p-6 animate-pulse space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}</div>
  return <div className="p-6">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-semibold text-slate-800">AI 24h 热点项目</span>
      <span className="text-[10px] text-slate-400">AI 每24h全网检索分析</span>
    </div>
    {projects.length === 0 && <p className="text-sm text-slate-400 text-center py-8">暂无项目数据</p>}
    <div className="grid grid-cols-1 gap-2">
      {projects.slice(0, 30).map((p: any) => (
        <div key={p.id} onClick={() => onSelect(p.symbol.toLowerCase())} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-5">#{p.rank || '-'}</span>
            <div>
              <span className="text-sm font-medium text-slate-800">{p.symbol}</span>
              <span className="text-[10px] text-slate-400 ml-1">{p.sector}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={"text-sm font-mono " + (p.change24h >= 0 ? 'text-emerald-600' : 'text-red-500')}>{p.change24h >= 0 ? '+' : ''}{p.change24h?.toFixed(2)}%</span>
            <span className="text-xs font-medium text-indigo-600">{p.heat}</span>
            {p.reason && <span className="text-[10px] text-slate-400 hidden sm:block">{p.reason}</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
}

// ===== AI 投研分析 =====
function AIResearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const quickActions = ['HYPE', 'ASTER', 'WLD', 'SOL', 'ONDO', 'AAVE', 'PEPE']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/ai-research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim() }) })
      const data = await res.json()
      if (data.error) setError(data.error); else setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return <div className="p-6">
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="relative">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="输入项目名或问题，如：分析 HYPE" className="w-full pl-4 pr-24 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 text-sm" />
        <button type="submit" disabled={loading || !query.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{loading ? '分析中...' : 'AI 分析'}</button>
      </div>
    </form>
    <div className="flex flex-wrap gap-2 mb-6">
      <span className="text-[10px] text-slate-400 self-center">快捷:</span>
      {quickActions.map(sym => <button key={sym} onClick={() => { setQuery(sym); setTimeout(() => document.querySelector('form')?.dispatchEvent(new Event('submit')), 100) }} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-600 hover:bg-indigo-50">{sym}</button>)}
    </div>
    {loading && <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"><div className="h-5 bg-slate-200 rounded w-1/3 mb-3" /><div className="h-3 bg-slate-200 rounded w-2/3 mb-2" /><div className="h-3 bg-slate-200 rounded w-1/2 mb-2" /><div className="h-20 bg-slate-200 rounded" /><p className="text-xs text-slate-400 mt-3">正在检索数据并生成分析报告...</p></div>}
    {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">❌ {error}</div>}
    {result && <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3"><div className="flex items-center justify-between"><h2 className="text-white font-semibold text-sm">🤖 {result.project} 投研分析</h2><span className="text-indigo-200 text-[10px]">AI 生成</span></div></div>
      <div className="p-5"><div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">{result.report}</div><div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">数据来源: Cryptocompare · DeFiLlama · Odaily · Hyperliquid</div></div>
    </div>}
    {!result && !loading && !error && <div className="text-center py-12 text-slate-400"><span className="text-4xl mb-3 block">🤖</span><p className="text-sm">输入项目名，AI 将生成专业投研分析报告</p><p className="text-xs mt-1">基于实时数据 + RAG 知识库</p></div>}
  </div>
}


// 主页面组件

export default function Home() {

  const [activeTab, setActiveTab] = useState<'signals' | 'research'>('signals')

  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null)

  const [activeFilters, setActiveFilters] = useState<SignalType[]>([])

  const [marketData, setMarketData] = useState<MarketData | null>(null)

  const [signals, setSignals] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)

  const [researchView, setResearchView] = useState<'trending' | 'search' | 'detail' | 'sectors' | 'projects'>('sectors')

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



  // 客户端挂载后才从 URL 恢复状态（避免 hydration 不匹配）
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'research') {
      setActiveTab('research')
      const view = params.get('view')
      if (view === 'search' || view === 'detail' || view === 'sectors' || view === 'projects' || view === 'trending') {
        setResearchView(view)
      }
      const coin = params.get('coin')
      if (coin) setSelectedCoinId(coin)
    }
  }, [])

  // URL 状态同步
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'signals') params.set('tab', activeTab)
    if (researchView !== 'sectors') params.set('view', researchView)
    if (selectedCoinId) params.set('coin', selectedCoinId)
    const qs = params.toString()
    const base = window.location.pathname
    window.history.replaceState(null, '', qs ? base + '?' + qs : base)
  }, [activeTab, researchView, selectedCoinId])

  const handleProjectSelect = (symbol: string) => {

    setSelectedCoinId(`project:${symbol.toUpperCase()}`)

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

                <button onClick={() => setActiveFilters(['v4-wallet'])} className={`px-3 py-1 rounded-full text-xs transition-colors ${activeFilters.includes('v4-wallet') ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>

                  💰 V4 聪明钱包

                </button>

              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">

                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

                实时推送中...

              </div>

            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin bg-slate-50/50">

              {activeFilters.includes('v4-wallet') ? (
                <V4WalletPanel />
              ) : (
                <>
                  {activeFilters.length === 0 && (
                    <V4WalletPanel />
                  )}

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
                </>
              )}

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

        <main className="flex-1 flex flex-col bg-slate-50">

          {/* 研究子导航 */}
          <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-1 overflow-x-auto">
            {[
              { k: 'sectors', l: '热门赛道', i: '📊' },
              { k: 'projects', l: '热点项目', i: '🌟' },
              { k: 'trending', l: '小时情报', i: '⏰' },
              { k: 'search', l: '搜索', i: '🔍' },
            ].map(tab => (
              <button
                key={tab.k}
                onClick={() => { setResearchView(tab.k as any); setSelectedCoinId(null); setSearchQuery('') }}
                className={"flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap " + (researchView === tab.k ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100')}
              >
                <span>{tab.i}</span>
                <span>{tab.l}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {researchView === 'trending' && (

              <TrendingTopics onSelect={handleTrendingSelect} onSearch={handleTrendingSelect} />

            )}

            {researchView === 'search' && (

              <ProjectSearch onSelect={handleProjectSelect} initialQuery={searchQuery} />

            )}

            {researchView === 'sectors' && <SectorDashboard onSelect={(id) => { setSelectedCoinId(id); setResearchView('detail') }} />}

            {researchView === 'projects' && <HotProjects onSelect={handleProjectSelect} />}



            {researchView === 'detail' && selectedCoinId && (

              selectedCoinId.startsWith('concept:')

                ? <ConceptView conceptId={selectedCoinId.replace('concept:', '')} onBack={() => setResearchView('sectors')} onProjectSelect={handleProjectSelect} />

                : selectedCoinId.startsWith('project:')

                  ? <ProjectQuickView symbol={selectedCoinId.replace('project:', '')} onBack={() => setResearchView('projects')} />

                : <ProjectDetailView coinId={selectedCoinId} onBack={() => setResearchView('sectors')} />

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

        image: s.image || "",

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
