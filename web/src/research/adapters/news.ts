import type { NewsArticle, Provenance, ResearchNote } from '@/domain/types'
import { DEMO_NEWS } from '@/research/demo/catalog'
import { resolveProvider } from '@/research/env'
import { fetchJson } from '@/research/http'
import { demoProvenance, failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'

export async function loadNews(): Promise<{ items: NewsArticle[]; provenance: Provenance; error: string | null }> {
  const choice = resolveProvider('NEWS_PROVIDER', ['cryptopanic'], 'NEWS_API_KEY')
  if (choice.kind === 'demo') {
    return { items: DEMO_NEWS, provenance: demoProvenance('演示新闻稿'), error: null }
  }
  if (choice.kind === 'unconfigured') {
    return { items: [], provenance: unconfiguredProvenance('新闻', choice.reason), error: choice.reason }
  }
  try {
    const token = process.env.NEWS_API_KEY!.trim()
    const body = await fetchJson<{ results?: CryptoPanicPost[] }>(
      `https://cryptopanic.com/api/v1/posts/?auth_token=${encodeURIComponent(token)}&public=true&kind=news`
    )
    const results = body.results ?? []
    if (!Array.isArray(results)) throw new Error('返回结构无法识别')
    const items = results.slice(0, 30).map(toArticle)
    return {
      items,
      provenance: liveProvenance('CryptoPanic', new Date().toISOString(), '只映射标题、时间和链接。影响判断保持未知。', 'https://cryptopanic.com'),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return {
      items: [],
      provenance: failedLiveProvenance('CryptoPanic', `新闻源请求失败（${message}），未回退到演示稿`),
      error: message,
    }
  }
}

export async function loadNewsItem(id: string): Promise<NewsArticle | null> {
  const list = await loadNews()
  return list.items.find((item) => item.id === id) ?? null
}

interface CryptoPanicPost {
  title?: string
  published_at?: string
  url?: string
  source?: { title?: string }
  currencies?: { code?: string }[]
}

function toArticle(post: CryptoPanicPost, index: number): NewsArticle {
  const title = post.title?.trim() || '未命名新闻'
  const publishedAt = post.published_at || new Date().toISOString()
  const assets = (post.currencies ?? []).map((item) => item.code).filter((code): code is string => Boolean(code))
  const analysis: ResearchNote = {
    eventType: '未分类',
    relatedAssets: assets,
    sentiment: '未知',
    impact: '实时源只提供标题，不能判断影响。',
    impactPath: '标题可见，正文与传导路径未知。',
    timeHorizon: '未知',
    evidence: [{ quote: title, source: post.source?.title || 'CryptoPanic', url: post.url ?? null }],
    risks: ['标题可能与正文不符。', '聚合站转载不等于事件已被确认。'],
    counterpoints: ['有外部链接时可以离开本应用核对原文。'],
    confidence: '低',
    confidenceBasis: '没有全文，也没有第二来源。',
    heatTags: [],
    facts: [`标题：${title}`],
    inferences: [],
    unknowns: ['全文', '事件是否被多方确认', '对价格的影响'],
  }
  return {
    id: `cp-${Buffer.from(`${title}|${publishedAt}|${index}`).toString('base64url').slice(0, 24)}`,
    title,
    summary: '实时条目只有标题。',
    body: 'CryptoPanic 适配器不转载全文。请使用原始链接核对。',
    publishedAt,
    publisher: post.source?.title || 'CryptoPanic',
    url: post.url ?? null,
    analysis,
    provenance: liveProvenance(post.source?.title || 'CryptoPanic', publishedAt, '单条新闻', post.url ?? null),
  }
}
