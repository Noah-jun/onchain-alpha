import { createHash } from 'crypto'
import { getCache } from '@vercel/functions'
import type { Provenance } from '@/domain/types'
import { contentFingerprint, isLowValuePost } from '@/research/dedupe'
import { envSet, missingKey, secretValue } from '@/research/env'
import { cached, fetchJson } from '@/research/http'
import { asArray, asRecord, NewsliquidHttpError, newsliquidRequest, newsliquidToken } from '@/research/newsliquid/client'
import { failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'

export type TopicKind = '事件' | 'Meme' | '项目' | '新东西'
export type Credibility = '已核实' | '部分核实' | '待确认'

export interface TopicPost {
  id: string
  author: string
  text: string
  postedAt: string | null
  url: string | null
  likes: number | null
  reposts: number | null
  replies: number | null
}

export interface TopicVerification {
  source: string
  url: string | null
  note: string
  verified: boolean
}

export interface TopicInterpretation {
  configured: boolean
  facts: string[]
  community: string[]
  whyHot: string[]
  impact: string[]
  unconfirmed: string[]
  watch: string[]
  inferences: string[]
  marketing: string[]
  sources: { label: string; url: string }[]
}

export interface TopicCard {
  id: string
  title: string
  kind: TopicKind
  summary: string
  summaryIsExcerpt: boolean
  heat: number
  heatNote: string
  trend: string | null
  credibility: Credibility
  credibilityNote: string
  postCount: number
  authorCount: number
  statsLimited: true
  contractStatus: '已核实' | '未确认' | null
  contractNote: string | null
  newReason: string | null
  anomaly: string[]
  posts: TopicPost[]
  verification: TopicVerification[]
  interpretation: TopicInterpretation
}

export interface TopicBoard {
  items: TopicCard[]
  provenance: Provenance
  error: string | null
  emptyReason: string | null
  windowHours: 24
}

const GENERIC = new Set(['BTC', 'ETH', 'SOL', 'CRYPTO', 'BITCOIN', 'ETHEREUM', 'WEB3', 'NFT', 'DEFI', 'USDT', 'USDC', 'BNB'])
const MEME = new Set(['PEPE', 'DOGE', 'BONK', 'WIF', 'SHIB', 'FLOKI', 'MEME', 'BRETT', 'POPCAT'])
const SHILL = /(to the moon|guaranteed|sure pump|必涨|稳赚|梭哈|翻倍|buy now|don'?t miss|profit up|my call|watch your entry|\b\d+\s*x\b|1000x|fomo|gem call|ape in|easy money|喊单|收益晒)/i
const SPAM_TAG = /(1000?x|fomo|memecoin|gem|pump|shill)/i
const NEW_PHRASE = /(just launched|fair launch|new (token|coin|dex|l2)|今日上线|刚上线|全新|mainnet is live|主网上线)/i
const WINDOW_MS = 24 * 60 * 60 * 1000
const HEAT_NOTE = '基于样本，数据有限'

interface RawPost {
  id: string
  author: string
  text: string
  postedAt: string | null
  time: number | null
  url: string | null
  likes: number | null
  reposts: number | null
  replies: number | null
  followers: number | null
  cashtags: string[]
  addresses: string[]
  hashtags: string[]
}

export async function buildTopicBoard(): Promise<TopicBoard> {
  const key = cacheKey()
  const cachedBoard = await readBoard(key)
  if (cachedBoard) return cachedBoard
  const board = await computeBoard()
  if (board.provenance.mode !== 'unconfigured') await writeBoard(key, board)
  return board
}

async function computeBoard(): Promise<TopicBoard> {
  if (!newsliquidToken() && !envSet('X_BEARER_TOKEN')) {
    const note = `${missingKey('NEWSLIQUID_API_TOKEN')} X_BEARER_TOKEN 是可选补充。未接入时不展示演示话题。`
    return { items: [], provenance: unconfiguredProvenance('OpenTwitter / X API', note), error: note, emptyReason: null, windowHours: 24 }
  }
  const loaded = await loadSample()
  const span = sampleSpan(loaded.posts)
  if (!loaded.posts.length) {
    const note = [loaded.errors.join('；') || 'X 数据源没有返回近 24 小时的帖文。', span].filter(Boolean).join(' ')
    return { items: [], provenance: failedLiveProvenance(loaded.sources.join(' / ') || 'OpenTwitter / X API', note, 'https://ai.6551.io/open/twitter_search'), error: loaded.errors.join('；') || note, emptyReason: null, windowHours: 24 }
  }
  const clusters = rank(cluster(loaded.posts))
  const verified = await verifyAll(clusters.slice(0, 8))
  const interpreted = await interpret(verified)
  const items = interpreted.sort((a, b) => b.heat - a.heat)
  const note = [
    span,
    `来源 ${loaded.sources.join(' / ')}。${loaded.queryNote}`,
    loaded.errors.length ? loaded.errors.join('；') : '',
    items.length ? '' : '筛选后没有合格话题。',
  ].filter(Boolean).join(' ')
  return {
    items,
    provenance: liveProvenance(loaded.sources.join(' / '), new Date().toISOString(), note, 'https://ai.6551.io/open/twitter_search', WINDOW_MS),
    error: loaded.errors.join('；') || null,
    emptyReason: items.length ? null : '当前没有足够证据支持的热点',
    windowHours: 24,
  }
}

const SEARCH_KEYWORDS = ['bitcoin', 'ethereum', 'solana', 'airdrop', 'hack', 'exploit', 'listing', 'ETF', 'memecoin', 'uniswap', 'hyperliquid', 'jupiter']
const OFFICIAL_ACCOUNTS = ['binance', 'coinbase', 'ethereum', 'solana', 'VitalikButerin']

async function loadSample(): Promise<{ posts: RawPost[]; sources: string[]; errors: string[]; queryNote: string }> {
  const since = ymd(Date.now() - WINDOW_MS)
  const until = ymd(Date.now())
  const posts: RawPost[] = []
  const sources: string[] = []
  const errors: string[] = []
  let searches = 0
  let accounts = 0
  if (newsliquidToken()) {
    sources.push('OpenTwitter')
    const halted = await runLimited(SEARCH_KEYWORDS, 2, async (keyword) => {
      const { body } = await newsliquidRequest('/open/twitter_search', {
        method: 'POST',
        body: {
          keywords: keyword,
          sinceDate: since,
          untilDate: until,
          excludeRetweets: true,
          excludeReplies: true,
          product: 'Top',
          minLikes: 3,
          maxResults: 100,
        },
      })
      searches += 1
      posts.push(...postsFromBody(body))
    }, errors)
    if (!halted) {
      accounts = await loadAccountPosts(posts, errors)
    }
  }
  if (envSet('X_BEARER_TOKEN')) {
    sources.push('X API')
    try {
      posts.push(...await searchX(since))
    } catch (error) {
      errors.push(`X API 失败：${error instanceof Error ? error.message : '请求失败'}`)
    }
  }
  const pooled = await mergePool(dedupePosts(posts))
  const cutoff = Date.now() - WINDOW_MS
  const fresh = pooled.filter((post) => post.time != null && post.time >= cutoff)
  const queryNote = `OpenTwitter 用 keywords + sinceDate/untilDate + product=Top + minLikes，不用 query（query 会忽略时间范围）。本次新查询 ${searches} 组，关注或官方账号 ${accounts} 个。接口没有搜索翻页，多组查询和 24 小时帖文池累加。`
  return { posts: fresh, sources, errors, queryNote }
}

async function runLimited<T>(items: T[], width: number, run: (item: T) => Promise<void>, errors: string[]): Promise<boolean> {
  let index = 0
  let halted = false
  async function worker() {
    while (!halted && index < items.length) {
      const current = items[index]
      index += 1
      try {
        await run(current)
      } catch (error) {
        if (error instanceof NewsliquidHttpError && (error.status === 429 || error.status === 402)) {
          halted = true
          errors.push(`OpenTwitter 限速或额度不足（HTTP ${error.status}），已保留已拉到的帖文。`)
        } else {
          errors.push(error instanceof Error ? error.message : '请求失败')
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, () => worker()))
  return halted
}

async function loadAccountPosts(posts: RawPost[], errors: string[]): Promise<number> {
  const names = new Set<string>(OFFICIAL_ACCOUNTS)
  try {
    const { body } = await newsliquidRequest('/open/twitter_watch', { method: 'POST', body: {} })
    for (const name of watchNames(body)) names.add(name)
  } catch (error) {
    if (!(error instanceof NewsliquidHttpError && (error.status === 429 || error.status === 402))) {
      errors.push(`关注列表读取失败：${error instanceof Error ? error.message : '请求失败'}`)
    }
  }
  const list = [...names].slice(0, 8)
  await runLimited(list, 2, async (username) => {
    const { body } = await newsliquidRequest('/open/twitter_user_tweets', {
      method: 'POST',
      body: { username, maxResults: 40, product: 'Latest', includeReplies: false, includeRetweets: false },
    })
    posts.push(...postsFromBody(body))
  }, errors)
  return list.length
}

function watchNames(body: unknown): string[] {
  return asArray(body).map((item) => {
    if (typeof item === 'string') return item.replace(/^@/, '')
    const row = asRecord(item)
    return str(row?.username) || str(row?.screen_name) || str(row?.twAccount) || str(row?.userName) || ''
  }).map((name) => name.replace(/^@/, '')).filter(Boolean)
}

function postsFromBody(body: unknown): RawPost[] {
  return asArray(unwrapPosts(body)).map(toPost).filter((post): post is RawPost => post !== null)
}

async function mergePool(incoming: RawPost[]): Promise<RawPost[]> {
  const previous = await readPool()
  const merged = dedupePosts([...previous, ...incoming])
  const cutoff = Date.now() - WINDOW_MS
  const kept = merged.filter((post) => (post.time != null ? post.time >= cutoff : false)).slice(-2000)
  await writePool(kept)
  return kept
}

function sampleSpan(posts: RawPost[]): string {
  const times = posts.map((post) => post.time).filter((time): time is number => time != null).sort((a, b) => a - b)
  if (!times.length) return `样本 0 条，没有落在最近 24 小时内的时间戳。`
  const hours = ((times[times.length - 1] - times[0]) / 3_600_000).toFixed(1)
  return `样本 ${posts.length} 条，最早 ${new Date(times[0]).toISOString()}，最晚 ${new Date(times[times.length - 1]).toISOString()}，跨度 ${hours} 小时。`
}

function unwrapPosts(body: unknown): unknown {
  const record = asRecord(body)
  if (record && ('data' in record || 'tweets' in record)) return record
  return body
}

async function searchX(since: string): Promise<RawPost[]> {
  const start = new Date(Date.now() - WINDOW_MS).toISOString()
  const query = encodeURIComponent(`(bitcoin OR ethereum OR solana OR crypto OR meme) -is:retweet`)
  const body = await fetchJson<{ data?: Record<string, unknown>[]; includes?: { users?: Record<string, unknown>[] } }>(
    `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=50&start_time=${encodeURIComponent(start)}&tweet.fields=created_at,public_metrics,entities&expansions=author_id&user.fields=username,public_metrics,created_at`,
    { headers: { authorization: `Bearer ${secretValue('X_BEARER_TOKEN')}` } },
    12000
  )
  const users = new Map((body.includes?.users || []).map((user) => [String(user.id), user]))
  return (body.data || []).map((row) => toPost({ ...row, user: users.get(String(row.author_id)) })).filter((post): post is RawPost => post !== null)
}

function toPost(value: unknown): RawPost | null {
  const row = asRecord(value)
  if (!row) return null
  const text = str(row.text) || str(row.full_text)
  if (!text || isLowValuePost(text)) return null
  const metrics = asRecord(row.public_metrics)
  const user = asRecord(row.user) || asRecord(row.author)
  const id = str(row.id) || str(row.twId) || contentFingerprint(text).slice(0, 16)
  const author = str(row.userScreenName) || str(row.username) || str(user?.screen_name) || str(user?.username) || str(row.author_id) || '未知账号'
  const postedAt = str(row.createdAt) || str(row.created_at)
  const time = postedAt ? Date.parse(postedAt) : NaN
  const url = str(row.url) || (id && /^\d+$/.test(id) ? `https://x.com/i/web/status/${id}` : null)
  return {
    id,
    author,
    text,
    postedAt,
    time: Number.isFinite(time) ? time : null,
    url,
    likes: num(row.favoriteCount ?? row.likeCount ?? metrics?.like_count),
    reposts: num(row.retweetCount ?? metrics?.retweet_count),
    replies: num(row.replyCount ?? metrics?.reply_count),
    followers: num(row.userFollowers ?? asRecord(user?.public_metrics)?.followers_count),
    cashtags: [...text.matchAll(/\$([A-Za-z][A-Za-z0-9]{1,12})\b/g)].map((match) => match[1].toUpperCase()),
    addresses: extractAddresses(text),
    hashtags: [
      ...(Array.isArray(row.hashtags) ? row.hashtags.map((item) => String(item).replace(/^#/, '').toUpperCase()) : []),
      ...[...text.matchAll(/#([A-Za-z][A-Za-z0-9]{2,20})/g)].map((match) => match[1].toUpperCase()),
    ],
  }
}

function extractAddresses(text: string): string[] {
  const evm = [...text.matchAll(/0x[a-fA-F0-9]{40}/g)].map((match) => match[0])
  const labeled = [...text.matchAll(/(?:CA|contract|mint|地址)[:\s]+([1-9A-HJ-NP-Za-km-z]{32,44})/gi)].map((match) => match[1])
  return [...new Set([...evm, ...labeled])]
}

function dedupePosts(posts: RawPost[]): RawPost[] {
  const seen = new Set<string>()
  const out: RawPost[] = []
  for (const post of posts) {
    const key = post.url || `${post.author}:${contentFingerprint(post.text)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(post)
  }
  return out
}

function cluster(posts: RawPost[]): TopicCard[] {
  const groups = new Map<string, RawPost[]>()
  for (const post of posts) {
    if (isPromo(post)) continue
    const key = primaryKey(post)
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push(post)
    groups.set(key, list)
  }
  const cards: TopicCard[] = []
  for (const [key, group] of groups) {
    const card = qualify(key, group)
    if (card) cards.push(card)
  }
  return cards
}

function primaryKey(post: RawPost): string | null {
  if (post.addresses[0]) return `addr:${post.addresses[0].toLowerCase()}`
  const tick = post.cashtags.find((item) => !GENERIC.has(item))
  if (tick) return `tick:${tick}`
  const event = eventKey(post.text)
  const anyTick = post.cashtags[0]
  if (event && anyTick) return `event:${event}:${anyTick}`
  const hash = post.hashtags.find((item) => !GENERIC.has(item) && item.length >= 3 && item.length <= 20)
  if (hash) return `tag:${hash}`
  return null
}

function eventKey(text: string): string | null {
  if (/hack|exploit|漏洞|黑客|被盗|stolen|rug/i.test(text)) return 'hack'
  if (/\betf\b/i.test(text)) return 'etf'
  if (/listing|上币/i.test(text)) return 'listing'
  if (/airdrop|空投/i.test(text)) return 'airdrop'
  if (/proposal|治理|governance|提案/i.test(text)) return 'governance'
  if (/mainnet|主网/i.test(text)) return 'mainnet'
  return null
}

function qualify(key: string, posts: RawPost[]): TopicCard | null {
  const uniqueTexts = new Map<string, RawPost>()
  for (const post of posts) uniqueTexts.set(contentFingerprint(post.text), post)
  const unique = [...uniqueTexts.values()]
  const authors = new Set(posts.map((post) => post.author.toLowerCase()))
  if (unique.length < 2 || authors.size < 2) return null
  const pumpCount = posts.filter((post) => SHILL.test(post.text) || isPromo(post)).length
  if (pumpCount / posts.length >= 0.5) return null
  if (ruleKind(key, posts) === 'Meme') {
    const engagedAuthors = [...authors].filter((author) => posts.some((post) => post.author.toLowerCase() === author && engagementOf(post) > 0))
    if (engagedAuthors.length < 2) return null
  }
  const counts = new Map<string, number>()
  for (const post of posts) counts.set(post.author.toLowerCase(), (counts.get(post.author.toLowerCase()) ?? 0) + 1)
  const topShare = Math.max(...counts.values()) / posts.length
  if (topShare > 0.7 && authors.size < 3) return null
  const anomaly: string[] = []
  if (unique.length / posts.length < 0.6) anomaly.push('近似文本重复，热度已按去重后的帖文计算。')
  if (topShare > 0.5) anomaly.push('单个账号占样本帖文一半以上，存在刷屏可能。')
  const thin = posts.filter((post) => post.followers != null && post.followers < 50)
  if (thin.length >= 2 && thin.length / posts.length > 0.5) anomaly.push('多个账号粉丝数很低。接口没有给出注册时间，不能据此认定新号。')
  const subject = key.split(':').slice(1).join(':')
  const kind = ruleKind(key, posts)
  const newMatch = posts.map((post) => post.text.match(NEW_PHRASE)?.[0]).find(Boolean) || null
  const newReason = kind === '新东西'
    ? `样本帖文出现「${newMatch || '上线/主网'}」。没有独立的发布时间记录，所以“新”只依据这些帖文里的说法。`
    : null
  const lead = [...posts].sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1))[0]
  const engagementKnown = posts.some((post) => post.likes != null || post.reposts != null || post.replies != null)
  const engagement = posts.reduce((sum, post) => sum + (post.likes ?? 0) + (post.reposts ?? 0) * 2 + (post.replies ?? 0), 0)
  const heat = unique.length * 10 + authors.size * 15 + (engagementKnown ? Math.round(Math.log10(1 + engagement) * 20) : 0)
  const address = posts.flatMap((post) => post.addresses)[0] || (key.startsWith('addr:') ? subject : null)
  return {
    id: `topic-${createHash('sha256').update(key).digest('hex').slice(0, 12)}`,
    title: titleFor(key, posts),
    kind,
    summary: lead.text.slice(0, 140),
    summaryIsExcerpt: true,
    heat,
    heatNote: HEAT_NOTE,
    trend: trendLabel(posts),
    credibility: '待确认',
    credibilityNote: '目前只有样本帖文，缺少官方公告、项目文档、治理提案或能对上的合约记录。',
    postCount: unique.length,
    authorCount: authors.size,
    statsLimited: true,
    contractStatus: address ? '未确认' : null,
    contractNote: address ? `样本里出现地址 ${address}，尚未和行情源或新闻对上，不能认定官方身份。` : null,
    newReason,
    anomaly,
    posts: unique.slice(0, 8).map(publicPost),
    verification: [],
    interpretation: emptyInterpretation(unique, anomaly),
  }
}

export function isPromoText(text: string): boolean {
  const post = toPost({ id: 'promo', text, userScreenName: 'promo', favoriteCount: 0, retweetCount: 0, replyCount: 0, userFollowers: 0 })
  return post ? isPromo(post) : true
}

function isPromo(post: RawPost): boolean {
  if (/pump\.fun/i.test(post.text) || SHILL.test(post.text)) return true
  const stripped = post.text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/#\w+/g, ' ')
    .replace(/\$[A-Za-z][A-Za-z0-9]{1,12}/g, ' ')
    .replace(/0x[a-fA-F0-9]{40}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const spamTag = post.hashtags.some((tag) => SPAM_TAG.test(tag))
  if (spamTag && stripped.length < 80) return true
  if (post.hashtags.length >= 4 && stripped.length < 80) return true
  if (post.addresses.length && post.hashtags.length >= 2 && stripped.length < 40) return true
  const explicitZero = post.likes === 0 && (post.reposts ?? 0) === 0 && (post.replies ?? 0) === 0
  if (explicitZero && (post.followers == null || post.followers < 200)) return true
  return false
}

function engagementOf(post: RawPost): number {
  return (post.likes ?? 0) + (post.reposts ?? 0) + (post.replies ?? 0)
}

export function newsMentionsSubject(text: string, ticker: string, address: string | null, fullName: string | null = null): boolean {
  if (address && text.toLowerCase().includes(address.toLowerCase())) return true
  if (new RegExp(`(^|[^A-Za-z0-9])\\$${ticker}(?![A-Za-z0-9])`, 'i').test(text)) return true
  const name = fullName?.trim()
  if (name && name.includes(' ') && name.length >= 8 && text.toLowerCase().includes(name.toLowerCase())) return true
  return false
}

export function topicsFromPosts(rows: Array<{ id: string; author: string; text: string; postedAt?: string | null; likes?: number | null; reposts?: number | null; replies?: number | null; followers?: number | null; url?: string | null }>): TopicCard[] {
  const posts = rows.map((row) => toPost({
    id: row.id,
    text: row.text,
    userScreenName: row.author,
    createdAt: row.postedAt,
    favoriteCount: row.likes,
    retweetCount: row.reposts,
    replyCount: row.replies,
    userFollowers: row.followers,
    url: row.url,
  })).filter((post): post is RawPost => post !== null)
  return cluster(posts)
}

function titleFor(key: string, posts: RawPost[]): string {
  if (key.startsWith('tick:')) return `$${key.slice(5)}`
  if (key.startsWith('tag:')) return `#${key.slice(4)}`
  if (key.startsWith('addr:')) return `合约 ${key.slice(5, 11)}…${key.slice(-4)}`
  if (key.startsWith('event:')) {
    const [, name, tick] = key.split(':')
    const label = name === 'hack' ? '安全事件' : name === 'etf' ? 'ETF' : name === 'listing' ? '上币' : name === 'airdrop' ? '空投' : name === 'governance' ? '治理' : '主网'
    return tick ? `${label} · $${tick}` : label
  }
  return posts[0]?.cashtags[0] ? `$${posts[0].cashtags[0]}` : '未命名话题'
}

function ruleKind(key: string, posts: RawPost[]): TopicKind {
  const blob = posts.map((post) => post.text).join('\n')
  if (key.startsWith('event:')) return '事件'
  if (NEW_PHRASE.test(blob)) return '新东西'
  const tick = key.startsWith('tick:') ? key.slice(5) : posts.flatMap((post) => post.cashtags).find((item) => MEME.has(item))
  if ((tick && MEME.has(tick)) || /meme|pepe|doge|bonk/i.test(blob)) return 'Meme'
  return '项目'
}

function trendLabel(posts: RawPost[]): string | null {
  const dated = posts.filter((post) => post.time != null)
  if (dated.length < 2) return null
  const mid = Date.now() - 12 * 60 * 60 * 1000
  const recent = dated.filter((post) => (post.time ?? 0) >= mid).length
  const older = dated.length - recent
  if (older === 0) return '近 12 小时才出现在样本里'
  if (recent > older * 1.25) return `近 12 小时样本增多（${older} → ${recent}）`
  if (recent * 1.25 < older) return `近 12 小时样本减少（${older} → ${recent}）`
  return `近 12 小时样本大致持平（${older} → ${recent}）`
}

function publicPost(post: RawPost): TopicPost {
  return { id: post.id, author: post.author, text: post.text, postedAt: post.postedAt, url: post.url, likes: post.likes, reposts: post.reposts, replies: post.replies }
}

function emptyInterpretation(posts: RawPost[], anomaly: string[]): TopicInterpretation {
  return {
    configured: false,
    facts: [],
    community: posts.slice(0, 3).map((post) => `${post.author}：${post.text.slice(0, 180)}`),
    whyHot: [],
    impact: [],
    unconfirmed: ['缺少官方公告、项目文档、治理提案或能对上的合约记录。'],
    watch: [],
    inferences: [],
    marketing: anomaly,
    sources: sourceLinks(posts, []),
  }
}

function rank(cards: TopicCard[]): TopicCard[] {
  return cards.sort((a, b) => b.heat - a.heat)
}

async function verifyAll(cards: TopicCard[]): Promise<TopicCard[]> {
  return Promise.all(cards.map((card) => verify(card).catch(() => card)))
}

async function verify(card: TopicCard): Promise<TopicCard> {
  const checks: TopicVerification[] = []
  const address = card.posts.map((post) => post.text.match(/0x[a-fA-F0-9]{40}/)?.[0]).find(Boolean)
    || card.contractNote?.match(/0x[a-fA-F0-9]{40}/)?.[0]
    || null
  const ticker = card.title.startsWith('$') ? card.title.slice(1) : null
  let fullName: string | null = null
  if (address) {
    const dex = await dexCheck(address)
    if (dex) {
      checks.push(dex.check)
      fullName = dex.fullName
    }
  }
  if (newsliquidToken() && (ticker || address)) {
    const news = await newsCheck(ticker, address, fullName)
    if (news) checks.push(news)
  }
  const contractVerified = checks.some((item) => item.verified && item.source === 'DexScreener')
  const newsVerified = checks.some((item) => item.verified && item.source === 'OpenNews')
  let credibility: Credibility = '待确认'
  let credibilityNote = '没有 $代码、完整合约地址或项目全名能对上的记录。仅有同名符号不算部分核实。'
  if (contractVerified) {
    credibility = '已核实'
    credibilityNote = 'DexScreener 按帖子里的合约地址返回了同一地址。链、流动性和创建时间都来自这个地址，不是按名称搜索。'
  } else if (newsVerified) {
    credibility = '部分核实'
    credibilityNote = '新闻里出现了 $代码或完整合约地址。普通英文词或仅同名符号不算。'
  }
  return {
    ...card,
    credibility,
    credibilityNote,
    contractStatus: address ? (contractVerified ? '已核实' : '未确认') : card.contractStatus,
    contractNote: address
      ? (contractVerified ? `地址 ${address} 与 DexScreener 的代币地址一致。` : `地址 ${address} 未能和行情源对上，标为未确认。`)
      : card.contractNote,
    verification: checks,
    interpretation: {
      ...card.interpretation,
      facts: checks.filter((item) => item.verified).map((item) => `${item.source}：${item.note}`),
      unconfirmed: [credibilityNote],
      sources: sourceLinks(card.posts.map((post) => ({ url: post.url, author: post.author, text: post.text })), checks),
    },
  }
}

async function dexCheck(address: string): Promise<{ check: TopicVerification; fullName: string | null } | null> {
  const body = await cached(`dex:${address.toLowerCase()}`, 10 * 60_000, () => fetchJson<{ pairs?: { chainId?: string; url?: string; pairCreatedAt?: number; liquidity?: { usd?: number }; baseToken?: { address?: string; symbol?: string; name?: string } }[] | null }>(
    `https://api.dexscreener.com/latest/dex/tokens/${address}`,
    undefined,
    8000
  )).catch(() => null)
  const pair = body?.pairs?.find((item) => item.baseToken?.address?.toLowerCase() === address.toLowerCase())
  if (!pair) {
    return { check: { source: 'DexScreener', url: `https://dexscreener.com/search?q=${address}`, note: `按地址 ${address} 查询，没有返回同一合约。`, verified: false }, fullName: null }
  }
  const created = pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : '暂无'
  const liquidity = typeof pair.liquidity?.usd === 'number' ? pair.liquidity.usd : null
  return {
    fullName: pair.baseToken?.name && pair.baseToken.name.includes(' ') ? pair.baseToken.name : null,
    check: {
      source: 'DexScreener',
      url: pair.url || null,
      note: `链 ${pair.chainId || '未知'}，流动性 ${liquidity == null ? '暂无' : liquidity} 美元，池子创建于 ${created}。地址与帖子中的合约一致。`,
      verified: true,
    },
  }
}

async function newsCheck(ticker: string | null, address: string | null, fullName: string | null): Promise<TopicVerification | null> {
  if (!ticker && !address) return null
  try {
    const { body } = await newsliquidRequest('/open/news_search', { method: 'POST', body: { q: address || `$${ticker}`, limit: 5, page: 1 } })
    const hit = asArray(body).map(asRecord).find((row) => newsMentionsSubject(`${str(row?.text) || ''} ${str(row?.title) || ''}`, ticker || '', address, fullName))
    if (!hit) return null
    const headline = (str(hit.text) || str(hit.title) || '').slice(0, 140)
    return { source: 'OpenNews', url: str(hit.link), note: `新闻精确出现 $代码或合约地址：${headline}`, verified: true }
  } catch {
    return null
  }
}

async function interpret(cards: TopicCard[]): Promise<TopicCard[]> {
  if (!envSet('AI_API_KEY') || !cards.length) return cards
  try {
    const ai = await askModel(cards)
    return cards.map((card, index) => mergeAi(card, ai[index]))
  } catch {
    return cards
  }
}

async function askModel(cards: TopicCard[]): Promise<Partial<AiShape>[]> {
  const corpus = JSON.stringify(cards.map(aiInput))
  const base = (secretValue('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '')
  const body = await fetchJson<{ choices?: { message?: { content?: string } }[] }>(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secretValue('AI_API_KEY')}` },
    body: JSON.stringify({
      model: secretValue('AI_MODEL') || 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: '你只根据用户给出的帖文和核实结果写简体中文 JSON。不要新增数字、地址、链接或新闻。sourceUrls 必须是输入里出现过的 URL。kind 只能是 事件、Meme、项目、新东西。新东西必须给出 newReason。事实、社区观点和推断分开放。只返回 {"topics":[...]}，长度与输入相同。',
        },
        { role: 'user', content: corpus },
      ],
    }),
  }, 20000)
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('空响应')
  const parsed = JSON.parse(extractJson(content)) as { topics?: Partial<AiShape>[] }
  if (!Array.isArray(parsed.topics)) throw new Error('结构不符')
  return parsed.topics
}

interface AiShape {
  kind: TopicKind
  title: string
  summary: string
  newReason: string | null
  facts: string[]
  community: string[]
  whyHot: string[]
  impact: string[]
  unconfirmed: string[]
  watch: string[]
  inferences: string[]
  marketing: string[]
  sourceUrls: string[]
}

function aiInput(card: TopicCard) {
  return {
    id: card.id,
    title: card.title,
    kind: card.kind,
    heat: card.heat,
    postCount: card.postCount,
    authorCount: card.authorCount,
    credibility: card.credibility,
    credibilityNote: card.credibilityNote,
    contractNote: card.contractNote,
    anomaly: card.anomaly,
    verification: card.verification,
    posts: card.posts.map((post) => ({ author: post.author, text: post.text.slice(0, 240), url: post.url, likes: post.likes })),
  }
}

function mergeAi(card: TopicCard, raw: Partial<AiShape> | undefined): TopicCard {
  if (!raw) return card
  const allow = new Set(card.interpretation.sources.map((item) => item.url))
  const corpus = JSON.stringify(aiInput(card))
  const keep = (lines: unknown) => (Array.isArray(lines) ? lines.filter((line): line is string => typeof line === 'string' && grounded(line, corpus)) : [])
  const urls = (Array.isArray(raw.sourceUrls) ? raw.sourceUrls : []).filter((url): url is string => typeof url === 'string' && allow.has(url))
  const kind = raw.kind === '事件' || raw.kind === 'Meme' || raw.kind === '项目' || raw.kind === '新东西' ? raw.kind : card.kind
  const newReason = kind === '新东西' ? (typeof raw.newReason === 'string' && raw.newReason.trim() ? raw.newReason.trim() : card.newReason) : null
  const finalKind = kind === '新东西' && !newReason ? card.kind : kind
  return {
    ...card,
    kind: finalKind,
    title: typeof raw.title === 'string' && grounded(raw.title, corpus) ? raw.title.slice(0, 80) : card.title,
    summary: typeof raw.summary === 'string' && grounded(raw.summary, corpus) ? raw.summary.slice(0, 180) : card.summary,
    summaryIsExcerpt: !(typeof raw.summary === 'string' && grounded(raw.summary, corpus)),
    newReason: finalKind === '新东西' ? newReason : null,
    interpretation: {
      configured: true,
      facts: keep(raw.facts).slice(0, 5),
      community: keep(raw.community).slice(0, 4),
      whyHot: keep(raw.whyHot).slice(0, 3),
      impact: keep(raw.impact).slice(0, 3),
      unconfirmed: keep(raw.unconfirmed).slice(0, 4).concat(card.credibilityNote).filter(Boolean),
      watch: keep(raw.watch).slice(0, 3),
      inferences: keep(raw.inferences).slice(0, 3),
      marketing: [...card.anomaly, ...keep(raw.marketing)].slice(0, 4),
      sources: urls.length ? urls.map((url) => ({ label: url, url })) : card.interpretation.sources,
    },
  }
}

function grounded(line: string, corpus: string): boolean {
  const numbers = line.match(/\d+(?:\.\d+)?/g) ?? []
  return numbers.every((value) => corpus.includes(value))
}

function sourceLinks(posts: { url: string | null; author: string; text: string }[], checks: TopicVerification[]): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = []
  for (const post of posts) {
    if (post.url) links.push({ label: `${post.author} 的帖文`, url: post.url })
  }
  for (const check of checks) {
    if (check.url) links.push({ label: check.source, url: check.url })
  }
  const seen = new Set<string>()
  return links.filter((item) => seen.has(item.url) ? false : (seen.add(item.url), true)).slice(0, 8)
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1] : content
}

function ymd(time: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time)
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function cacheKey(): string {
  const stamp = createHash('sha256').update(`${secretValue('AI_API_KEY') || ''}|${secretValue('NEWSLIQUID_API_TOKEN') || ''}|${secretValue('X_BEARER_TOKEN') || ''}`).digest('hex').slice(0, 10)
  return `topic-board:v3:${ymd(Date.now())}:${stamp}`
}

const poolMemory: RawPost[] = []

async function readPool(): Promise<RawPost[]> {
  let stored: RawPost[] = []
  try {
    const remote = await getCache({ namespace: 'research-topics' }).get('posts-v3')
    if (Array.isArray(remote)) {
      stored = remote.filter((item): item is RawPost => Boolean(item && typeof item === 'object' && typeof (item as RawPost).id === 'string'))
    }
  } catch {
    stored = []
  }
  return dedupePosts([...stored, ...poolMemory]).filter((post) => (post.time ?? 0) >= Date.now() - WINDOW_MS)
}

async function writePool(posts: RawPost[]) {
  poolMemory.splice(0, poolMemory.length, ...posts)
  try {
    await getCache({ namespace: 'research-topics' }).set('posts-v3', posts, { ttl: 24 * 60 * 60, tags: ['research-topics'], name: 'topic-posts-24h' })
  } catch {
    // The in-process pool still accumulates until this instance restarts.
  }
}

const memory = new Map<string, { exp: number; value: TopicBoard }>()

async function readBoard(key: string): Promise<TopicBoard | null> {
  const local = memory.get(key)
  if (local && local.exp > Date.now()) return local.value
  try {
    const stored = await getCache({ namespace: 'research-topics' }).get(key)
    if (stored && typeof stored === 'object' && Array.isArray((stored as TopicBoard).items)) {
      memory.set(key, { exp: Date.now() + 10 * 60_000, value: stored as TopicBoard })
      return stored as TopicBoard
    }
  } catch {
    return null
  }
  return null
}

async function writeBoard(key: string, board: TopicBoard) {
  memory.set(key, { exp: Date.now() + 10 * 60_000, value: board })
  try {
    await getCache({ namespace: 'research-topics' }).set(key, board, { ttl: 600, tags: ['research-topics'], name: 'topic-board' })
  } catch {
    // Runtime Cache is unavailable outside Vercel. This process still keeps the memory copy.
  }
}
