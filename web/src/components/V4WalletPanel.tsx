'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Wallet, ExternalLink, X, Layers, Star, StarOff, Edit3, Check, AlertCircle } from 'lucide-react'

interface V4Position {
  id: number
  token_id: string
  token0: string
  token1: string
  token0_symbol: string
  token1_symbol: string
  fee: number
  tick_lower: number
  tick_upper: number
  amount: string
  amount0: string
  amount1: string
  amount_usd: string | null
  chain: string
  wallet: string
  first_seen: string
  last_seen: string
}

interface V4Data {
  ok: boolean
  count: number
  positions: V4Position[]
}

interface WalletInfo {
  address: string
  label: string        // 用户备注
  isFollowing: boolean // 是否关注
}

// 按钱包分组
function groupByWallet(positions: V4Position[]) {
  const map = new Map<string, V4Position[]>()
  for (const p of positions) {
    const addr = p.wallet.toLowerCase()
    if (!map.has(addr)) map.set(addr, [])
    map.get(addr)!.push(p)
  }
  return Array.from(map.entries()).map(([addr, pos]) => ({
    address: addr,
    count: pos.length,
    chains: [...new Set(pos.map(p => p.chain))],
    pairs: [...new Set(pos.map(p => `${p.token0_symbol}/${p.token1_symbol}`))].slice(0, 3),
    totalUsd: pos.reduce((sum, p) => sum + (p.amount_usd ? parseFloat(p.amount_usd) : 0), 0),
    positions: pos.sort((a, b) => {
      const aUsd = a.amount_usd ? parseFloat(a.amount_usd) : 0
      const bUsd = b.amount_usd ? parseFloat(b.amount_usd) : 0
      return bUsd - aUsd
    }),
  })).sort((a, b) => b.totalUsd - a.totalUsd)
}

const fmtUSD = (n: number) => {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  if (n < 0.01) return '$' + n.toFixed(4)
  return '$' + n.toFixed(2)
}

const fmtAddr = (addr: string) => addr.slice(0, 6) + '...' + addr.slice(-4)

// 本地存储读写
function getWalletInfos(): Record<string, WalletInfo> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('v4-wallet-infos') || '{}')
  } catch { return {} }
}

function saveWalletInfos(infos: Record<string, WalletInfo>) {
  localStorage.setItem('v4-wallet-infos', JSON.stringify(infos))
}

// 根据当前价格判断头寸是否在区间内
function getTickStatus(tickLower: number, tickUpper: number, currentTick: number): { status: string; color: string } {
  if (currentTick >= tickLower && currentTick <= tickUpper) {
    return { status: '在区间内', color: 'text-emerald-600 bg-emerald-50' }
  }
  return { status: '超出区间', color: 'text-amber-600 bg-amber-50' }
}

// 右侧滑出详情面板
function WalletDetailPanel({
  wallet,
  walletInfo,
  onClose,
  onSaveLabel,
  onToggleFollow,
}: {
  wallet: ReturnType<typeof groupByWallet>[0]
  walletInfo: WalletInfo
  onClose: () => void
  onSaveLabel: (label: string) => void
  onToggleFollow: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(walletInfo.label)

  const handleSave = () => {
    onSaveLabel(label)
    setEditing(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto animate-slide-in">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-violet-600" />
              <span className="font-bold text-slate-800">聪明钱包详情</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 地址行 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">{fmtAddr(wallet.address)}</span>
              <a href={`https://etherscan.io/address/${wallet.address}`} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-700">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFollow}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                  walletInfo.isFollowing
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {walletInfo.isFollowing ? <Star className="w-3 h-3 fill-amber-400" /> : <StarOff className="w-3 h-3" />}
                {walletInfo.isFollowing ? '已关注' : '关注'}
              </button>
            </div>
          </div>

          {/* 备注行 */}
          <div className="mt-2 flex items-center gap-2">
            {editing ? (
              <>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="输入备注..."
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-violet-400"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <button onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setLabel(walletInfo.label); setEditing(false) }} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">备注：{walletInfo.label || '无'}</span>
                <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded">
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 汇总 */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">总估值</p>
              <p className="text-xl font-bold text-violet-700">{fmtUSD(wallet.totalUsd)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">持仓数</p>
              <p className="text-lg font-bold text-slate-800">{wallet.count}</p>
            </div>
          </div>
        </div>

        {/* 头寸列表 */}
        <div className="p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            未平仓头寸 ({wallet.count})
          </h3>
          <div className="space-y-3">
            {wallet.positions.map(p => {
              // 模拟当前tick（实际可用价格计算，这里简化）
              const midTick = Math.floor((p.tick_lower + p.tick_upper) / 2)
              const inRange = midTick >= p.tick_lower && midTick <= p.tick_upper
              const { status, color } = inRange
                ? { status: '在区间内', color: 'text-emerald-600 bg-emerald-50' }
                : { status: '超出区间', color: 'text-amber-600 bg-amber-50' }

              return (
                <div key={p.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-violet-200 transition-colors">
                  {/* 第一行：代币对 + 估值 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {p.token0_symbol}/{p.token1_symbol}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>
                        {status}
                      </span>
                    </div>
                    {p.amount_usd && p.amount_usd !== '0' && (
                      <span className="text-sm font-bold text-violet-700">{fmtUSD(parseFloat(p.amount_usd))}</span>
                    )}
                  </div>

                  {/* token 余额 */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-600 mb-2">
                    {p.amount0 && parseFloat(p.amount0) !== 0 && (
                      <span className="font-medium">{p.token0_symbol}: {parseFloat(p.amount0).toFixed(4)}</span>
                    )}
                    {p.amount1 && parseFloat(p.amount1) !== 0 && (
                      <span className="font-medium">{p.token1_symbol}: {parseFloat(p.amount1).toFixed(4)}</span>
                    )}
                  </div>

                  {/* 第二行：费率 + token 余额 */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                      费率 {(p.fee / 10000).toFixed(2)}%
                    </span>
                    {p.amount0 && parseFloat(p.amount0) !== 0 && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {p.token0_symbol} {parseFloat(p.amount0).toFixed(2)}
                      </span>
                    )}
                    {p.amount1 && parseFloat(p.amount1) !== 0 && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {p.token1_symbol} {parseFloat(p.amount1).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* 第三行：价格区间 */}
                  <div className="mt-2 text-[10px] text-slate-400 font-mono">
                    tick [{p.tick_lower}, {p.tick_upper}] · #{p.token_id}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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
    </>
  )
}

export default function V4WalletPanel() {
  const [data, setData] = useState<V4Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWallet, setSelectedWallet] = useState<ReturnType<typeof groupByWallet>[0] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [walletInfos, setWalletInfos] = useState<Record<string, WalletInfo>>({})
  const [showFollowingOnly, setShowFollowingOnly] = useState(false)

  // 初始化加载
  useEffect(() => {
    setWalletInfos(getWalletInfos())
    fetch('/api/v4-positions')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // 保存关注/备注
  const updateWalletInfo = useCallback((address: string, updates: Partial<WalletInfo>) => {
    setWalletInfos(prev => {
      const addr = address.toLowerCase()
      const existing = prev[addr] || { address: addr, label: '', isFollowing: false }
      const next = { ...prev, [addr]: { ...existing, ...updates } }
      saveWalletInfos(next)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-violet-200 p-4 mb-3 animate-pulse">
        <div className="h-5 bg-violet-100 rounded w-32 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!data?.positions?.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-3 text-center">
        <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">暂无 V4 聪明钱包持仓</p>
      </div>
    )
  }

  const allWallets = groupByWallet(data.positions)
  const wallets = showFollowingOnly
    ? allWallets.filter(w => walletInfos[w.address]?.isFollowing)
    : allWallets
  const followingCount = allWallets.filter(w => walletInfos[w.address]?.isFollowing).length
  const displayWallets = expanded ? wallets : wallets.slice(0, 5)

  return (
    <>
      <div className="bg-white rounded-xl border border-violet-200 overflow-hidden mb-3">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-bold text-violet-800">V4 聪明钱包</span>
            <span className="text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">
              {allWallets.length} 个钱包
            </span>
          </div>
          <button
            onClick={() => setShowFollowingOnly(!showFollowingOnly)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              showFollowingOnly
                ? 'bg-amber-100 text-amber-700'
                : 'bg-white/60 text-slate-500 hover:bg-white'
            }`}
          >
            <Star className={`w-3 h-3 ${showFollowingOnly ? 'fill-amber-400' : ''}`} />
            {showFollowingOnly ? '已关注' : `关注 (${followingCount})`}
          </button>
        </div>

        {/* 钱包卡片 */}
        <div className="divide-y divide-slate-100">
          {displayWallets.map(w => {
            const info = walletInfos[w.address] || { address: w.address, label: '', isFollowing: false }
            return (
              <div
                key={w.address}
                onClick={() => setSelectedWallet(w)}
                className="px-4 py-3 hover:bg-violet-50/50 cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {info.isFollowing && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                    <span className="text-sm font-mono text-slate-700 font-medium">{fmtAddr(w.address)}</span>
                    {info.label && (
                      <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{info.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{w.count} 个头寸</span>
                    <span>·</span>
                    <span>{w.pairs.join(' / ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-violet-700">{fmtUSD(w.totalUsd)}</span>
                  {w.chains.map(c => (
                    <span key={c} className="px-1.5 py-0.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded text-[10px] font-medium">
                      {c.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {wallets.length === 0 && showFollowingOnly && (
          <div className="py-8 text-center text-slate-400">
            <Star className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">暂无关注的钱包</p>
            <p className="text-[10px] mt-1">点击钱包详情页的关注按钮添加</p>
          </div>
        )}

        {/* 展开更多 */}
        {wallets.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2.5 text-xs text-violet-500 hover:bg-violet-50 transition-colors"
          >
            {expanded ? '收起' : `查看全部 ${wallets.length} 个钱包`}
          </button>
        )}
      </div>

      {/* 右侧滑出详情 */}
      {selectedWallet && (
        <WalletDetailPanel
          wallet={selectedWallet}
          walletInfo={walletInfos[selectedWallet.address] || { address: selectedWallet.address, label: '', isFollowing: false }}
          onClose={() => setSelectedWallet(null)}
          onSaveLabel={(label) => updateWalletInfo(selectedWallet.address, { label })}
          onToggleFollow={() => {
            const info = walletInfos[selectedWallet.address] || { address: selectedWallet.address, label: '', isFollowing: false }
            updateWalletInfo(selectedWallet.address, { isFollowing: !info.isFollowing })
          }}
        />
      )}
    </>
  )
}
