'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { FundingOpportunity, FundingRate, Provenance } from '@/domain/types'
import { formatUsd } from '@/domain/format'
import { DataNotice, ErrorBlock, FundingText, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'

interface FundingDetail {
  pair: string
  rates: FundingRate[]
  opportunity: FundingOpportunity | null
  provenance: Provenance
  error: string | null
}

export default function FundingDetailPage() {
  const params = useParams<{ pair: string }>()
  const { data, loading, error, reload } = useResearch<FundingDetail>(params.pair ? `/api/research/funding/${params.pair}` : null)
  return (
    <div>
      <Link href="/funding" className="text-xs text-[#9aabbd]">← 资金费率</Link>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="mt-4 space-y-4">
          <PageIntro kicker="跨所对照" title={data.pair}>
            {data.rates.length < 2 ? '只有一个交易所报价，不能比较费率差。' : '下表是同一交易对的各交易所样本。'}
          </PageIntro>
          <DataNotice provenance={data.provenance} error={data.error} />
          <div className="overflow-x-auto rounded-lg border border-[#2a3848]">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-[#9aabbd]">
                <tr>
                  <th className="px-3 py-2 font-medium">交易所</th>
                  <th className="px-3 py-2 font-medium">费率</th>
                  <th className="px-3 py-2 font-medium">周期</th>
                  <th className="px-3 py-2 font-medium">标记价</th>
                </tr>
              </thead>
              <tbody>
                {data.rates.map((rate) => (
                  <tr key={rate.id} className="border-t border-[#2a3848]">
                    <td className="px-3 py-3">{rate.exchange}</td>
                    <td className="px-3 py-3"><FundingText value={rate.ratePct} /></td>
                    <td className="px-3 py-3">{rate.period}</td>
                    <td className="num px-3 py-3">{formatUsd(rate.markPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.opportunity ? (
            <section className="rounded-lg border border-[#6d5433] bg-[#231c14] p-4 text-sm leading-6">
              <h2 className="text-base font-semibold">{data.opportunity.label}</h2>
              <p className="mt-2">{data.opportunity.structureNote}</p>
              <p className="mt-2">较高一侧 {data.opportunity.highExchange} {data.opportunity.highRate.toFixed(4)}%，较低一侧 {data.opportunity.lowExchange} {data.opportunity.lowRate.toFixed(4)}%。差额 {data.opportunity.spreadPct.toFixed(4)} 个百分点。</p>
              <h3 className="mt-4 text-xs text-[#d6b27a]">已填写</h3>
              <ul className="mt-1 list-disc pl-5">{data.opportunity.known.length ? data.opportunity.known.map((item) => <li key={item.label}>{item.label}：{item.value}</li>) : <li>暂无已核验成本</li>}</ul>
              <h3 className="mt-4 text-xs text-[#d6b27a]">缺失，因此不能当成可实现利润</h3>
              <ul className="mt-1 list-disc pl-5">{data.opportunity.missing.length ? data.opportunity.missing.map((item) => <li key={item}>{item}</li>) : <li>样本成本项已填，但仍有下面的剩余风险</li>}</ul>
              <h3 className="mt-4 text-xs text-[#d6b27a]">风险</h3>
              <ul className="mt-1 list-disc pl-5">{data.opportunity.risks.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : <p className="text-sm text-[#9aabbd]">没有生成费率差卡片。单所报价或价差没有达到展示条件。</p>}
          <ChatPanel
            context={{ type: 'funding', id: data.pair }}
            prompts={['这个费率差为什么是待验证？', '缺了哪些成本？', '这是无风险套利吗？']}
          />
        </div>
      ) : null}
    </div>
  )
}
