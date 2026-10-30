'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { DiscussionTopic } from '@/domain/types'
import { formatShanghai } from '@/domain/format'
import { AnalysisCard, Assets, DataNotice, ErrorBlock, HeatTags, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'

export default function DiscussionDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, loading, error, reload } = useResearch<DiscussionTopic>(params.id ? `/api/research/discussions/${params.id}` : null)
  return (
    <div>
      <Link href="/discussions" className="text-xs text-[#9aabbd]">← 热门讨论</Link>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="mt-4 space-y-4">
          <PageIntro kicker={data.category} title={data.topic}>
            {data.date} · 帖文 {data.postCount} · 账号 {data.authorCount} · 热度 {data.heat}
          </PageIntro>
          <DataNotice provenance={data.provenance} />
          <p className="text-sm leading-6"><Assets assets={data.assets} /> · <HeatTags tags={data.heatTags} /></p>
          <p className="text-sm leading-7 text-[#c5d0dc]">{data.summary}</p>
          <section className="space-y-3">
            {data.posts.map((post) => (
              <article key={post.id} className="rounded-lg border border-[#2a3848] bg-[#141c26] p-4 text-sm">
                <p className="text-xs text-[#9aabbd]">{post.author} · {formatShanghai(post.postedAt)} · {post.note}</p>
                <p className="mt-2 leading-6">{post.text}</p>
                {post.url ? <a className="mt-2 inline-block text-xs underline" href={post.url} target="_blank" rel="noreferrer">原帖</a> : <p className="mt-2 text-xs text-[#9aabbd]">无外部链接</p>}
              </article>
            ))}
          </section>
          <AnalysisCard note={data.analysis} />
          <ChatPanel
            context={{ type: 'discussion', id: data.id }}
            prompts={['这些帖文是实时的吗？', '热度能不能说明交易价值？', '相关资产识别了吗？']}
          />
        </div>
      ) : null}
    </div>
  )
}
