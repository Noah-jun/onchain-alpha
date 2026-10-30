'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { VolatilityAlert } from '@/domain/types'
import { formatShanghai, formatUsd, volStatusLabel } from '@/domain/format'
import { AnalysisCard, ChangeText, DataNotice, ErrorBlock, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'

export default function VolatilityDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, loading, error, reload } = useResearch<VolatilityAlert>(params.id ? `/api/research/volatility/${params.id}` : null)
  return (
    <div>
      <Link href="/volatility" className="text-xs text-neutral-500">← 异常波动</Link>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="mt-4 space-y-4">
          <PageIntro kicker={volStatusLabel(data.status)} title={`${data.symbol} 5 分钟窗口`}>
            {formatShanghai(data.windowStart)} – {formatShanghai(data.windowEnd)}
          </PageIntro>
          <DataNotice provenance={data.provenance} />
          <section className="rounded-lg border border-[#e7e7e4] bg-white p-4">
            <ChangeText value={data.change5m} />
            <p className="mt-2 text-sm">窗口价格：{formatUsd(data.price)}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <Check label="多交易所" ok={data.checks.multiExchange.ok} detail={data.checks.multiExchange.detail} />
              <Check label="成交额" ok={data.checks.volume.ok} detail={data.checks.volume.detail} />
              <Check label="新鲜度" ok={data.checks.freshness.ok} detail={data.checks.freshness.detail} />
            </ul>
          </section>
          <AnalysisCard note={data.analysis} />
          <ChatPanel
            context={{ type: 'volatility', id: data.id }}
            prompts={['为什么这条是待确认或已核对？', '三项核对各自的结果是什么？', '这能说明价格还会继续走吗？']}
          />
        </div>
      ) : null}
    </div>
  )
}

function Check({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="rounded bg-[#f7f7f5] p-3">
      <p>{ok ? '通过' : '未通过'} · {label}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{detail}</p>
    </li>
  )
}
