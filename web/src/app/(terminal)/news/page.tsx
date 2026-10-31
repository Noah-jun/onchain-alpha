'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { DailyHotTweet, DailySection, NewsArticle } from '@/domain/types'
import { DAILY_SECTION_FALLBACK } from '@/domain/dailySections'
import { formatShanghai } from '@/domain/format'
import { Assets, DataNotice, EmptyBlock, ErrorBlock, FilterButton, HeatTags, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { researchHeaders } from '@/components/terminal/settings'
import { CopySwitch, TranslateAllToggle, useTranslatedCopy } from '@/components/terminal/translate'
import { rememberSeen } from '@/components/terminal/seen'
import { shortTitle } from '@/domain/newsText'

interface NewsResponse {
  items: NewsArticle[]
  provenance: NewsArticle['provenance']
  error: string | null
  sections?: DailySection[]
  tweets?: DailyHotTweet[]
  listingExchanges?: string[]
  listingConfigured?: boolean
  listingError?: string | null
}

export default function NewsPage() {
  const { data, loading, error, reload } = useResearch<NewsResponse>('/api/research/news')
  const [section, setSection] = useState('全部')
  const [sectionData, setSectionData] = useState<NewsResponse | null>(null)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [sectionError, setSectionError] = useState('')
  const [sectionRetry, setSectionRetry] = useState(0)
  const [eventType, setEventType] = useState('全部')
  const [exchange, setExchange] = useState('全部')
  const [listingAction, setListingAction] = useState('全部')
  const [sentiment, setSentiment] = useState('全部')
  const [heat, setHeat] = useState('全部')
  const [query, setQuery] = useState('')
  const listingMode = eventType === '上新/下架'
  const showingSection = section !== '全部' && !listingMode
  const items = showingSection ? (sectionData?.items ?? []) : (data?.items ?? [])
  const sections = data?.sections?.length ? data.sections : (sectionData?.sections?.length ? sectionData.sections : DAILY_SECTION_FALLBACK)
  useEffect(() => {
    if (data?.items.length) rememberSeen('news', data.items)
  }, [data])
  useEffect(() => {
    if (section === '全部') return
    const controller = new AbortController()
    setSectionLoading(true)
    setSectionError('')
    setSectionData(null)
    fetch(`/api/research/news?subcategory=${encodeURIComponent(section)}`, { cache: 'no-store', headers: researchHeaders(), signal: controller.signal })
      .then(async (response) => {
        const json = await response.json() as NewsResponse
        if (!response.ok) throw new Error(json.error || '加载失败')
        if (controller.signal.aborted) return
        setSectionData(json)
        if (json.items.length) rememberSeen('news', json.items)
      })
      .catch((caught) => {
        if (controller.signal.aborted) return
        setSectionError(caught instanceof Error ? caught.message : '加载失败')
      })
      .finally(() => {
        if (!controller.signal.aborted) setSectionLoading(false)
      })
    return () => controller.abort()
  }, [section, sectionRetry])
  const eventTypes = useMemo(() => withCurrent(['全部', ...new Set(items.map((item) => item.analysis.eventType))], eventType).filter((item) => item !== '上新/下架'), [items, eventType])
  const sentiments = useMemo(() => withCurrent(['全部', ...new Set(items.map((item) => item.analysis.sentiment))], sentiment), [items, sentiment])
  const filtered = items.filter((item) => {
    if (listingMode) {
      if (!item.listing) return false
      if (exchange !== '全部' && item.listing.exchange !== exchange) return false
      if (listingAction !== '全部' && item.listing.action !== listingAction) return false
    } else if (eventType !== '全部' && item.analysis.eventType !== eventType) return false
    if (sentiment !== '全部' && item.analysis.sentiment !== sentiment) return false
    if (heat === '社交热度高' && !item.analysis.heatTags.includes('社交热度高')) return false
    if (heat === '基本面有支撑' && !item.analysis.heatTags.includes('基本面有支撑')) return false
    if (heat === '未区分' && item.analysis.heatTags.length) return false
    const blob = `${item.title} ${item.analysis.relatedAssets.join(' ')}`.toLowerCase()
    if (query && !blob.includes(query.trim().toLowerCase())) return false
    return true
  })
  if (listingMode) filtered.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  const view = showingSection ? sectionData : data
  const tweets = showingSection ? (sectionData?.tweets ?? []) : []

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
          <DataNotice provenance={showingSection ? sectionData?.provenance : data.provenance} error={showingSection ? sectionData?.error : data.error} />
          <div className="mb-4 space-y-3">
            <label className="block text-xs text-neutral-500">
              搜索标题或资产
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded border border-[#e7e7e4] bg-[#f7f7f5] px-3 py-2 text-sm" />
            </label>
            <div>
              <p className="mb-2 text-xs text-neutral-500">日报板块</p>
              <div className="flex flex-wrap gap-2">
                <FilterButton pressed={section === '全部'} onClick={() => { setSection('全部'); if (listingMode) setEventType('全部') }}>全部</FilterButton>
                {sections.map((item) => (
                  <FilterButton key={item.key} pressed={section === item.key} onClick={() => { setSection(item.key); if (listingMode) setEventType('全部') }}>{item.nameZh}</FilterButton>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((item) => <FilterButton key={item} pressed={eventType === item} onClick={() => setEventType(item)}>{item}</FilterButton>)}
              <FilterButton pressed={listingMode} onClick={() => { setEventType('上新/下架'); setSection('全部') }}>上新/下架</FilterButton>
            </div>
            {listingMode && data.listingConfigured ? (
              <>
                <div>
                  <p className="mb-2 text-xs text-neutral-500">交易所</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterButton pressed={exchange === '全部'} onClick={() => setExchange('全部')}>全部</FilterButton>
                    {(data.listingExchanges ?? []).map((item) => (
                      <FilterButton key={item} pressed={exchange === item} onClick={() => setExchange(item)}>{item}</FilterButton>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs text-neutral-500">上新/下架</p>
                  <div className="flex flex-wrap gap-2">
                    {['全部', '上新', '下架'].map((item) => (
                      <FilterButton key={item} pressed={listingAction === item} onClick={() => setListingAction(item)}>{item}</FilterButton>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {sentiments.map((item) => <FilterButton key={item} pressed={sentiment === item} onClick={() => setSentiment(item)}>{item}</FilterButton>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {['全部', '社交热度高', '基本面有支撑', '未区分'].map((item) => (
                <FilterButton key={item} pressed={heat === item} onClick={() => setHeat(item)}>{item}</FilterButton>
              ))}
            </div>
          </div>
          {showingSection && sectionLoading ? <LoadingBlock /> : null}
          {showingSection && sectionError && !sectionData ? <ErrorBlock message={sectionError} onRetry={() => setSectionRetry((value) => value + 1)} /> : null}
          {listingMode && data.listingConfigured === false ? <EmptyBlock title="未配置" detail={data.listingError || '未配置。请在设置页保存 NEWSLIQUID_API_TOKEN，或在服务端环境变量中设置。'} /> : !showingSection || sectionData ? (
            filtered.length ? (
              <ul className="space-y-3">
                {filtered.map((article) => <NewsCard key={article.id} article={article} />)}
              </ul>
            ) : <EmptyBlock title={(view?.provenance ?? data.provenance).mode === 'unconfigured' ? '未配置' : '暂无符合条件的新闻'} detail={(view?.provenance ?? data.provenance).note} />
          ) : null}
          {tweets.length ? <DailyTweets tweets={tweets} /> : null}
        </>
      ) : null}
    </div>
  )
}

function withCurrent(values: string[], current: string): string[] {
  if (values.includes(current)) return values
  return [...values, current]
}

function dailyTag(article: NewsArticle): string | null {
  const grade = article.daily?.grade
  const score = article.daily?.score
  if (!grade && score == null) return null
  if (grade && score != null) return `评级 ${grade} · ${score}`
  if (grade) return `评级 ${grade}`
  return `评级 · ${score}`
}

function DailyTweets({ tweets }: { tweets: DailyHotTweet[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">相关热门推文</h2>
      <ul className="mt-2 space-y-2">
        {tweets.map((tweet) => (
          <li key={tweet.id} className="rounded-lg border border-[#e7e7e4] bg-white p-3">
            <p className="text-xs text-neutral-500">{tweet.author}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-800">{tweet.text}</p>
            {tweet.url ? <a className="mt-1 inline-block text-xs underline" href={tweet.url} target="_blank" rel="noreferrer">x.com</a> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function NewsCard({ article }: { article: NewsArticle }) {
  const title = shortTitle(article.title, article.summary, article.body)
  const tag = dailyTag(article)
  const copy = useTranslatedCopy([
    { text: title, zh: title === article.title ? article.sourceZh?.title : undefined },
  ])
  return (
    <li>
      <article className="rounded-lg border border-[#e7e7e4] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <span>{article.publisher} · {formatShanghai(article.publishedAt)}</span>
          <span>{article.provenance.mode === 'demo' ? '演示' : article.provenance.mode === 'live' ? '实时' : '未配置'}</span>
        </div>
        <h2 className="mt-2 text-base font-medium leading-6">
          <Link href={`/news/${article.id}`} className="line-clamp-2 text-neutral-900">{copy.view(title)}</Link>
        </h2>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span>{article.analysis.eventType}</span>
          <Assets assets={article.analysis.relatedAssets} />
          <span>{article.analysis.sentiment}</span>
          {article.listing ? <span className="rounded-full bg-[#f3f3f1] px-2 py-0.5 text-neutral-700">{article.listing.exchange}</span> : null}
          {article.listing ? <span className="rounded-full bg-[#f3f3f1] px-2 py-0.5 text-neutral-700">{article.listing.action}</span> : null}
          {article.listing && article.url ? <a className="underline" href={article.url} target="_blank" rel="noreferrer">原文</a> : null}
          {tag ? <span className="rounded-full bg-[#f3f3f1] px-2 py-0.5 text-neutral-700">{tag}</span> : null}
          <HeatTags tags={article.analysis.heatTags} />
        </p>
        <CopySwitch copy={copy} />
      </article>
    </li>
  )
}
