'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { VolatilityAlert } from '@/domain/types'
import { formatShanghai, volStatusLabel } from '@/domain/format'
import { readSettings } from '@/components/terminal/settings'
import { ChangeText, DataNotice, EmptyBlock, ErrorBlock, FilterButton, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'

interface VolResponse {
  items: VolatilityAlert[]
  scans?: { symbol: string; change5m: number; exchange: string; aboveThreshold: boolean }[]
  provenance: VolatilityAlert['provenance']
  error: string | null
}

export default function VolatilityPage() {
  const [perp, setPerp] = useState('CLUSDT')
  useEffect(() => setPerp(readSettings().perpSymbol), [])
  const { data, loading, error, reload } = useResearch<VolResponse>(`/api/research/volatility?symbols=${encodeURIComponent(perp)}`)
  const [status, setStatus] = useState('全部')
  const [side, setSide] = useState('全部')
  const items = (data?.items ?? []).filter((item) => {
    if (status === 'verified' && item.status !== 'verified') return false
    if (status === 'pending' && item.status !== 'pending') return false
    if (side === 'up' && item.change5m <= 0) return false
    if (side === 'down' && item.change5m >= 0) return false
    return true
  })
  return (
    <div>
      <PageIntro kicker="价格" title="异常波动">
        只列出 5 分钟绝对变化超过 10% 的窗口。跨所、成交额或新鲜度任一未通过，就标成待确认异常。
      </PageIntro>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <DataNotice provenance={data.provenance} error={data.error} />
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterButton pressed={status === '全部'} onClick={() => setStatus('全部')}>全部</FilterButton>
            <FilterButton pressed={status === 'verified'} onClick={() => setStatus('verified')}>三项核对通过</FilterButton>
            <FilterButton pressed={status === 'pending'} onClick={() => setStatus('pending')}>待确认异常</FilterButton>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterButton pressed={side === '全部'} onClick={() => setSide('全部')}>全部方向</FilterButton>
            <FilterButton pressed={side === 'up'} onClick={() => setSide('up')}>▲ 上涨</FilterButton>
            <FilterButton pressed={side === 'down'} onClick={() => setSide('down')}>▼ 下跌</FilterButton>
          </div>
          {items.length ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={`/volatility/${item.id}`} className="block rounded-lg border border-[#e7e7e4] bg-white p-4 hover:border-neutral-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-medium">{item.name} · {item.symbol}</h2>
                      <span className="text-xs text-neutral-800">{volStatusLabel(item.status)}</span>
                    </div>
                    <p className="mt-2"><ChangeText value={item.change5m} /></p>
                    <p className="mt-2 text-xs text-neutral-500">{formatShanghai(item.windowStart)} – {formatShanghai(item.windowEnd)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              <EmptyBlock title="暂无超过 10% 的 5 分钟异常" detail={data.provenance.note} />
              {(data.scans || []).slice(0, 8).map((scan) => (
                <div key={scan.symbol} className="card flex items-center justify-between px-4 py-3 text-sm">
                  <span>{scan.symbol} · {scan.exchange}</span>
                  <span>{scan.aboveThreshold ? '超过阈值' : '未达 10% 阈值'} <ChangeText value={scan.change5m} /></span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
