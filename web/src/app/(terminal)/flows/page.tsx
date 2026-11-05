'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { WhaleTransfer } from '@/domain/types'
import { directionLabel, formatAmount, formatShanghai, formatUsd, observationLabel } from '@/domain/format'
import { readSettings } from '@/components/terminal/settings'
import { DataNotice, EmptyBlock, ErrorBlock, FilterButton, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'

interface FlowResponse {
  items: WhaleTransfer[]
  provenance: WhaleTransfer['provenance']
  onchainProvenance?: WhaleTransfer['provenance']
  error: string | null
  minUsd?: number
  hiddenBelow?: number
  hiddenMissingAmount?: number
}

export default function FlowsPage() {
  const [minUsd, setMinUsd] = useState(500000)
  useEffect(() => setMinUsd(readSettings().flowMinUsd), [])
  const { data, loading, error, reload } = useResearch<FlowResponse>(`/api/research/flows?minUsd=${minUsd}`)
  const [observation, setObservation] = useState('全部')
  const [direction, setDirection] = useState('全部')
  const items = (data?.items ?? []).filter((item) => {
    if (observation !== '全部' && item.observation !== observation) return false
    if (direction !== '全部' && item.direction !== direction) return false
    return true
  })
  return (
    <div>
      <PageIntro kicker="成交与转账" title="资金异动">
        只显示美元名义价值达到设置阈值的记录，默认 50 万美元。没有美元金额的记录无法确认，因此不显示。
      </PageIntro>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <DataNotice provenance={data.provenance} error={data.error} />
          {data.onchainProvenance ? <DataNotice provenance={data.onchainProvenance} /> : null}
          <p className="mb-4 text-xs leading-5 text-neutral-500">
            当前阈值 {formatUsd(data.minUsd ?? minUsd)}。低于阈值 {data.hiddenBelow ?? 0} 条已隐藏。
            另有 {data.hiddenMissingAmount ?? 0} 条没有美元名义价值，无法确认是否达标，也已隐藏。
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {[['全部', '全部'], ['onchain_observed', '链上已观察到'], ['exchange_confirmed', '交易所已确认'], ['uncertain', '归属不确定']].map(([value, label]) => (
              <FilterButton key={value} pressed={observation === value} onClick={() => setObservation(value)}>{label}</FilterButton>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {[['全部', '全部方向'], ['deposit', '转入方向'], ['withdraw', '转出方向'], ['unknown', '方向未知']].map(([value, label]) => (
              <FilterButton key={value} pressed={direction === value} onClick={() => setDirection(value)}>{label}</FilterButton>
            ))}
          </div>
          {items.length ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={`/flows/${item.id}`} className="block rounded-lg border border-[#e7e7e4] bg-white p-4 hover:border-neutral-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-medium">{item.asset} · {formatAmount(item.amount)}</h2>
                      <span className="text-xs text-neutral-800">{observationLabel(item.observation)}</span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-700">{directionLabel(item.direction)} · {formatUsd(item.amountUsd)} · {formatShanghai(item.timestamp)}</p>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">{item.fromTag || item.fromAddress || '来源地址暂无'} → {item.toTag || item.toAddress || '去向暂无'}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyBlock title={data.provenance.mode === 'unconfigured' ? '未配置' : '暂无符合条件的转账'} detail={data.provenance.note} />}
        </>
      ) : null}
    </div>
  )
}
