'use client'

import { useBinanceAlpha, formatAnnouncementTime } from '@/lib/binanceAlpha'
import { cn } from '@/lib/utils'
import { ExternalLink, RefreshCw } from 'lucide-react'

interface BinanceAlphaSignalsProps {
  onSelectSignal: (signal: any) => void
}

export default function BinanceAlphaSignals({ onSelectSignal }: BinanceAlphaSignalsProps) {
  const { tokens, isLoading, error, refetch } = useBinanceAlpha()

  if (isLoading && tokens.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-1/4 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error && tokens.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-red-500 text-2xl mb-2">⚠️</div>
        <p className="text-red-700 font-medium">加载失败</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={refetch}
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </button>
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-slate-500">暂无数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tokens.map((token, index) => {
        const isUp = token.priceChange24h > 0
        return (
          <div
            key={token.id}
            onClick={() => onSelectSignal({
              id: token.id,
              type: 'binance-alpha',
              riskLevel: Math.abs(token.priceChange24h) > 30 ? 'high' : Math.abs(token.priceChange24h) > 10 ? 'medium' : 'low',
              timestamp: token.timestamp,
              announcementTime: token.timestamp,
              chain: 'Binance',
              symbol: token.symbol,
              name: token.name,
              price: token.price,
              priceChange24h: token.priceChange24h,
              volume24h: token.volume24h,
              announcementUrl: token.announcementUrl,
              description: token.description
            })}
            className="bg-white rounded-xl p-4 border border-slate-200 hover:border-orange-300 cursor-pointer transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* 左侧图标 */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
                <span className="text-xl">🆕</span>
              </div>

              {/* 中间内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-800">{token.symbol}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-200">
                    Binance Alpha
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium',
                    isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  )}>
                    {isUp ? '+' : ''}{token.priceChange24h.toFixed(1)}%
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="text-[10px] text-slate-400">
                    {formatAnnouncementTime(token.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mb-2">{token.description}</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
                    ${token.price.toFixed(token.price < 1 ? 6 : 2)}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
                    Vol: ${(token.volume24h / 1000000).toFixed(1)}M
                  </span>
                  <a 
                    href={token.announcementUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 rounded bg-orange-50 text-[10px] text-orange-600 border border-orange-100 hover:bg-orange-100"
                  >
                    公告 →
                  </a>
                </div>
              </div>

              <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700">
                详情 →
              </button>
            </div>
          </div>
        )
      })}
      
      {/* 加载状态 */}
      {isLoading && (
        <div className="text-center py-2 text-xs text-slate-400">
          刷新中...
        </div>
      )}
    </div>
  )
}
