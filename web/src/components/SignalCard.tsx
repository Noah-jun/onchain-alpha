'use client'

import { cn } from '@/lib/utils'
import { formatRelativeTime, formatAmount } from '@/lib/mockData'
import { Signal, AnomalySignal, WhaleSignal, FundingSignal, LiquidationSignal } from '@/types'

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

function AnomalyContent({ signal }: { signal: AnomalySignal }) {
  const isUp = signal.change5m > 0
  
  return (
    <>
      <div className="flex items-start gap-4">
        {/* 左侧图标 */}
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          isUp ? 'bg-emerald-100' : 'bg-red-100'
        )}>
          <span className={cn('text-xl', isUp ? 'animate-lightning' : '')}>⚡</span>
        </div>

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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">{signal.description}</div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
              成交量 ↑{signal.volumeChange}%
            </span>
            {signal.tags.includes('whale_inflow') && (
              <span className="px-2 py-1 rounded bg-emerald-50 text-[10px] text-emerald-600 border border-emerald-100">
                伴随巨鲸流入
              </span>
            )}
            {signal.tags.includes('isolated') && (
              <span className="px-2 py-1 rounded bg-amber-50 text-[10px] text-amber-600 border border-amber-100">
                孤立波动
              </span>
            )}
          </div>
        </div>

        {/* 右侧 */}
        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700">
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
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <span className="text-xl">🐋</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.fromLabel}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
              高风险
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
              巨鲸转账
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">
            {signal.amount} {signal.symbol} → {signal.toLabel}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-1 rounded text-[10px]', directionColor, 'bg-slate-100')}>
              {directionIcon} {directionText}{signal.toLabel}
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
              {signal.chain}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {formatAmount(signal.amountUsd, signal.symbol)}
            </span>
          </div>
        </div>

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700">
          详情 →
        </button>
      </div>
    </>
  )
}

function FundingContent({ signal }: { signal: FundingSignal }) {
  const isNegative = signal.rate < 0
  
  return (
    <>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
          <span className="text-lg">📊</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.exchange}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">
              资金费率
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
              {signal.symbol}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">费率创季度新低</div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
              OI变化: ↑{signal.oiChange}%
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600">
              多空比: {signal.longShortRatio}
            </span>
            <span className={cn(
              'px-2 py-1 rounded text-[10px] font-medium',
              isNegative ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            )}>
              {signal.rate.toFixed(3)}%
            </span>
          </div>
        </div>

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700">
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
        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-lg">💧</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{signal.platform}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
              大额清算
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.timestamp)}</span>
          </div>
          <div className="text-xs text-slate-500 mb-2">
            {formatAmount(signal.amountUsd, signal.symbol)} 被清算
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

        <button className="text-indigo-500 text-xs font-medium hover:text-indigo-700">
          详情 →
        </button>
      </div>
    </>
  )
}
