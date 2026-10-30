'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { WhaleTransfer } from '@/domain/types'
import { directionLabel, formatAmount, formatShanghai, formatUsd, observationLabel } from '@/domain/format'
import { DataNotice, EmptyBlock, ErrorBlock, FilterButton, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'

interface FlowResponse {
  items: WhaleTransfer[]
  provenance: WhaleTransfer['provenance']
  error: string | null
}

export default function FlowsPage() {
  const { data, loading, error, reload } = useResearch<FlowResponse>('/api/research/flows')
  const [observation, setObservation] = useState('全部')
  const [direction, setDirection] = useState('全部')
  const items = (data?.items ?? []).filter((item) => {
    if (observation !== '全部' && item.observation !== observation) return false
    if (direction !== '全部' && item.direction !== direction) return false
    return true
  })
  return (
    <div>
      <PageIntro kicker="链上" title="资金异动">
        链上观察到的转移和交易所确认的充值提现分开标。标签冲突或地址缺失时写明归属不确定。演示哈希不会链到区块浏览器。
      </PageIntro>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <DataNotice provenance={data.provenance} error={data.error} />
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
                  <Link href={`/flows/${item.id}`} className="block rounded-lg border border-[#2a3848] bg-[#141c26] p-4 hover:border-[#d6b27a]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-medium">{item.asset} · {formatAmount(item.amount)}</h2>
                      <span className="text-xs text-[#f0d7a2]">{observationLabel(item.observation)}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#c5d0dc]">{directionLabel(item.direction)} · {formatUsd(item.amountUsd)} · {formatShanghai(item.timestamp)}</p>
                    <p className="mt-2 text-xs leading-5 text-[#9aabbd]">{item.fromTag || item.fromAddress || '来源地址暂无'} → {item.toTag || item.toAddress || '去向暂无'}</p>
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
