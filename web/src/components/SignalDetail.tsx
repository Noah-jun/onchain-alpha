'use client'

import { FileText, MousePointerClick, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { Signal, WhaleSignal, AnomalySignal, FundingSignal, LiquidationSignal, BinanceAlphaSignal, NewListingSignal } from '@/types'
import { formatRelativeTime, formatAmount } from '@/lib/mockData'

interface SignalDetailProps {
  signal: Signal | null
}

// 生成TradingView链接
function getTradingViewLink(symbol: string): string {
  // 如果已经是完整格式，直接返回
  if (symbol.includes(':')) {
    return `https://www.tradingview.com/chart/?symbol=${symbol.toUpperCase()}`
  }
  // 否则拼接
  return `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol.toUpperCase()}USDT`
}

// 生成信号描述
function generateSignalDescription(signal: Signal): string {
  switch (signal.type) {
    case 'anomaly': {
      const s = signal as AnomalySignal
      const direction = s.change5m >= 0 ? '上涨' : '下跌'
      const timeLabel = s.chain || '24h'
      const isAmplitudeSignal = Math.abs(s.change24h) > 10 && Math.abs(s.change5m) <= 6
      if (isAmplitudeSignal) {
        return `${s.symbol} 24h内出现高振幅波动（${s.change24h.toFixed(1)}%），当前价格$${s.price.toLocaleString()}`
      }
      return `${s.symbol} ${timeLabel}涨跌${direction}幅${Math.abs(s.change5m).toFixed(2)}%，当前价格$${s.price.toLocaleString()}`
    }
    case 'funding': {
      const s = signal as FundingSignal
      const direction = s.rate >= 0 ? '多头' : '空头'
      return `${s.exchange} ${s.symbol} 资金费率${s.rate >= 0 ? '偏高' : '偏低'}（${s.rate >= 0 ? '+' : ''}${s.rate.toFixed(3)}%），${direction}仓位拥挤，下次资金时间: ${new Date(s.nextFundingTime).toLocaleString('zh-CN')}`
    }
    case 'liquidation': {
      const s = signal as LiquidationSignal
      return `${s.platform} ${s.symbol} 发生大额清算，${s.side === 'long' ? '多头' : '空头'}被爆仓，总价值$${formatAmount(s.amountUsd, s.symbol)}`
    }
    default:
      return ''
  }
}

export default function SignalDetail({ signal }: SignalDetailProps) {
  if (!signal) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            信号详情
          </h3>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <p className="text-sm">点击左侧信号查看详情</p>
            <p className="text-xs text-slate-400 mt-1">实时数据，无AI解读</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-[10px] text-slate-400 text-center">
            数据来源：链上实时监测
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          信号详情
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* 信号类型标签 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              signal.riskLevel === 'high' 
                ? 'bg-red-100 text-red-700 border border-red-200'
                : signal.riskLevel === 'medium'
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {signal.type === 'anomaly' && '异常波动'}
              {signal.type === 'whale' && '巨鲸转账'}
              {signal.type === 'funding' && '资金费率'}
              {signal.type === 'liquidation' && '大额清算'}
              {signal.type === 'binance-alpha' && '币安Alpha'}
              {signal.type === 'newlisting' && '新上币'}
            </span>
            <span className="text-xs text-slate-400">
              {formatRelativeTime(signal.timestamp)}
            </span>
          </div>

          {/* 信号描述 */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                signal.type === 'anomaly' ? 'bg-orange-100' :
                signal.type === 'whale' ? 'bg-blue-100' :
                signal.type === 'funding' ? 'bg-purple-100' :
                signal.type === 'newlisting' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {signal.type === 'anomaly' && <TrendingUp className="w-5 h-5 text-orange-600" />}
                {signal.type === 'whale' && <ArrowUpRight className="w-5 h-5 text-blue-600" />}
                {signal.type === 'funding' && <AlertTriangle className="w-5 h-5 text-purple-600" />}
                {signal.type === 'liquidation' && <TrendingDown className="w-5 h-5 text-red-600" />}
                {signal.type === 'newlisting' && <TrendingUp className="w-5 h-5 text-green-600" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-800 font-medium leading-relaxed">
                  {generateSignalDescription(signal)}
                </p>
              </div>
            </div>
          </div>

          {/* 异常波动详情 */}
          {signal.type === 'anomaly' && (
            <AnomalyDetail signal={signal as AnomalySignal} />
          )}

          {/* 资金费率详情 */}
          {signal.type === 'funding' && (
            <FundingDetail signal={signal as FundingSignal} />
          )}

          {/* 清算详情 */}
          {signal.type === 'liquidation' && (
            <LiquidationDetail signal={signal as LiquidationSignal} />
          )}

          {/* 币安Alpha详情 */}
          {signal.type === 'binance-alpha' && (
            <BinanceAlphaDetail signal={signal as BinanceAlphaSignal} />
          )}

          {/* 新上币详情 */}
          {signal.type === 'newlisting' && <NewListingDetail signal={signal as NewListingSignal} />}

          {/* 巨鲸详情 */}
          {signal.type === 'whale' && <WhaleDetail signal={signal as WhaleSignal} />}
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
        {signal.symbol && (
          <a 
            href={getTradingViewLink(signal.symbol)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            查看TradingView走势
          </a>
        )}
        <button className="w-full py-2 px-4 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
          加入监控列表
        </button>
      </div>
    </div>
  )
}

function AnomalyDetail({ signal }: { signal: AnomalySignal }) {
  // chain 字段存储了短周期标签，如 "1h" "4h" "24h"
  const timeLabel = signal.chain || '24h'
  const isAmplitudeSignal = Math.abs(signal.change24h) > 10 && Math.abs(signal.change5m) <= 6
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase mb-1">{timeLabel}涨跌</p>
          <p className={`text-lg font-bold ${signal.change5m >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {signal.change5m >= 0 ? '+' : ''}{signal.change5m.toFixed(2)}%
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase mb-1">
            {isAmplitudeSignal ? '24h振幅' : '24h涨跌'}
          </p>
          <p className={`text-lg font-bold ${isAmplitudeSignal ? 'text-amber-500' : signal.change24h >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {isAmplitudeSignal ? `${signal.change24h.toFixed(1)}%` : `${signal.change24h >= 0 ? '+' : ''}${signal.change24h.toFixed(2)}%`}
          </p>
        </div>
      </div>
      <div className="bg-slate-50 rounded-lg p-3 text-xs">
        <div className="flex justify-between mb-1">
          <span className="text-slate-500">当前价格</span>
          <span className="text-slate-800 font-mono">${signal.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-slate-500">24h成交量</span>
          <span className="text-slate-800">${(signal.volume / 1e9).toFixed(2)}B</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">市值</span>
          <span className="text-slate-800">${(signal.marketCap / 1e12).toFixed(2)}T</span>
        </div>
      </div>
    </div>
  )
}

function FundingDetail({ signal }: { signal: FundingSignal }) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">交易所</span>
          <span className="text-slate-800">{signal.exchange}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">当前费率</span>
          <span className={`font-bold ${signal.rate >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {signal.rate >= 0 ? '+' : ''}{signal.rate.toFixed(3)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">下次资金时间</span>
          <span className="text-slate-800">{new Date(signal.nextFundingTime).toLocaleString('zh-CN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">风险解读</span>
          <span className={`${signal.rate >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {signal.rate >= 0 ? '多头挤压' : '空头挤压'}
          </span>
        </div>
      </div>
      <div className={`p-3 rounded-lg text-xs ${signal.rate >= 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
        {signal.rate >= 0 
          ? '⚠️ 高资金费率表明多头仓位拥挤，可能发生多头挤压平仓'
          : '📉 负资金费率表明空头仓位拥挤，需关注反弹风险'}
      </div>
    </div>
  )
}

function LiquidationDetail({ signal }: { signal: LiquidationSignal }) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">交易所</span>
          <span className="text-slate-800">{signal.platform}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">清算方向</span>
          <span className={signal.side === 'long' ? 'text-red-600' : 'text-emerald-600'}>
            {signal.side === 'long' ? '多头被爆' : '空头被爆'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">清算数量</span>
          <span className="text-slate-800">{signal.amount.toLocaleString()} {signal.symbol}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">预估价值</span>
          <span className="text-slate-800 font-bold">${formatAmount(signal.amountUsd, signal.symbol)}</span>
        </div>
      </div>
      <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">
        💰 大额清算可能导致短期价格波动，关注止损设置
      </div>
    </div>
  )
}

function WhaleDetail({ signal }: { signal: WhaleSignal }) {
  return (
    <div className="space-y-4">
      {/* 交易基础信息 */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">交易基础信息</div>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">From</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-800 font-mono truncate max-w-[120px]">
                {signal.fromLabel}
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">To</span>
            <span className="text-slate-800">{signal.toLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount</span>
            <span className="text-slate-800 font-mono">
              {signal.amount} {signal.symbol} ({formatAmount(signal.amountUsd, signal.symbol)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Chain</span>
            <span className="text-slate-800">{signal.chain}</span>
          </div>
        </div>
      </div>

      {/* 风险评估 */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">风险评估</div>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">风险等级</span>
            <span className={`font-medium ${
              signal.riskLevel === 'high' ? 'text-red-600' : 
              signal.riskLevel === 'medium' ? 'text-yellow-600' : 'text-slate-600'
            }`}>
              {signal.riskLevel === 'high' ? '高风险' : signal.riskLevel === 'medium' ? '中风险' : '低风险'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">方向</span>
            <span className={signal.direction === 'in' ? 'text-red-600' : 'text-emerald-600'}>
              {signal.direction === 'in' ? '转入交易所 (看跌)' : '转出交易所 (看涨)'}
            </span>
          </div>
        </div>
      </div>

      {/* 数据溯源 */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">数据溯源</div>
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded">
            <span className="text-indigo-600">[1]</span>
            <span className="truncate">区块链浏览器</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function BinanceAlphaDetail({ signal }: { signal: BinanceAlphaSignal }) {
  return (
    <div className="space-y-4">
      {/* 基础信息 */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">代币信息</div>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">名称</span>
            <span className="text-slate-800 font-medium">{signal.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">当前价格</span>
            <span className="text-slate-800 font-mono">${signal.price.toFixed(signal.price < 1 ? 6 : 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">24h涨跌</span>
            <span className={signal.priceChange24h >= 0 ? 'text-red-500' : 'text-emerald-500'}>
              {signal.priceChange24h >= 0 ? '+' : ''}{signal.priceChange24h.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">24h成交量</span>
            <span className="text-slate-800">${(signal.volume24h / 1000000).toFixed(2)}M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">公告时间</span>
            <span className="text-slate-800">
              {new Date(signal.timestamp).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      </div>

      {/* 公告链接 */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">公告详情</div>
        <a 
          href={signal.announcementUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-orange-600" />
          <span className="text-sm text-orange-700 font-medium">
            查看币安官方公告
          </span>
        </a>
      </div>

      {/* 风险提示 */}
      <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
        ⚠️ 新上线代币波动较大，请注意风险
      </div>
    </div>
  )
}

function NewListingDetail({ signal }: { signal: NewListingSignal }) {
  const hoursAgo = Math.floor((Date.now() - signal.listedAt) / 3600000)
  const exchangeEmoji = signal.exchange === 'Binance' ? '🔶' : signal.exchange === 'OKX' ? '🔵' : '🟣'
  const marketLabel = signal.marketType === 'spot' ? '现货市场' : '永续合约市场'

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{exchangeEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{signal.exchange}</p>
            <p className="text-xs text-slate-500">{marketLabel}</p>
          </div>
        </div>
        <div className="border-t border-slate-200 pt-3 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">代币</span>
            <span className="text-slate-800 font-medium">{signal.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">公告时间</span>
            <span className="text-slate-800">
              {hoursAgo < 1 ? '刚刚' : hoursAgo < 24 ? `${hoursAgo} 小时前` : `${Math.floor(hoursAgo / 24)} 天前`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">数据来源</span>
            <span className="text-indigo-600">官方公告</span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-700 leading-relaxed">{signal.description}</p>
      </div>
      <a
        href={signal.announcementUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        查看官方公告
      </a>
      <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
        ⚠️ 新上线代币波动较大，请注意风险管理
      </div>
    </div>
  )
}
