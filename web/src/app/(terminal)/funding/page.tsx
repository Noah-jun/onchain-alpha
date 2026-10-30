'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { FundingOpportunity, FundingRate, Provenance } from '@/domain/types'
import { formatShanghai, formatUsd } from '@/domain/format'
import { filterRates, type FundingFilter } from '@/domain/fundingLogic'
import { DataNotice, EmptyBlock, ErrorBlock, FilterButton, FundingText, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'

interface FundingResponse {
  rates: FundingRate[]
  opportunities: FundingOpportunity[]
  provenance: Provenance
  error: string | null
  thresholdPct: number
}

export default function FundingPage() {
  const { data, loading, error, reload } = useResearch<FundingResponse>('/api/research/funding')
  const [filter, setFilter] = useState<FundingFilter>('all')
  const [query, setQuery] = useState('')
  const rates = useMemo(() => {
    const matched = data ? filterRates(data.rates, filter) : []
    const needle = query.trim().toUpperCase()
    return needle ? matched.filter((rate) => `${rate.pair} ${rate.exchange} ${rate.base}`.includes(needle)) : matched
  }, [data, filter, query])
  const pairs = new Set(rates.map((rate) => rate.pair))
  const opportunities = (data?.opportunities ?? []).filter((item) => pairs.has(item.pair))

  return (
    <div>
      <PageIntro kicker="衍生品" title="资金费率">
        正费率通常表示多头支付空头，颜色只区分符号，不表示涨跌或收益。跨所价差在成本缺失时标为待验证的费率差。
      </PageIntro>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="space-y-6">
          <DataNotice provenance={data.provenance} error={data.error} />
          <div className="flex flex-wrap gap-2">
            <FilterButton pressed={filter === 'all'} onClick={() => setFilter('all')}>全部</FilterButton>
            <FilterButton pressed={filter === 'below'} onClick={() => setFilter('below')}>低于 -0.5%</FilterButton>
            <FilterButton pressed={filter === 'above'} onClick={() => setFilter('above')}>高于 0.5%</FilterButton>
          </div>
          <label className="block text-xs text-neutral-500">
            交易对或交易所
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full max-w-sm rounded border border-[#e7e7e4] bg-[#f7f7f5] px-3 py-2 text-sm" />
          </label>
          <p className="text-xs text-neutral-500">命中阈值的交易对会保留全部交易所，方便对照。阈值是 {data.thresholdPct}% ，比较的是百分数而不是小数。</p>
          {rates.length ? (
            <div className="overflow-x-auto rounded-lg border border-[#e7e7e4]">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">交易对</th>
                    <th className="px-3 py-2 font-medium">交易所</th>
                    <th className="px-3 py-2 font-medium">费率</th>
                    <th className="px-3 py-2 font-medium">结算周期</th>
                    <th className="px-3 py-2 font-medium">标记价</th>
                    <th className="px-3 py-2 font-medium">更新</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id} className="border-t border-[#e7e7e4]">
                      <td className="px-3 py-3"><Link className="underline" href={`/funding/${rate.pair}`}>{rate.pair}</Link></td>
                      <td className="px-3 py-3">{rate.exchange}</td>
                      <td className="px-3 py-3"><FundingText value={rate.ratePct} /></td>
                      <td className="px-3 py-3">{rate.period}</td>
                      <td className="num px-3 py-3">{formatUsd(rate.markPrice)}</td>
                      <td className="px-3 py-3 text-xs text-neutral-500">{formatShanghai(rate.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyBlock title={data.provenance.mode === 'unconfigured' ? '未配置' : '暂无符合条件的费率'} />}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">跨所费率差</h2>
            {opportunities.length ? opportunities.map((item) => <OpportunityCard key={item.id} item={item} />) : <EmptyBlock title="当前筛选下没有可比较的费率差" />}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function OpportunityCard({ item }: { item: FundingOpportunity }) {
  return (
    <Link href={`/funding/${item.id}`} className="block rounded-lg border border-[#e7e7e4] bg-white p-4 hover:border-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{item.pair}</h3>
        <span className="rounded bg-[#f6f6f4] px-2 py-1 text-xs text-neutral-800">{item.label}</span>
      </div>
      <p className="mt-2 text-sm">费率差 {item.spreadPct.toFixed(4)} 个百分点 · {item.highExchange} {item.highRate.toFixed(4)}% / {item.lowExchange} {item.lowRate.toFixed(4)}%</p>
      <p className="mt-2 text-xs leading-5 text-neutral-500">缺失：{item.missing.length ? item.missing.join('、') : '样本里这些成本项已填写，仍不是无风险利润'}</p>
    </Link>
  )
}
