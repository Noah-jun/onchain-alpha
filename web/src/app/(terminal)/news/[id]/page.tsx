'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { NewsArticle } from '@/domain/types'
import { formatShanghai } from '@/domain/format'
import { AnalysisCard, DataNotice, ErrorBlock, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, loading, error, reload } = useResearch<NewsArticle>(params.id ? `/api/research/news/${params.id}` : null)
  return (
    <div>
      <Link href="/news" className="text-xs text-neutral-500">← 热点新闻</Link>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="mt-4 space-y-4">
          <PageIntro kicker={data.analysis.eventType} title={data.title}>
            {data.publisher} · {formatShanghai(data.publishedAt)}
            {data.url ? <a className="ml-2 underline" href={data.url} target="_blank" rel="noreferrer">原文</a> : ' · 无外部链接'}
          </PageIntro>
          <DataNotice provenance={data.provenance} />
          <article className="rounded-lg border border-[#e7e7e4] bg-white p-4 text-sm leading-7">
            <p>{data.summary}</p>
            <p className="mt-3">{data.body}</p>
          </article>
          <AnalysisCard note={data.analysis} />
          <ChatPanel
            context={{ type: 'news', id: data.id }}
            prompts={['这条新闻的相关资产是什么？', '社交热度和基本面分别怎么标？', '置信度的依据是什么？', '能保证据此获利吗？']}
          />
        </div>
      ) : null}
    </div>
  )
}
