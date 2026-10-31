import type { DailyHotTweet, DailySection, NewsArticle, Provenance, ResearchNote } from '@/domain/types'
import { DEMO_NEWS } from '@/research/demo/catalog'
import { contentFingerprint, canonicalUrl, dedupeByFingerprint } from '@/research/dedupe'
import { demoAllowed, envSet, missingKey, secretValue } from '@/research/env'
import { fetchJson } from '@/research/http'
import { loadDailyHotArticles, loadDailyHotBundle, loadDailySections, loadOpenNewsArticles, newsliquidConfigured, newsliquidMissing } from '@/research/newsliquid/content'
import { demoProvenance, failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'
import { recallItem, rememberItems } from '@/research/seenCache'

export async function loadNews(): Promise<{ items: NewsArticle[]; provenance: Provenance; error: string | null }> {
  const result = await collectNews()
  if (result.items.length) await rememberItems('news', result.items)
  return result
}

async function collectNews(): Promise<{ items: NewsArticle[]; provenance: Provenance; error: string | null }> {
  if (demoAllowed()) {
    return { items: DEMO_NEWS, provenance: demoProvenance('演示新闻稿', 'RESEARCH_ALLOW_DEMO=1，这些是演示稿，不是实时新闻。'), error: null }
  }
  const items: NewsArticle[] = []
  const problems: string[] = []
  if (!newsliquidConfigured()) {
    problems.push(newsliquidMissing())
  } else {
    try {
      items.push(...await loadOpenNewsArticles())
    } catch (error) {
      problems.push(`OpenNews 失败：${error instanceof Error ? error.message : '请求失败'}`)
    }
  }
  try {
    items.push(...await loadDailyHotArticles())
  } catch (error) {
    problems.push(`每日热点失败：${error instanceof Error ? error.message : '请求失败'}`)
  }
  if (!items.length && envSet('NEWS_API_KEY')) {
    const fallback = await loadCryptoPanic()
    if (fallback.items.length || !problems.length) return fallback
    return {
      items: fallback.items,
      provenance: fallback.provenance,
      error: [...problems, fallback.error].filter(Boolean).join('；'),
    }
  }
  if (!items.length) {
    const reason = problems.join('；') || missingKey('NEWSLIQUID_API_TOKEN')
    const unconfigured = !newsliquidConfigured() && problems.every((item) => item.includes('NEWSLIQUID_API_TOKEN') || item.includes('每日热点'))
    return {
      items: [],
      provenance: unconfigured
        ? unconfiguredProvenance('OpenNews', newsliquidMissing())
        : failedLiveProvenance('OpenNews / 6551 daily-news', reason),
      error: reason,
    }
  }
  const unique = dedupeNews(items)
  return {
    items: unique,
    provenance: liveProvenance(
      newsliquidConfigured() ? 'OpenNews / 6551 daily-news' : '6551 daily-news',
      new Date().toISOString(),
      problems.length ? problems.join('；') : 'OpenNews 与每日热点。CryptoPanic 只在这两者都没有结果且配置了 NEWS_API_KEY 时使用。',
      'https://ai.6551.io'
    ),
    error: problems.find((item) => item.includes('NEWSLIQUID_API_TOKEN')) || null,
  }
}

async function loadCryptoPanic(): Promise<{ items: NewsArticle[]; provenance: Provenance; error: string | null }> {
  try {
    const token = secretValue('NEWS_API_KEY') || ''
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

export async function loadNewsSection(subcategory: string): Promise<{ items: NewsArticle[]; tweets: DailyHotTweet[]; sections: DailySection[]; provenance: Provenance; error: string | null }> {
  const sections = await loadDailySections()
  const match = /^[a-z0-9_]+$/.test(subcategory) ? sections.find((item) => item.key === subcategory) : undefined
  if (!match) {
    return {
      items: [],
      tweets: [],
      sections,
      provenance: failedLiveProvenance('6551 daily-news', '未知日报板块', 'https://ai.6551.io/open/free_hot'),
      error: '未知日报板块',
    }
  }
  try {
    const bundle = await loadDailyHotBundle(subcategory)
    const items = dedupeNews(bundle.items)
    if (items.length) await rememberItems('news', items)
    return {
      items,
      tweets: bundle.tweets,
      sections,
      provenance: liveProvenance('6551 daily-news', bundle.updatedAt, `${match.nameZh}。GET /open/free_hot?category=web3&subcategory=${subcategory}`, 'https://ai.6551.io/open/free_hot'),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return {
      items: [],
      tweets: [],
      sections,
      provenance: failedLiveProvenance('6551 daily-news', `每日热点失败：${message}`, 'https://ai.6551.io/open/free_hot'),
      error: `每日热点失败：${message}`,
    }
  }
}

export async function loadNewsItem(id: string): Promise<NewsArticle | null> {
  const cached = await recallItem<NewsArticle>('news', id)
  if (cached) return cached
  const list = await loadNews()
  const found = list.items.find((item) => item.id === id)
  if (found) return found
  if (!id.startsWith('daily-')) return null
  const sections = await loadDailySections()
  const bundles = await Promise.all(sections.map((section) => loadDailyHotBundle(section.key).catch(() => null)))
  for (const bundle of bundles) {
    const item = bundle?.items.find((article) => article.id === id)
    if (!item) continue
    await rememberItems('news', [item])
    return item
  }
  return null
}

function dedupeNews(items: NewsArticle[]): NewsArticle[] {
  return dedupeByFingerprint(items, {
    fingerprint: (item) => [canonicalUrl(item.url) || '', contentFingerprint(item.title, `${item.summary} ${item.body}`)],
    rank: (item) => (item.analysis.confidence === '高' ? 3 : item.analysis.confidence === '中' ? 2 : 1) * 1_000_000_000_000 + new Date(item.publishedAt).getTime(),
  })
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
