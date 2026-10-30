'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { DiscussionTopic } from '@/domain/types'
import { formatShanghai } from '@/domain/format'
import { AnalysisCard, Assets, DataNotice, ErrorBlock, HeatTags, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'
import { CopySwitch, TranslateAllToggle, useTranslatedCopy } from '@/components/terminal/translate'

export default function DiscussionDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, loading, error, reload } = useResearch<DiscussionTopic>(params.id ? `/api/research/discussions/${params.id}` : null)
  return (
    <div>
      <Link href="/discussions" className="text-xs text-neutral-500">← 热门讨论</Link>
      <div className="mt-4"><TranslateAllToggle /></div>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? <DiscussionDetail topic={data} /> : null}
    </div>
  )
}

function DiscussionDetail({ topic }: { topic: DiscussionTopic }) {
  const summaryZh = topic.summary === topic.posts[0]?.text ? topic.posts[0]?.sourceZh : topic.sourceZh
  const copy = useTranslatedCopy([
    { text: topic.topic, zh: topic.sourceZh },
    { text: topic.summary, zh: summaryZh },
  ])
  return (
    <div className="mt-4 space-y-4">
      <PageIntro kicker={topic.category} title={copy.view(topic.topic)}>
        {topic.date} · 帖文 {topic.postCount} · 账号 {topic.authorCount} · 热度 {topic.heat}
      </PageIntro>
      <CopySwitch copy={copy} />
      <DataNotice provenance={topic.provenance} />
      <p className="text-sm leading-6"><Assets assets={topic.assets} /> · <HeatTags tags={topic.heatTags} /></p>
      <p className="text-sm leading-7 text-neutral-700">{copy.view(topic.summary)}</p>
      <section className="space-y-3">
        {topic.posts.map((post) => <PostCard key={post.id} post={post} />)}
      </section>
      <AnalysisCard note={topic.analysis} />
      <ChatPanel
        context={{ type: 'discussion', id: topic.id }}
        prompts={['这些帖文是实时的吗？', '热度能不能说明交易价值？', '相关资产识别了吗？']}
      />
    </div>
  )
}

function PostCard({ post }: { post: DiscussionTopic['posts'][number] }) {
  const copy = useTranslatedCopy([{ text: post.text, zh: post.sourceZh }])
  return (
    <article className="rounded-lg border border-[#e7e7e4] bg-white p-4 text-sm">
      <p className="text-xs text-neutral-500">{post.author} · {formatShanghai(post.postedAt)} · {post.note}</p>
      <p className="mt-2 leading-6">{copy.view(post.text)}</p>
      <CopySwitch copy={copy} />
      {post.url ? <a className="mt-2 inline-block text-xs underline" href={post.url} target="_blank" rel="noreferrer">原帖</a> : <p className="mt-2 text-xs text-neutral-500">无外部链接</p>}
    </article>
  )
}
