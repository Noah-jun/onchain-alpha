'use client'

import { useCallback, useEffect, useState } from 'react'
import type { HistoryPoint, Provenance, ResearchNote } from '@/domain/types'
import { formatShanghai, freshnessLabel, modeLabel } from '@/domain/format'
import { researchHeaders } from '@/components/terminal/settings'

export function useResearch<T>(url: string | null, refreshSeconds = 0) {
  const [loading, setLoading] = useState(Boolean(url))
  const [error, setError] = useState('')
  const [data, setData] = useState<T | null>(null)

  const load = useCallback(async () => {
    if (!url) return
    try {
      const response = await fetch(url, { cache: 'no-store', headers: researchHeaders() })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || '加载失败')
      setData(json)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (!url) return
    setLoading(true)
    void load()
    if (!refreshSeconds) return
    const timer = window.setInterval(() => void load(), refreshSeconds * 1000)
    return () => window.clearInterval(timer)
  }, [load, refreshSeconds, url])

  return { loading, error, data, reload: load }
}

export function PageIntro({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <p className="text-xs tracking-[0.16em] text-neutral-900">{kicker}</p>
      <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h1>
      {children ? <div className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">{children}</div> : null}
    </header>
  )
}

export function DataNotice({ provenance, error }: { provenance?: Provenance | null; error?: string | null }) {
  if (!provenance && !error) return null
  return (
    <section className="mb-5 rounded-lg border border-[#e7e7e4] bg-white p-4 text-sm leading-6">
      {provenance?.mode === 'demo' ? <p className="text-neutral-800">演示数据。数字来自固定快照，不是实时市场。</p> : null}
      {provenance?.mode === 'unconfigured' ? <p className="text-neutral-800">未配置。该实时源没有接通，页面不会把它显示成已连接。</p> : null}
      {provenance?.mode === 'live' ? <p className="text-emerald-700">实时源。缺失的字段保持为空，不用演示数字填补。</p> : null}
      {provenance?.freshness === 'stale' ? <p>数据延迟。时间是上次更新，不是现在。</p> : null}
      {provenance?.freshness === 'missing' ? <p>暂无数据。</p> : null}
      {error ? <p className="text-red-700">加载问题：{error}</p> : null}
      {provenance ? <Meta provenance={provenance} /> : null}
    </section>
  )
}

export function Meta({ provenance }: { provenance: Provenance }) {
  return (
    <dl className="mt-3 grid gap-2 text-xs text-neutral-500 sm:grid-cols-2">
      <div>来源：{provenance.source}</div>
      <div>模式：{modeLabel(provenance.mode)} · {freshnessLabel(provenance.freshness)}</div>
      <div>拉取：{formatShanghai(provenance.fetchedAt)}</div>
      <div>更新：{formatShanghai(provenance.updatedAt)}</div>
      <div className="sm:col-span-2">{provenance.note}</div>
    </dl>
  )
}

export function Pills({ provenance }: { provenance: Provenance }) {
  return (
    <span className="inline-flex flex-wrap gap-1 text-[11px]">
      <span className="rounded bg-[#f3f3f1] px-1.5 py-0.5">{modeLabel(provenance.mode)}</span>
      <span className="rounded bg-[#f3f3f1] px-1.5 py-0.5">{freshnessLabel(provenance.freshness)}</span>
    </span>
  )
}

export function ChangeText({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-neutral-500">暂无数据</span>
  if (value === 0) return <span className="num text-neutral-700">■ 持平 0.00%</span>
  const up = value > 0
  return (
    <span className={`num ${up ? 'text-[#3ecf8e]' : 'text-[#f07178]'}`}>
      {up ? '▲ 上涨' : '▼ 下跌'} {up ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

export function FundingText({ value }: { value: number }) {
  const tone = value > 0 ? 'text-[#f0b4ae]' : value < 0 ? 'text-[#9ec7ea]' : 'text-neutral-700'
  const label = value > 0 ? '正费率' : value < 0 ? '负费率' : '零费率'
  return <span className={`num ${tone}`}>{label} {value > 0 ? '+' : ''}{value.toFixed(4)}%</span>
}

export function Assets({ assets }: { assets: string[] }) {
  if (!assets.length) return <span>未识别</span>
  return <span>{assets.join('、')}</span>
}

export function HeatTags({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-neutral-500">未区分</span>
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="rounded bg-[#f6f6f4] px-1.5 py-0.5 text-[11px] text-neutral-800">{tag}</span>
      ))}
    </span>
  )
}

export function Panel({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#e7e7e4] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#e7e7e4] px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {extra}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function LoadingBlock() {
  return (
    <div className="space-y-3" aria-busy="true">
      <p className="text-sm text-neutral-500">正在加载…</p>
      {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-[#f3f3f1]" />)}
    </div>
  )
}

export function EmptyBlock({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#e7e7e4] px-4 py-10 text-center">
      <p className="text-sm">{title}</p>
      {detail ? <p className="mt-2 text-xs text-neutral-500">{detail}</p> : null}
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-[#f0d0d0] bg-[#fff7f7] p-4 text-sm">
      <p>加载失败：{message}</p>
      {onRetry ? <button className="mt-3 rounded bg-[#f3f3f1] px-3 py-1 text-xs" onClick={onRetry}>重试</button> : null}
    </div>
  )
}

export function PriceChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return <p className="text-sm text-neutral-500">暂无历史序列</p>
  const prices = points.map((point) => point.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const width = 640
  const height = 220
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * (width - 16) + 8
    const y = max === min ? height / 2 : 16 + (1 - (point.price - min) / (max - min)) * (height - 32)
    return `${x},${y}`
  }).join(' ')
  const up = prices[prices.length - 1] >= prices[0]
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="价格路径" className="h-56 w-full">
        <polyline fill="none" stroke={up ? '#3ecf8e' : '#f07178'} strokeWidth="2" points={coords} />
      </svg>
      <p className="mt-2 text-xs text-neutral-500">
        起点 {prices[0]} · 终点 {prices[prices.length - 1]} · {up ? '▲ 上涨' : '▼ 下跌'}
      </p>
    </div>
  )
}

export function AnalysisCard({ note }: { note: ResearchNote }) {
  return (
    <section className="rounded-lg border border-[#e7e7e4] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">研判</h2>
        <span className="text-xs text-neutral-500">置信度 {note.confidence}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-neutral-500">这是基于本条材料的整理。社交热度高只表示讨论多，不表示有交易价值。基本面有支撑只表示材料更接近披露或数据，不表示结论成立。</p>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Field label="事件类型" value={note.eventType} />
        <Field label="相关资产" value={note.relatedAssets.length ? note.relatedAssets.join('、') : '未识别'} />
        <Field label="情绪" value={note.sentiment} />
        <Field label="时间范围" value={note.timeHorizon} />
        <Field label="热度标签" value={<HeatTags tags={note.heatTags} />} />
        <Field label="置信依据" value={note.confidenceBasis} />
      </dl>
      <Block title="可能影响" text={note.impact} />
      <Block title="传导路径" text={note.impactPath} />
      <List title="事实" items={note.facts} />
      <List title="推断" items={note.inferences} empty="这条材料没有单独的推断。" />
      <List title="未知" items={note.unknowns} />
      <List title="风险" items={note.risks} />
      <List title="反方 / 限制" items={note.counterpoints} />
      <div className="mt-4">
        <h3 className="text-xs text-neutral-500">证据</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {note.evidence.length ? note.evidence.map((item) => (
            <li key={item.quote} className="rounded bg-[#f7f7f5] p-3">
              <p>「{item.quote}」</p>
              <p className="mt-1 text-xs text-neutral-500">{item.source}{item.url ? ` · ${item.url}` : ' · 无外部链接'}</p>
            </li>
          )) : <li className="text-neutral-500">暂无引文</li>}
        </ul>
      </div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  )
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs text-neutral-500">{title}</h3>
      <p className="mt-1 text-sm leading-6">{text}</p>
    </div>
  )
}

function List({ title, items, empty = '暂无' }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs text-neutral-500">{title}</h3>
      {items.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : <p className="mt-1 text-sm text-neutral-500">{empty}</p>}
    </div>
  )
}

export function FilterButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs ${pressed ? 'bg-neutral-950 text-white' : 'bg-[#f3f3f1] text-neutral-800'}`}
    >
      {children}
    </button>
  )
}
