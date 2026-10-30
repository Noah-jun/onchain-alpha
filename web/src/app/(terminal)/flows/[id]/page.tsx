'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { WhaleTransfer } from '@/domain/types'
import { directionLabel, formatAmount, formatShanghai, formatUsd, observationLabel } from '@/domain/format'
import { AnalysisCard, DataNotice, ErrorBlock, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'

export default function FlowDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, loading, error, reload } = useResearch<WhaleTransfer>(params.id ? `/api/research/flows/${params.id}` : null)
  return (
    <div>
      <Link href="/flows" className="text-xs text-neutral-500">← 资金异动</Link>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="mt-4 space-y-4">
          <PageIntro kicker={observationLabel(data.observation)} title={`${data.asset} 大额转移`}>
            {formatShanghai(data.timestamp)} · {data.chain}
          </PageIntro>
          <DataNotice provenance={data.provenance} />
          <dl className="grid gap-3 rounded-lg border border-[#e7e7e4] bg-white p-4 text-sm md:grid-cols-2">
            <Item label="数量" value={formatAmount(data.amount)} />
            <Item label="美元价值" value={formatUsd(data.amountUsd)} />
            <Item label="方向" value={directionLabel(data.direction)} />
            <Item label="观察状态" value={observationLabel(data.observation)} />
            <Item label="转出" value={data.fromTag || data.fromAddress || '暂无数据'} />
            <Item label="转入" value={data.toTag || data.toAddress || '暂无数据'} />
            <Item label="交易哈希" value={data.txHash || '暂无数据'} />
            <Item label="浏览器" value={data.explorerUrl ? <a className="underline" href={data.explorerUrl} target="_blank" rel="noreferrer">打开</a> : '未提供'} />
          </dl>
          <p className="rounded-lg border border-[#e7e7e4] bg-white p-4 text-sm leading-6">{data.attributionNote}</p>
          <AnalysisCard note={data.analysis} />
          <ChatPanel
            context={{ type: 'flow', id: data.id }}
            prompts={['这笔是交易所已确认的充值吗？', '美元价值有没有缺失？', '交易哈希能在浏览器打开吗？']}
          />
        </div>
      ) : null}
    </div>
  )
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 break-all">{value}</dd>
    </div>
  )
}
