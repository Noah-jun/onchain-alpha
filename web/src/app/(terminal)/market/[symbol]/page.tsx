'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Quote } from '@/domain/types'
import { formatShanghai, formatUsd } from '@/domain/format'
import { ChangeText, DataNotice, ErrorBlock, LoadingBlock, PageIntro, PriceChart, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'

export default function AssetPage() {
  const params = useParams<{ symbol: string }>()
  const symbol = params.symbol
  const { data, loading, error, reload } = useResearch<Quote>(symbol ? `/api/research/market/${symbol}` : null)
  return (
    <div>
      <Link href="/" className="text-xs text-neutral-500">← 市场看板</Link>
      <PageIntro kicker="价格路径" title={data?.name || symbol || '资产'}>
        图表使用当前数据源返回的历史点。没有序列时显示暂无历史，而不是画一条假线。
      </PageIntro>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="space-y-4">
          <DataNotice provenance={data.provenance} />
          <section className="rounded-lg border border-[#e7e7e4] bg-white p-4">
            <p className="num text-3xl">{formatUsd(data.price)}</p>
            <div className="mt-2"><ChangeText value={data.change24h} /></div>
            <p className="mt-2 text-xs text-neutral-500">24 小时变化的统计口径以数据源为准。更新 {formatShanghai(data.provenance.updatedAt)}。</p>
            <div className="mt-4"><PriceChart points={data.history} /></div>
          </section>
          <section className="overflow-x-auto rounded-lg border border-[#e7e7e4]">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">时间（上海）</th>
                  <th className="px-3 py-2 font-medium">价格</th>
                </tr>
              </thead>
              <tbody>
                {data.history.slice(-12).reverse().map((point) => (
                  <tr key={point.t} className="border-t border-[#e7e7e4]">
                    <td className="px-3 py-2">{formatShanghai(point.t)}</td>
                    <td className="num px-3 py-2">{formatUsd(point.price)}</td>
                  </tr>
                ))}
                {!data.history.length ? (
                  <tr><td className="px-3 py-6 text-neutral-500" colSpan={2}>暂无历史序列</td></tr>
                ) : null}
              </tbody>
            </table>
          </section>
          <ChatPanel
            context={{ type: 'market', id: data.symbol }}
            prompts={[`总结 ${data.symbol} 现在能确认的价格事实`, '这个价格来自哪个源？']}
          />
        </div>
      ) : null}
    </div>
  )
}
