'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { DiscussionTopic } from '@/domain/types'
import { Assets, DataNotice, EmptyBlock, ErrorBlock, FilterButton, HeatTags, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'

interface DiscussionResponse {
  items: DiscussionTopic[]
  provenance: DiscussionTopic['provenance']
  error: string | null
}

type SortKey = 'heat' | 'postCount' | 'authorCount' | 'date' | 'topic'

export default function DiscussionsPage() {
  const { data, loading, error, reload } = useResearch<DiscussionResponse>('/api/research/discussions')
  const [category, setCategory] = useState('全部')
  const [heat, setHeat] = useState('全部')
  const [sortKey, setSortKey] = useState<SortKey>('heat')
  const [direction, setDirection] = useState<'desc' | 'asc'>('desc')
  const items = data?.items ?? []
  const categories = useMemo(() => ['全部', ...new Set(items.map((item) => item.category))], [items])
  const filtered = items.filter((item) => {
    if (category !== '全部' && item.category !== category) return false
    if (heat === '社交热度高' && !item.heatTags.includes('社交热度高')) return false
    if (heat === '基本面有支撑' && !item.heatTags.includes('基本面有支撑')) return false
    if (heat === '未区分' && item.heatTags.length) return false
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    const left = sortKey === 'date' ? a.date : a[sortKey]
    const right = sortKey === 'date' ? b.date : b[sortKey]
    const compared = left < right ? -1 : left > right ? 1 : 0
    return direction === 'asc' ? compared : -compared
  })

  function toggle(key: SortKey) {
    if (sortKey === key) setDirection((value) => value === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setDirection(key === 'date' || key === 'heat' ? 'desc' : 'desc')
    }
  }

  return (
    <div>
      <PageIntro kicker="讨论" title="热门讨论">
        讨论来自 X 的 recent search。没有 Bearer Token 时这里保持未配置，不展示伪造帖文。
      </PageIntro>
      {loading && !data ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <DataNotice provenance={data.provenance} error={data.error} />
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((item) => <FilterButton key={item} pressed={category === item} onClick={() => setCategory(item)}>{item}</FilterButton>)}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {['全部', '社交热度高', '基本面有支撑', '未区分'].map((item) => (
              <FilterButton key={item} pressed={heat === item} onClick={() => setHeat(item)}>{item}</FilterButton>
            ))}
          </div>
          {sorted.length ? (
            <div className="overflow-x-auto rounded-lg border border-[#e7e7e4]">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <Sortable label="话题" onClick={() => toggle('topic')} />
                    <Sortable label="日期" onClick={() => toggle('date')} />
                    <th className="px-3 py-2 font-medium">分类</th>
                    <Sortable label="帖文" onClick={() => toggle('postCount')} />
                    <Sortable label="账号" onClick={() => toggle('authorCount')} />
                    <Sortable label="热度" onClick={() => toggle('heat')} />
                    <th className="px-3 py-2 font-medium">资产 / 标签</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((topic) => (
                    <tr key={topic.id} className="border-t border-[#e7e7e4]">
                      <td className="px-3 py-3"><Link className="underline" href={`/discussions/${topic.id}`}>{topic.topic}</Link></td>
                      <td className="num px-3 py-3">{topic.date}</td>
                      <td className="px-3 py-3">{topic.category}</td>
                      <td className="num px-3 py-3">{topic.postCount}</td>
                      <td className="num px-3 py-3">{topic.authorCount}</td>
                      <td className="num px-3 py-3">{topic.heat}</td>
                      <td className="px-3 py-3"><Assets assets={topic.assets} /> <HeatTags tags={topic.heatTags} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyBlock title={data.provenance.mode === 'unconfigured' ? '未配置' : '暂无符合条件的讨论'} detail={data.provenance.note} />}
          <p className="mt-3 text-xs text-neutral-500">当前排序：{sortKey === 'heat' ? '热度' : sortKey === 'date' ? '日期' : sortKey === 'postCount' ? '帖文数' : '账号数'} {direction === 'desc' ? '从高到低' : '从低到高'}。</p>
        </>
      ) : null}
    </div>
  )
}

function Sortable({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-3 py-2 font-medium">
      <button type="button" className="underline" onClick={onClick}>{label}</button>
    </th>
  )
}
