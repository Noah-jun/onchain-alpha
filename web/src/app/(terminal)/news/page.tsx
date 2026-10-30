'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { NewsArticle } from '@/domain/types'
import { formatShanghai } from '@/domain/format'
import { Assets, DataNotice, EmptyBlock, ErrorBlock, FilterButton, HeatTags, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { CopySwitch, TranslateAllToggle, useTranslatedCopy } from '@/components/terminal/translate'

interface NewsResponse {
  items: NewsArticle[]
  provenance: NewsArticle['provenance']
  error: string | null
}

export default function NewsPage() {
  const { data, loading, error, reload } = useResearch<NewsResponse>('/api/research/news')
  const [eventType, setEventType] = useState('全部')
  const [sentiment, setSentiment] = useState('全部')
  const [heat, setHeat] = useState('全部')
  const [query, setQuery] = useState('')
  const items = data?.items ?? []
  const eventTypes = useMemo(() => ['全部', ...new Set(items.map((item) => item.analysis.eventType))], [items])
  const sentiments = useMemo(() => ['全部', ...new Set(items.map((item) => item.analysis.sentiment))], [items])
  const filtered = items.filter((item) => {
    if (eventType !== '全部' && item.analysis.eventType !== eventType) return false
    if (sentiment !== '全部' && item.analysis.sentiment !== sentiment) return false
    if (heat === '社交热度高' && !item.analysis.heatTags.includes('社交热度高')) return false
    if (heat === '基本面有支撑' && !item.analysis.heatTags.includes('基本面有支撑')) return false
    if (heat === '未区分' && item.analysis.heatTags.length) return false
    const blob = `${item.title} ${item.analysis.relatedAssets.join(' ')}`.toLowerCase()
    if (query && !blob.includes(query.trim().toLowerCase())) return false
    return true
  })

  return (
    <div>
      <PageIntro kicker="新闻" title="热点新闻">
        优先使用 OpenNews 和 6551 每日热点。相同链接，或去掉标点和来源前缀后相同的标题，只保留一条。没有 NewsLiquid token 时 OpenNews 显示未配置，每日热点仍可能有数据。英文条目可以翻译成中文，原文仍可切换回来。
      </PageIntro>
      <TranslateAllToggle />
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <DataNotice provenance={data.provenance} error={data.error} />
          <div className="mb-4 space-y-3">
            <label className="block text-xs text-neutral-500">
              搜索标题或资产
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded border border-[#e7e7e4] bg-[#f7f7f5] px-3 py-2 text-sm" />
            </label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((item) => <FilterButton key={item} pressed={eventType === item} onClick={() => setEventType(item)}>{item}</FilterButton>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {sentiments.map((item) => <FilterButton key={item} pressed={sentiment === item} onClick={() => setSentiment(item)}>{item}</FilterButton>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {['全部', '社交热度高', '基本面有支撑', '未区分'].map((item) => (
                <FilterButton key={item} pressed={heat === item} onClick={() => setHeat(item)}>{item}</FilterButton>
              ))}
            </div>
          </div>
          {filtered.length ? (
            <ul className="space-y-3">
              {filtered.map((article) => <NewsCard key={article.id} article={article} />)}
            </ul>
          ) : <EmptyBlock title={data.provenance.mode === 'unconfigured' ? '未配置' : '暂无符合条件的新闻'} detail={data.provenance.note} />}
        </>
      ) : null}
    </div>
  )
}

function NewsCard({ article }: { article: NewsArticle }) {
  const copy = useTranslatedCopy([
    { text: article.title, zh: article.sourceZh?.title },
    { text: article.summary, zh: article.sourceZh?.summary },
  ])
  return (
    <li>
      <article className="rounded-lg border border-[#e7e7e4] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <span>{article.publisher} · {formatShanghai(article.publishedAt)}</span>
          <span>{article.provenance.mode === 'demo' ? '演示' : article.provenance.mode === 'live' ? '实时' : '未配置'}</span>
        </div>
        <h2 className="mt-2 text-lg">
          <Link href={`/news/${article.id}`} className="hover:underline">{copy.view(article.title)}</Link>
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-700">{copy.view(article.summary)}</p>
        <p className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
          <span>{article.analysis.eventType}</span>
          <Assets assets={article.analysis.relatedAssets} />
          <span>{article.analysis.sentiment}</span>
          <HeatTags tags={article.analysis.heatTags} />
        </p>
        <CopySwitch copy={copy} />
      </article>
    </li>
  )
}
