'use client'

import { cn } from '@/lib/utils'
import { formatRelativeTime, formatAmount } from '@/lib/mockData'
import { Signal, AnomalySignal, WhaleSignal, FundingSignal, LiquidationSignal, BinanceAlphaSignal, NewListingSignal } from '@/types'

interface SignalCardProps {
  signal: Signal
  onClick?: () => void
}

export default function SignalCard({ signal, onClick }: SignalCardProps) {
  const renderContent = () => {
    switch (signal.type) {
      case 'anomaly':
        return <AnomalyContent signal={signal as AnomalySignal} />
      case 'whale':
        return <WhaleContent signal={signal as WhaleSignal} />
      case 'funding':
        return <FundingContent signal={signal as FundingSignal} />
      case 'liquidation':
        return <LiquidationContent signal={signal as LiquidationSignal} />
      case 'binance-alpha':
        return <BinanceAlphaContent signal={signal as BinanceAlphaSignal} />
      case 'newlisting':
        return <NewListingContent signal={signal as NewListingSignal} />
      default:
        return null
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'signal-card bg-white rounded-xl p-4 border cursor-pointer',
        signal.riskLevel === 'high' && 'border-red-200',
        signal.riskLevel === 'medium' && 'border-slate-200 hover:border-yellow-300',
        signal.riskLevel === 'low' && 'border-slate-200'
      )}
    >
      {renderContent()}
    </div>
  )
}

// 代币头像：有图片用图片，没有则生成渐变色首字母
function SignalAvatar({ symbol, image, size = 'md' }: { symbol: string; image?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-12 h-12'
  if (image) {
    return (
      <div className={`${sizeClass} rounded-xl shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center shadow-sm`}>
        <img src={image} alt={symbol} className="w-full h-full object-contain" />
      </div>
    )
  }
  const colors = [
    'from-indigo-400 to-indigo-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-rose-400 to-rose-600',
    'from-amber-400 to-amber-600',
    'from-sky-400 to-sky-600',
    'from-pink-400 to-pink-600',
    'from-cyan-400 to-cyan-600',
    'from-orange-400 to-orange-600',
    'from-teal-400 to-teal-600',
  ]
  const idx = Array.from(symbol).reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  const sizeInner = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-lg'
  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center shrink-0 shadow-sm`}>
      <span className={`font-bold text-white ${sizeInner}`}>{symbol.charAt(0).toUpperCase()}</span>
    </div>
  )
}

function AnomalyContent({ signal }: { signal: AnomalySignal }) {
  const isUp = signal.change5m > 0
  const isVolatilityOnly = Math.abs(signal.change24h) > 10 && Math.abs(signal.change5m) <= 6
  // chain 字段存储了时间周期标签（1h/4h/24h）
  const timeLabel = signal.chain
  
  return (
    <>
      <div className="flex items-start gap-4">
        {/* 左侧代币头像 */}
        <SignalAvatar symbol={signal.symbol} image={signal.image} />

        {/* 中间内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.symbol}</span>
            <span className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium',
              isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}>
              异常波动
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium',
              isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}>
              {isUp ? '+' : ''}{signal.change5m.toFixed(1)}%
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
              {timeLabel}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">{signal.description}</div>
          <div className="flex items-center gap-2">
            {isVolatilityOnly ? (
              <span className="px-2 py-1 rounded bg-amber-50 text-[10px] text-amber-600 border border-amber-100">
                振幅 {signal.change24h.toFixed(1)}%
              </span>
            ) : (
              <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
                成交量 {signal.volumeChange >= 0 ? '↑' : '↓'} {Math.abs(signal.volumeChange).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* 右侧 */}
        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700 shrink-0">
          详情 →
        </button>
      </div>
    </>
  )
}

function WhaleContent({ signal }: { signal: WhaleSignal }) {
  const directionIcon = signal.direction === 'in' ? '↓' : signal.direction === 'out' ? '↑' : '↔'
  const directionText = signal.direction === 'in' ? '转入' : signal.direction === 'out' ? '转出' : '钱包间'
  const directionColor = signal.direction === 'in' ? 'text-red-600' : 'text-emerald-600'
  
  return (
    <>
      <div className="flex items-start gap-4">
        {/* 代币头像 */}
        <SignalAvatar symbol={signal.symbol} image={(signal as any).image} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.symbol}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
              巨鲸转账
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
              {signal.fromLabel} → {signal.toLabel}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">
            金额：{formatAmount(signal.amountUsd, signal.symbol)}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-1 rounded text-[10px]', directionColor, 'bg-slate-100')}>
              {directionIcon} {directionText}
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
              {signal.chain}
            </span>
          </div>
        </div>

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700 shrink-0">
          详情 →
        </button>
      </div>
    </>
  )
}

function FundingContent({ signal }: { signal: FundingSignal }) {
  const isNegative = signal.rate < 0
  const isAbnormal = Math.abs(signal.rate) > 0.5
  
  return (
    <>
      <div className="flex items-start gap-4">
        {/* 代币头像 */}
        <SignalAvatar symbol={signal.symbol} image={(signal as any).image} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.symbol}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">
              资金费率
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
              {signal.exchange}
            </span>
            {isAbnormal && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 animate-pulse">
                异常
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">
            {isAbnormal 
              ? (isNegative ? '空头拥挤，多头面临清算压力' : '多头拥挤，连空头费率升高')
              : '费率正常波动'}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-1 rounded text-[10px] font-bold',
              isAbnormal 
                ? (isNegative ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')
                : (isNegative ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')
            )}>
              {signal.rate.toFixed(4)}%
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
              {signal.chain}
            </span>
          </div>
        </div>

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700 shrink-0">
          详情 →
        </button>
      </div>
    </>
  )
}

function LiquidationContent({ signal }: { signal: LiquidationSignal }) {
  return (
    <>
      <div className="flex items-start gap-4">
        {/* 代币头像 */}
        <SignalAvatar symbol={signal.symbol} image={(signal as any).image} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.symbol}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
              大额清算
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
              {signal.platform}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">
            {formatAmount(signal.amountUsd, signal.symbol)}{signal.side === 'long' ? ' 多头' : ' 空头'} 被清算
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
              {signal.chain}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ${signal.priceImpact.toFixed(2)} 影响
            </span>
          </div>
        </div>

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700 shrink-0">
          详情 →
        </button>
      </div>
    </>
  )
}

function BinanceAlphaContent({ signal }: { signal: BinanceAlphaSignal }) {
  const isUp = signal.priceChange24h > 0
  const hasError = signal.price === 0 && signal.volume24h === 0
  
  // 格式化公告发布时间
  const formatAnnouncementTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
  
  return (
    <>
      <div className="flex items-start gap-4">
        {/* 左侧图标 */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          hasError ? 'bg-slate-100' : 'bg-gradient-to-br from-yellow-400 to-orange-500'
        )}>
          <span className="text-xl">{hasError ? '⚠️' : '🆕'}</span>
        </div>

        {/* 中间内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.symbol}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-200">
              Binance Alpha
            </span>
            {!hasError && (
              <>
                <span className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium',
                  isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                )}>
                  {isUp ? '+' : ''}{signal.priceChange24h.toFixed(1)}%
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              </>
            )}
            <span className="text-[10px] text-slate-400">
              {formatAnnouncementTime(signal.timestamp)}
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-2">{signal.description}</div>
          {!hasError ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
                ${signal.price.toFixed(signal.price < 1 ? 6 : 2)}
              </span>
              <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
                Vol: ${(signal.volume24h / 1000000).toFixed(1)}M
              </span>
              <a 
                href={signal.announcementUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 rounded bg-orange-50 text-[10px] text-orange-600 border border-orange-100 hover:bg-orange-100"
              >
                查看公告 →
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-red-50 text-[10px] text-red-600">
                数据加载失败
              </span>
            </div>
          )}
        </div>

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700">
          详情 →
        </button>
      </div>
    </>
  )
}

// ==================== 新上币信号卡片 ====================

function NewListingContent({ signal }: { signal: NewListingSignal }) {
  const hoursAgo = Math.floor((Date.now() - signal.listedAt) / 3600000)

  const exchangeColor = signal.exchange === 'Binance' ? 'bg-yellow-100 text-yellow-700' :
    signal.exchange === 'OKX' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
  const exchangeIcon = signal.exchange === 'Binance' ? '🔶' :
    signal.exchange === 'OKX' ? '🔵' : '🟣'

  return (
    <>
      <div className="flex items-start gap-4">
        {/* 左侧图标 */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          signal.exchange === 'Binance' ? 'bg-yellow-100' :
          signal.exchange === 'OKX' ? 'bg-blue-100' : 'bg-purple-100'
        )}>
          <span className="text-lg">📢</span>
        </div>

        {/* 中间内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', exchangeColor)}>
              {exchangeIcon} {signal.exchange}
            </span>
            {signal.isHot && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                NEW
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {hoursAgo < 1 ? '刚刚' : hoursAgo < 24 ? `${hoursAgo}h前` : `${Math.floor(hoursAgo/24)}天前`}
            </span>
          </div>
          <div className="text-sm text-slate-800 leading-relaxed">{signal.description}</div>
        </div>

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700 shrink-0">
          详情 →
        </button>
      </div>
    </>
  )
}
