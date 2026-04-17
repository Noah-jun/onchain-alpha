'use client'

import { Activity, Radio, Brain, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarketData } from '@/types'

interface HeaderProps {
  marketData?: MarketData
  activeTab: 'signals' | 'research'
  onTabChange: (tab: 'signals' | 'research') => void
  isLoading?: boolean
  showMarketBar?: boolean
}

export default function Header({ marketData, activeTab, onTabChange, isLoading, showMarketBar = true }: HeaderProps) {
  return (
    <>
      {/* 顶部导航 */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">OnChain Alpha</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => onTabChange('signals')}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'signals'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white'
            )}
          >
            <Radio className="w-4 h-4" />
            市场信号
          </button>
          <button
            onClick={() => onTabChange('research')}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'research'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white'
            )}
          >
            <Brain className="w-4 h-4" />
            AI 投研助手
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 hover:border-indigo-300 transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Cmd K</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>系统正常</span>
          </div>
        </div>
      </header>

      {/* 市场状态栏 */}
      {showMarketBar && (
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-stretch gap-3">
          {/* 恐慌指数 */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-amber-50 border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
            <div>
              <div className="text-[10px] text-slate-500 mb-0.5">恐慌指数</div>
              {isLoading ? (
                <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-800 font-mono">{marketData?.fearGreed.value ?? '--'}</span>
                  <span className="text-xs font-medium text-amber-600">{marketData?.fearGreed.label ?? ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* BTC/USDT */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
            <div className="flex-1">
              <div className="text-[10px] text-slate-500">BTC/USDT</div>
              {isLoading ? (
                <div className="h-6 w-20 bg-slate-200 rounded animate-pulse mt-0.5" />
              ) : (
                <div className="text-lg font-bold text-slate-800 font-mono">
                  ${marketData?.btc.price ? marketData.btc.price.toLocaleString() : '--'}
                </div>
              )}
            </div>
            {!isLoading && marketData && (
              <div className="text-right">
                <div className={cn(
                  'text-xs font-medium',
                  marketData.btc.change24h >= 0 ? 'text-emerald-600' : 'text-red-500'
                )}>
                  {marketData.btc.change24h >= 0 ? '+' : ''}{marketData.btc.change24h.toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          {/* ETH/USDT */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
            <div className="flex-1">
              <div className="text-[10px] text-slate-500">ETH/USDT</div>
              {isLoading ? (
                <div className="h-6 w-20 bg-slate-200 rounded animate-pulse mt-0.5" />
              ) : (
                <div className="text-lg font-bold text-slate-800 font-mono">
                  ${marketData?.eth.price ? marketData.eth.price.toLocaleString() : '--'}
                </div>
              )}
            </div>
            {!isLoading && marketData && (
              <div className="text-right">
                <div className={cn(
                  'text-xs font-medium',
                  marketData.eth.change24h >= 0 ? 'text-emerald-600' : 'text-red-500'
                )}>
                  {marketData.eth.change24h >= 0 ? '+' : ''}{marketData.eth.change24h.toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          {/* 纳斯达克 */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
            <div className="flex-1">
              <div className="text-[10px] text-slate-500">纳斯达克</div>
              {isLoading ? (
                <div className="h-6 w-20 bg-slate-200 rounded animate-pulse mt-0.5" />
              ) : (
                <div className="text-lg font-bold text-slate-800 font-mono">
                  {marketData?.nasdaq.price ? marketData.nasdaq.price.toLocaleString() : '--'}
                </div>
              )}
            </div>
            {!isLoading && marketData && (
              <div className="text-right">
                <div className={cn(
                  'text-xs font-medium',
                  marketData.nasdaq.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                )}>
                  {marketData.nasdaq.change >= 0 ? '+' : ''}{marketData.nasdaq.change.toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          {/* 标普500 */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
            <div className="flex-1">
              <div className="text-[10px] text-slate-500">标普500</div>
              {isLoading ? (
                <div className="h-6 w-20 bg-slate-200 rounded animate-pulse mt-0.5" />
              ) : (
                <div className="text-lg font-bold text-slate-800 font-mono">
                  {marketData?.sp500.price ? marketData.sp500.price.toLocaleString() : '--'}
                </div>
              )}
            </div>
            {!isLoading && marketData && (
              <div className="text-right">
                <div className={cn(
                  'text-xs font-medium',
                  marketData.sp500.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                )}>
                  {marketData.sp500.change >= 0 ? '+' : ''}{marketData.sp500.change.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  )
}
