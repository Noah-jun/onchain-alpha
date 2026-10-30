'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { NewsArticle } from '@/domain/types'
import { formatShanghai } from '@/domain/format'
import { AnalysisCard, DataNotice, ErrorBlock, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'
import { CopySwitch, TranslateAllToggle, useTranslatedCopy } from '@/components/terminal/translate'
import { recallSeen } from '@/components/terminal/seen'
import { articleText, newsParagraphs, shortTitle } from '@/domain/newsText'
import { researchHeaders } from '@/components/terminal/settings'
import type { NewsInterpretation } from '@/research/newsInterpret'

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, loading, error, reload } = useResearch<NewsArticle>(params.id ? `/api/research/news/${params.id}` : null)
  const [saved, setSaved] = useState<NewsArticle | null>(null)
  useEffect(() => {
    setSaved(params.id ? recallSeen<NewsArticle>('news', params.id) : null)
  }, [params.id])
  const article = data ?? (error ? saved : null)
  return (
    <div>
      <Link href="/news" className="text-xs text-neutral-500">← 热点新闻</Link>
      <div className="mt-4"><TranslateAllToggle /></div>
      {loading && !article ? <LoadingBlock /> : null}
      {error && !article ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {article ? (
        <div className="space-y-3">
          {error && saved && article === saved ? <p className="text-xs text-neutral-500">最新列表里已经没有这条，下面是打开前保存在这台浏览器里的内容。</p> : null}
          <NewsDetail article={article} />
        </div>
      ) : null}
    </div>
  )
}

function NewsDetail({ article }: { article: NewsArticle }) {
  const title = shortTitle(article.title, article.summary, article.body)
  const body = articleText(article.title, article.summary, article.body)
  const copy = useTranslatedCopy([
    { text: title, zh: title === article.title ? article.sourceZh?.title : undefined },
    { text: body, zh: article.sourceZh?.body },
  ])
  const shownBody = copy.view(body)
  return (
    <div className="space-y-4">
      <PageIntro kicker={article.analysis.eventType} title={copy.view(title)}>
        {article.publisher} · {formatShanghai(article.publishedAt)}
        {article.url ? <a className="ml-2 underline" href={article.url} target="_blank" rel="noreferrer">原文链接</a> : ' · 无外部链接'}
      </PageIntro>
      <CopySwitch copy={copy} />
      <DataNotice provenance={article.provenance} />
      <article className="rounded-lg border border-[#e7e7e4] bg-white p-4 text-sm leading-7">
        {newsParagraphs(shownBody).map((paragraph) => <p key={paragraph} className="mt-3 first:mt-0">{paragraph}</p>)}
      </article>
      <NewsAi articleId={article.id} text={body} />
      <AnalysisCard note={article.analysis} />
      <ChatPanel
        context={{ type: 'news', id: article.id }}
        prompts={['这条新闻的相关资产是什么？', '社交热度和基本面分别怎么标？', '置信度的依据是什么？', '能保证据此获利吗？']}
      />
    </div>
  )
}

const AI_CACHE = 'onchain-alpha.research.news-ai.v1'

function NewsAi({ articleId, text }: { articleId: string; text: string }) {
  const [result, setResult] = useState<NewsInterpretation | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const saved = readAi(articleId)
    if (saved) {
      setResult(saved)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/research/news/${articleId}/interpret`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...researchHeaders() },
      body: JSON.stringify({ text }),
    })
      .then(async (response) => {
        const json = await response.json() as NewsInterpretation
        if (!response.ok) throw new Error(json.error || '未找到该新闻')
        if (cancelled) return
        setResult(json)
        if (json.configured && !json.error) writeAi(articleId, json)
      })
      .catch((caught) => {
        if (!cancelled) setResult({ configured: true, summary: '', points: [], assets: [], impact: '', caveats: [], error: caught instanceof Error ? caught.message : 'AI 解读失败' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [articleId, text])
  return (
    <section className="rounded-lg border border-[#e7e7e4] bg-white p-4">
      <h2 className="text-sm font-semibold">AI 解读</h2>
      {loading ? <p className="mt-3 text-sm text-neutral-500">正在生成 AI 解读…</p> : null}
      {!loading && result && !result.configured ? <p className="mt-3 text-sm">未配置 AI Key，请到<Link className="underline" href="/settings">设置页</Link>配置</p> : null}
      {!loading && result?.error ? <p className="mt-3 text-sm text-red-700">{result.error}</p> : null}
      {!loading && result?.configured && !result.error ? (
        <div className="mt-3 space-y-3 text-sm leading-6">
          <p><span className="text-neutral-500">一句话摘要</span> {result.summary}</p>
          <List title="关键要点" items={result.points} />
          <List title="涉及资产/项目" items={result.assets} />
          <p><span className="text-neutral-500">对市场的潜在影响</span> {result.impact}</p>
          <List title="需要注意/待核实" items={result.caveats} />
        </div>
      ) : null}
    </section>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs text-neutral-500">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

function readAi(id: string): NewsInterpretation | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(AI_CACHE) || '{}') as Record<string, NewsInterpretation>
    const hit = parsed[id]
    return hit?.configured && !hit.error ? hit : null
  } catch {
    return null
  }
}

function writeAi(id: string, value: NewsInterpretation) {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(AI_CACHE) || '{}') as Record<string, NewsInterpretation>
    parsed[id] = value
    const entries = Object.entries(parsed).slice(-40)
    window.sessionStorage.setItem(AI_CACHE, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Session storage can be full. The server cache still applies.
  }
}
