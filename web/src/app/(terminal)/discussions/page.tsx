'use client'

import { useEffect, useState } from 'react'
import { researchHeaders } from '@/components/terminal/settings'
import { DataNotice, EmptyBlock, ErrorBlock, FilterButton, LoadingBlock, PageIntro } from '@/components/terminal/ui'
import { CopySwitch, TranslateAllToggle, useTranslatedCopy } from '@/components/terminal/translate'
import { AgentReadingPanel } from '@/components/terminal/AgentReading'
import { topicSampleSignature } from '@/domain/agentPrompt'
import type { TopicBoard, TopicCard, TopicKind } from '@/research/topicBoard'

const FILTERS: Array<'全部' | TopicKind> = ['全部', '事件', 'Meme', '项目', '新东西']

export default function DiscussionsPage() {
  const [board, setBoard] = useState<TopicBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('全部')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/research/discussions/board', { cache: 'no-store', headers: researchHeaders() })
      .then(async (response) => {
        const json = await response.json() as TopicBoard
        if (!response.ok) throw new Error(json.error || '加载失败')
        if (!cancelled) {
          setBoard(json)
          setError('')
          setSelectedId(json.items[0]?.id ?? null)
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const items = (board?.items ?? []).filter((item) => filter === '全部' || item.kind === filter)
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null

  return (
    <div>
      <PageIntro kicker="讨论" title="热门讨论">
        近期 X 上对象明确、有多人讨论的 Crypto 话题，默认最近 24 小时。热度只统计这次样本。英文内容可以用上方的翻译开关。
      </PageIntro>
      <TranslateAllToggle />
      {loading && !board ? <LoadingBlock /> : null}
      {error && !board ? <ErrorBlock message={error} /> : null}
      {board ? (
        <>
          <DataNotice provenance={board.provenance} error={board.error} />
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <FilterButton key={item} pressed={filter === item} onClick={() => setFilter(item)}>{item}</FilterButton>
            ))}
          </div>
          {board.provenance.mode === 'unconfigured' ? (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <EmptyBlock title="未接入 X 数据源" detail={board.provenance.note} />
              <aside className="rounded-lg border border-[#e7e7e4] bg-white p-4">
                <h2 className="text-sm font-medium">AI 解读未配置</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">没有可展示的话题，所以这里没有事实、社区观点或推断。接入 OpenTwitter 或 X API 之后，才会按真实帖文生成这一栏；没有 AI key 时也只列出帖文和核实结果。</p>
              </aside>
            </div>
          ) : items.length ? (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <ul className="space-y-3">
                {items.map((topic) => (
                  <li key={topic.id}>
                    <TopicRow topic={topic} selected={selected?.id === topic.id} onSelect={() => setSelectedId(topic.id)} />
                  </li>
                ))}
              </ul>
              {selected ? <Reading key={selected.id} topic={selected} /> : null}
            </div>
          ) : <EmptyBlock title={filter === '全部' ? (board.emptyReason || '当前没有足够证据支持的热点') : '这个标签下没有话题'} detail={filter === '全部' ? board.provenance.note : '其他标签里可能还有话题。'} />}
        </>
      ) : null}
    </div>
  )
}

function TopicRow({ topic, selected, onSelect }: { topic: TopicCard; selected: boolean; onSelect: () => void }) {
  const copy = useTranslatedCopy([
    { text: topic.title },
    { text: topic.summary },
  ])
  return (
    <article className={`rounded-lg border bg-white p-4 ${selected ? 'border-neutral-900' : 'border-[#e7e7e4]'}`}>
      <button type="button" className="w-full text-left" onClick={onSelect} aria-pressed={selected}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[#f3f3f1] px-2 py-0.5">{topic.kind}</span>
          <span className="rounded-full bg-[#f3f3f1] px-2 py-0.5">{topic.credibility}</span>
          <span className="num text-neutral-500">热度 {topic.heat}</span>
        </div>
        <h2 className="mt-2 text-base font-medium">{copy.view(topic.title)}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-700">{copy.view(topic.summary)}</p>
        {topic.summaryIsExcerpt ? <p className="mt-1 text-[11px] text-neutral-500">摘要摘自样本帖文，不是另写的结论。</p> : null}
        <p className="mt-3 text-xs leading-5 text-neutral-500">
          帖文 {topic.postCount} · 账号 {topic.authorCount} · {topic.heatNote}
          {topic.trend ? ` · ${topic.trend}` : ' · 增速暂无数据'}
        </p>
        <p className="mt-1 text-xs leading-5 text-neutral-500">{topic.credibilityNote}</p>
      </button>
      <CopySwitch copy={copy} />
    </article>
  )
}

function Reading({ topic }: { topic: TopicCard }) {
  const copy = useTranslatedCopy([
    { text: topic.title },
    { text: topic.summary },
  ])
  const view = (text: string) => copy.view(text)
  const ai = topic.interpretation
  return (
    <aside className="rounded-lg border border-[#e7e7e4] bg-white p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
      <p className="text-xs text-neutral-500">{topic.kind} · {topic.credibility}</p>
      <h2 className="mt-1 text-lg font-medium">{view(topic.title)}</h2>
      <CopySwitch copy={copy} />
      <AgentReadingPanel agent="话题解读 Agent" endpoint="/api/research/discussions/interpret" scope="topic" id={topic.id} sample={topicSampleSignature(topic)} />
      {topic.newReason ? <p className="mt-3 text-xs leading-5 text-neutral-600">新的依据：{topic.newReason}</p> : null}
      {topic.contractNote ? <p className="mt-2 text-xs leading-5 text-neutral-600">合约：{topic.contractStatus}。{topic.contractNote}</p> : null}
      <Block title="营销或异常传播迹象" items={ai.marketing} empty="样本里没有触发刷量或重复营销规则。" />
      <div className="mt-4">
        <h3 className="text-xs text-neutral-500">来源链接</h3>
        {ai.sources.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {ai.sources.map((item) => (
              <li key={item.url}><a className="underline" href={item.url} target="_blank" rel="noreferrer">{item.label}</a></li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-neutral-500">这些帖文没有返回可打开的链接。</p>}
      </div>
    </aside>
  )
}

function Block({ title, items, empty, hint }: { title: string; items: string[]; empty: string; hint?: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs text-neutral-500">{title}</h3>
      {hint ? <p className="mt-1 text-[11px] text-neutral-500">{hint}</p> : null}
      {items.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : empty ? <p className="mt-1 text-sm text-neutral-500">{empty}</p> : null}
    </div>
  )
}
