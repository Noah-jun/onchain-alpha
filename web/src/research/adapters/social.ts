import type { DiscussionPost, DiscussionTopic, Provenance } from '@/domain/types'
import { DEMO_TOPICS } from '@/research/demo/catalog'
import { canonicalUrl, contentFingerprint, dedupeByFingerprint, isLowValuePost } from '@/research/dedupe'
import { demoAllowed, envSet, missingKey, secretValue } from '@/research/env'
import { loadOpenTwitterTopics, loadTweetById, newsliquidConfigured, newsliquidMissing } from '@/research/newsliquid/content'
import { recallItem, rememberItems } from '@/research/seenCache'
import { fetchJson } from '@/research/http'
import { demoProvenance, failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'

export interface SocialAdapter {
  id: string
  listTopics(): Promise<{ items: DiscussionTopic[]; provenance: Provenance; error: string | null }>
}

export function getSocialAdapter(): SocialAdapter {
  if (demoAllowed()) return new DemoSocialAdapter()
  if (!envSet('X_BEARER_TOKEN')) return new UnconfiguredSocialAdapter(missingKey('X_BEARER_TOKEN'))
  return new XRecentSearchAdapter()
}

class DemoSocialAdapter implements SocialAdapter {
  id = 'demo-social'
  async listTopics() {
    return { items: DEMO_TOPICS, provenance: demoProvenance('演示讨论表', 'RESEARCH_ALLOW_DEMO=1，这些帖文不是 X 上的实时内容。'), error: null }
  }
}

class UnconfiguredSocialAdapter implements SocialAdapter {
  id = 'social-unconfigured'
  constructor(private reason: string) {}
  async listTopics() {
    return { items: [] as DiscussionTopic[], provenance: unconfiguredProvenance('X / Twitter', this.reason), error: this.reason }
  }
}

class XRecentSearchAdapter implements SocialAdapter {
  id = 'x-recent-search'
  async listTopics() {
    try {
      const token = secretValue('X_BEARER_TOKEN') || ''
      const query = encodeURIComponent('("bitcoin" OR "ethereum" OR "crypto") -is:retweet lang:en')
      const body = await fetchJson<{ data?: XTweet[]; errors?: { detail?: string }[] }>(
        `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=created_at,author_id,public_metrics`,
        { headers: { authorization: `Bearer ${token}` } }
      )
      if (body.errors?.length) throw new Error(body.errors[0]?.detail || 'X API error')
      const tweets = body.data ?? []
      const posts: DiscussionPost[] = tweets.map((tweet) => ({
        id: tweet.id,
        author: tweet.author_id ? `x-user-${tweet.author_id}` : '未知账号',
        text: tweet.text,
        postedAt: tweet.created_at || new Date().toISOString(),
        url: `https://x.com/i/web/status/${tweet.id}`,
        note: '用户名未展开，账号显示为接口返回的 author_id',
      }))
      const topic: DiscussionTopic = {
        id: 'x-recent',
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
        topic: 'X 最近检索',
        category: 'X API',
        postCount: posts.length,
        authorCount: new Set(posts.map((post) => post.author)).size,
        heat: posts.length,
        sentiment: '未知',
        summary: '这是一次 recent search 的原始结果，没有被改写成热度排行。',
        heatTags: [],
        assets: [],
        posts,
        provenance: liveProvenance('X API v2 recent search', new Date().toISOString(), '只包含本次查询返回的帖文', 'https://api.twitter.com'),
        analysis: {
          eventType: '社交检索',
          relatedAssets: [],
          sentiment: '未知',
          impact: '检索结果只说明这些帖文被 API 返回，不能代表全站热度。',
          impactPath: '查询词 → 最近帖文。没有扩散路径数据。',
          timeHorizon: '未知',
          evidence: posts.slice(0, 2).map((post) => ({ quote: post.text.slice(0, 180), source: post.author, url: post.url })),
          risks: ['查询词会漏掉非英文讨论。', '10 条结果不是完整样本。'],
          counterpoints: ['每条帖文保留了状态链接，可以离开本应用核对。'],
          confidence: '低',
          confidenceBasis: '没有全文上下文之外的曝光量，也没有用户名。',
          heatTags: [],
          facts: posts.slice(0, 5).map((post) => `${post.author}：${post.text.slice(0, 140)}`),
          inferences: [],
          unknowns: ['全站讨论量', '账号身份', '相关资产是否可唯一识别'],
        },
      }
      return {
        items: posts.length ? [topic] : [],
        provenance: liveProvenance('X API v2 recent search', new Date().toISOString(), posts.length ? '查询成功' : '查询成功但没有帖文', 'https://developer.x.com'),
        error: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '请求失败'
      return {
        items: [],
        provenance: failedLiveProvenance('X API', `X 接口请求失败（${message}），未用演示帖冒充实时`),
        error: message,
      }
    }
  }
}

interface XTweet {
  id: string
  text: string
  created_at?: string
  author_id?: string
}

function dedupeTopics(items: DiscussionTopic[]): DiscussionTopic[] {
  const cleaned = items.flatMap((topic) => {
    if (topic.id === 'kol-watch') return [topic]
    const posts = topic.posts.filter((post) => !isLowValuePost(post.text))
    if (!posts.length) return []
    return [{ ...topic, posts, summary: posts[0].text, topic: posts[0].text.slice(0, 80) }]
  })
  return dedupeByFingerprint(cleaned, {
    fingerprint: (topic) => [
      ...topic.posts.flatMap((post) => [canonicalUrl(post.url) || '', post.id ? `post:${post.id}` : '', contentFingerprint(post.text)]),
      contentFingerprint(topic.topic, topic.summary),
    ],
    rank: (topic) => topic.heat * 1_000_000_000_000 + new Date(topic.posts[0]?.postedAt || topic.date).getTime(),
  })
}

async function presentTopics(result: { items: DiscussionTopic[]; provenance: Provenance; error: string | null }) {
  const items = dedupeTopics(result.items)
  if (items.length) await rememberItems('discussion', items)
  return { ...result, items }
}

export async function loadTopics() {
  if (demoAllowed()) return presentTopics(await new DemoSocialAdapter().listTopics())
  if (newsliquidConfigured()) {
    try {
      const items = await loadOpenTwitterTopics()
      const kept = dedupeTopics(items)
      if (kept.length) {
        await rememberItems('discussion', kept)
        return {
          items: kept,
          provenance: kept[0].provenance,
          error: null,
        }
      }
      if (envSet('X_BEARER_TOKEN')) return presentTopics(await new XRecentSearchAdapter().listTopics())
      return {
        items: [],
        provenance: failedLiveProvenance('OpenTwitter', 'OpenTwitter 没有返回帖文，也没有配置 X_BEARER_TOKEN。'),
        error: 'OpenTwitter 没有返回帖文',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '请求失败'
      if (envSet('X_BEARER_TOKEN')) {
        const fallback = await new XRecentSearchAdapter().listTopics()
        return presentTopics({ ...fallback, error: `OpenTwitter 失败：${message}` })
      }
      return {
        items: [],
        provenance: failedLiveProvenance('OpenTwitter', `OpenTwitter 失败：${message}`),
        error: message,
      }
    }
  }
  if (envSet('X_BEARER_TOKEN')) return presentTopics(await new XRecentSearchAdapter().listTopics())
  return new UnconfiguredSocialAdapter(`${newsliquidMissing()}。X_BEARER_TOKEN 是可选兜底。`).listTopics()
}

export async function loadTopic(id: string): Promise<DiscussionTopic | null> {
  const twId = id.startsWith('tw-') ? id.slice(3) : ''
  if (/^\d+$/.test(twId) && newsliquidConfigured()) {
    try {
      const topic = await loadTweetById(twId)
      if (topic) {
        await rememberItems('discussion', [topic])
        return topic
      }
    } catch {
      // The tweet endpoint can miss. The cache and the latest list are the next places to look.
    }
  }
  const cached = await recallItem<DiscussionTopic>('discussion', id)
  if (cached) return cached
  const list = await loadTopics()
  return list.items.find((item) => item.id === id) ?? null
}
