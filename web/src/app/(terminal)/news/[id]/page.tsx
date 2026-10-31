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
import { AgentReadingPanel } from '@/components/terminal/AgentReading'

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
      <AgentReadingPanel agent="新闻解读 Agent" endpoint={`/api/research/news/${article.id}/interpret`} scope="news" id={article.id} sample={body} />
      <AnalysisCard note={article.analysis} />
      <ChatPanel
        context={{ type: 'news', id: article.id }}
        prompts={['这条新闻的相关资产是什么？', '社交热度和基本面分别怎么标？', '置信度的依据是什么？', '能保证据此获利吗？']}
      />
    </div>
  )
}

