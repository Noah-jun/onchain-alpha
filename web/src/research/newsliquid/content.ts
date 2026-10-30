import type { DiscussionPost, DiscussionTopic, NewsArticle, ResearchNote, WhaleTransfer } from '@/domain/types'
import { needsTranslation } from '@/domain/translate'
import { missingKey } from '@/research/env'
import { liveProvenance } from '@/research/provenance'
import { asArray, asRecord, newsliquidRequest, newsliquidToken, unwrapData } from '@/research/newsliquid/client'

export async function loadOpenNewsArticles(): Promise<NewsArticle[]> {
  const { body } = await newsliquidRequest('/open/news_search', {
    method: 'POST',
    body: { limit: 30, page: 1 },
  })
  const payload = unwrapData(body)
  const rows = asArray(payload)
  return rows.map(mapOpenNews).filter((item): item is NewsArticle => item !== null)
}

export async function loadDailyHotArticles(): Promise<NewsArticle[]> {
  const { body } = await newsliquidRequest('/open/free_hot?category=web3', { auth: false })
  const record = asRecord(body)
  const news = asRecord(record?.news)
  const rows = asArray(news?.items)
  return rows.map(mapDaily).filter((item): item is NewsArticle => item !== null)
}

export async function loadTweetById(twId: string): Promise<DiscussionTopic | null> {
  const { body } = await newsliquidRequest('/open/twitter_tweet_by_id', {
    method: 'POST',
    body: { twId },
  })
  const topic = firstTweet(unwrapData(body))
  if (!topic) return null
  return {
    ...topic,
    id: `tw-${twId}`,
    provenance: {
      ...topic.provenance,
      note: 'POST /open/twitter_tweet_by_id',
      sourceUrl: 'https://ai.6551.io/open/twitter_tweet_by_id',
    },
  }
}

function firstTweet(value: unknown): DiscussionTopic | null {
  const direct = mapTweetTopic(value)
  if (direct) return direct
  if (Array.isArray(value)) {
    for (const item of value) {
      const topic = mapTweetTopic(item)
      if (topic) return topic
    }
  }
  const row = asRecord(value)
  if (!row) return null
  for (const key of ['tweet', 'status', 'data', 'tw']) {
    const topic = mapTweetTopic(row[key])
    if (topic) return topic
  }
  return null
}

export async function loadOpenTwitterTopics(): Promise<DiscussionTopic[]> {
  const search = await newsliquidRequest('/open/twitter_search', {
    method: 'POST',
    body: { keywords: 'bitcoin OR ethereum', maxResults: 20, product: 'Latest', excludeRetweets: true },
  })
  const tweets = asArray(unwrapData(search.body)).map(mapTweetTopic).filter((item): item is DiscussionTopic => item !== null)
  const watch = await newsliquidRequest('/open/twitter_watch', { method: 'POST', body: {} }).catch(() => null)
  const kols = watch ? kolTopic(asArray(unwrapData(watch.body))) : null
  return kols ? [kols, ...tweets] : tweets
}

export async function loadOpenTradeSignals(): Promise<WhaleTransfer[]> {
  const routers = await newsliquidRequest('/open/trader/routers', { auth: true })
  const list = asArray(unwrapData(routers.body))
  const active = list.map(asRecord).find((row) => row && row.is_active !== false && row.trader && row.api)
  const trader = String(active?.trader || 'okx')
  const api = String(active?.api || 'v1')
  const signals = await newsliquidRequest(`/open/trader/${encodeURIComponent(trader)}/${encodeURIComponent(api)}/market/signal-list`, {
    method: 'POST',
    body: { chainIndex: '501', walletType: '1,2,3', minAmountUsd: '10000' },
  })
  return asArray(unwrapData(signals.body)).map((row) => mapSignal(row, trader, api)).filter((item): item is WhaleTransfer => item !== null)
}

export function newsliquidConfigured(): boolean {
  return Boolean(newsliquidToken())
}

export function newsliquidMissing(): string {
  return missingKey('NEWSLIQUID_API_TOKEN')
}

function mapOpenNews(value: unknown): NewsArticle | null {
  const row = asRecord(value)
  if (!row) return null
  const title = stringOf(row.text) || stringOf(row.title)
  if (!title) return null
  const rating = asRecord(row.aiRating)
  const coins = coinSymbols(row.coins)
  const publishedAt = stringOf(row.ts) || new Date().toISOString()
  const source = stringOf(row.newsType) || 'OpenNews'
  const summaryCopy = visibleCopy(stringOf(rating?.summary), stringOf(rating?.enSummary), 'OpenNews 没有返回摘要。')
  const bodyCopy = visibleCopy(stringOf(rating?.summary), stringOf(rating?.enSummary), title)
  return article({
    id: `on-${stringOf(row.id) || title.slice(0, 24)}`,
    title,
    summary: summaryCopy.text,
    body: bodyCopy.text,
    sourceZh: paired({ summary: summaryCopy.zh, body: bodyCopy.zh }),
    publishedAt,
    publisher: source,
    url: stringOf(row.link),
    source: 'OpenNews',
    sourceUrl: 'https://ai.6551.io/open/news_search',
    eventType: stringOf(row.engineType) || '新闻',
    assets: coins,
    signal: stringOf(rating?.signal),
    score: numberOf(rating?.score),
    grade: stringOf(rating?.grade),
    heat: stringOf(row.engineType) === 'meme' ? ['社交热度高'] : [],
  })
}

function mapDaily(value: unknown): NewsArticle | null {
  const row = asRecord(value)
  if (!row) return null
  const title = stringOf(row.title)
  if (!title) return null
  const coins = Array.isArray(row.coins) ? row.coins.filter((item): item is string => typeof item === 'string') : []
  const summaryCopy = visibleCopy(stringOf(row.summary_zh), stringOf(row.summary_en), '每日热点没有返回摘要。')
  const bodyCopy = visibleCopy(stringOf(row.summary_zh), stringOf(row.summary_en), title)
  return article({
    id: `daily-${stringOf(row.id) || title.slice(0, 24)}`,
    title,
    summary: summaryCopy.text,
    body: bodyCopy.text,
    sourceZh: paired({ summary: summaryCopy.zh, body: bodyCopy.zh }),
    publishedAt: stringOf(row.published_at) || stringOf(row.created_at) || new Date().toISOString(),
    publisher: stringOf(row.source) || '6551 daily-news',
    url: stringOf(row.link),
    source: '6551 daily-news',
    sourceUrl: 'https://ai.6551.io/open/free_hot',
    eventType: stringOf(row.engine_type) || '每日热点',
    assets: coins,
    signal: stringOf(row.signal),
    score: numberOf(row.score),
    grade: stringOf(row.grade),
    heat: stringOf(row.engine_type) === 'meme' ? ['社交热度高'] : [],
  })
}

function article(input: {
  id: string
  title: string
  summary: string
  body: string
  publishedAt: string
  publisher: string
  url: string | null
  source: string
  sourceUrl: string
  eventType: string
  assets: string[]
  signal: string | null
  score: number | null
  grade: string | null
  heat: Array<'社交热度高' | '基本面有支撑'>
  sourceZh?: NewsArticle['sourceZh']
}): NewsArticle {
  const sentiment = input.signal === 'long' ? '偏多' : input.signal === 'short' ? '偏空' : input.signal === 'neutral' ? '中性' : '未知'
  const confidence = input.score == null ? '低' : input.score >= 80 ? '高' : input.score >= 60 ? '中' : '低'
  const analysis: ResearchNote = {
    eventType: input.eventType,
    relatedAssets: input.assets,
    sentiment,
    impact: input.summary === input.title ? '来源没有单独的影响说明。' : input.summary,
    impactPath: input.signal ? `来源给出的信号字段是 ${input.signal}。这不是本站的交易指令。` : '来源没有给出信号字段。',
    timeHorizon: '未知',
    evidence: [{ quote: input.title, source: input.publisher, url: input.url }],
    risks: ['AI 评分不是收益承诺。', '社交或转载标题需要回到原文核对。'],
    counterpoints: input.score == null ? ['没有 AI 分数。'] : [`分数 ${input.score}${input.grade ? `，等级 ${input.grade}` : ''}。`],
    confidence,
    confidenceBasis: input.score == null ? '接口没有返回 AI 分数。' : `分数和信号来自 ${input.source}，不是本站推算。`,
    heatTags: input.heat,
    facts: [`标题：${input.title}`, input.signal ? `信号字段：${input.signal}` : '没有信号字段。'],
    inferences: [],
    unknowns: input.summary ? [] : ['摘要'],
  }
  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    body: input.body,
    publishedAt: input.publishedAt,
    publisher: input.publisher,
    url: input.url,
    analysis,
    provenance: liveProvenance(input.source, input.publishedAt, 'NewsLiquid 返回的原文和评分', input.sourceUrl),
    sourceZh: input.sourceZh,
  }
}

function visibleCopy(zh: string | null, en: string | null, fallback: string): { text: string; zh?: string } {
  if (en && zh && needsTranslation(en) && !needsTranslation(zh)) return { text: en, zh }
  return { text: zh || en || fallback }
}

function paired(fields: Record<string, string | undefined>): NewsArticle['sourceZh'] | undefined {
  const entries = Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1]))
  return entries.length ? Object.fromEntries(entries) : undefined
}

function sourceChinese(row: Record<string, unknown>, original: string): string | undefined {
  if (!needsTranslation(original)) return undefined
  const candidates = [row.translation, row.translated_text, row.text_zh, row.zh_text, row.textZh]
  for (const candidate of candidates) {
    const record = asRecord(candidate)
    const text = stringOf(candidate) || stringOf(record?.text) || stringOf(record?.zh)
    if (text && !needsTranslation(text)) return text
  }
  return undefined
}

function mapTweetTopic(value: unknown): DiscussionTopic | null {
  const row = asRecord(value)
  if (!row) return null
  const text = stringOf(row.text) || stringOf(row.full_text) || stringOf(row.content)
  if (!text) return null
  const user = asRecord(row.user) || asRecord(row.author)
  const author = stringOf(row.username) || stringOf(user?.screen_name) || stringOf(user?.username) || stringOf(row.screen_name) || '未知账号'
  const id = stringOf(row.id) || stringOf(row.twId) || stringOf(row.tweet_id) || text.slice(0, 16)
  const postedAt = stringOf(row.created_at) || stringOf(row.createdAt) || new Date().toISOString()
  const likes = numberOf(row.likeCount) || numberOf(row.favorite_count) || numberOf(row.likes) || 0
  const url = stringOf(row.url) || (id ? `https://x.com/i/web/status/${id}` : null)
  const sourceZh = sourceChinese(row, text)
  const post: DiscussionPost = {
    id,
    author,
    text,
    postedAt,
    url,
    note: 'OpenTwitter 检索结果，不是本站编写的帖文',
    sourceZh,
  }
  return {
    id: `tw-${id}`,
    date: postedAt.slice(0, 10),
    topic: text.slice(0, 80),
    sourceZh: sourceZh && text.length <= 80 ? sourceZh : undefined,
    category: 'OpenTwitter',
    postCount: 1,
    authorCount: 1,
    heat: likes,
    sentiment: '未知',
    summary: text,
    heatTags: ['社交热度高'],
    assets: [],
    posts: [post],
    provenance: liveProvenance('OpenTwitter', postedAt, 'POST /open/twitter_search', 'https://ai.6551.io/open/twitter_search'),
    analysis: {
      eventType: '社交检索',
      relatedAssets: [],
      sentiment: '未知',
      impact: '这是检索返回的一条帖文，不代表全站热度，也不能当成交易价值。',
      impactPath: '关键词检索 → 单条帖文。',
      timeHorizon: '未知',
      evidence: [{ quote: text.slice(0, 180), source: author, url }],
      risks: ['热度字段只来自接口返回的计数。', '社交热度高不等于基本面。'],
      counterpoints: ['没有把这条帖文写成已证实新闻。'],
      confidence: '低',
      confidenceBasis: '只有 OpenTwitter 返回的文本和计数。',
      heatTags: ['社交热度高'],
      facts: [`${author}：${text.slice(0, 180)}`],
      inferences: [],
      unknowns: ['相关资产是否可唯一识别', '全站讨论量'],
    },
  }
}

function kolTopic(rows: unknown[]): DiscussionTopic | null {
  const names = rows.map((row) => {
    if (typeof row === 'string') return row
    const record = asRecord(row)
    return stringOf(record?.username) || stringOf(record?.screen_name) || stringOf(record?.userName)
  }).filter((name): name is string => Boolean(name))
  if (!names.length) return null
  const posts = names.slice(0, 30).map((name) => ({
    id: `kol-${name}`,
    author: name,
    text: `监控名单中的账号 @${name.replace(/^@/, '')}`,
    postedAt: new Date().toISOString(),
    url: `https://x.com/${name.replace(/^@/, '')}`,
    note: '这是 OpenTwitter 监控名单，不是一条新帖文',
  }))
  return {
    id: 'kol-watch',
    date: new Date().toISOString().slice(0, 10),
    topic: 'KOL 监控名单',
    category: 'KOL',
    postCount: names.length,
    authorCount: names.length,
    heat: names.length,
    sentiment: '未知',
    summary: `OpenTwitter 返回 ${names.length} 个监控账号。`,
    heatTags: [],
    assets: [],
    posts,
    provenance: liveProvenance('OpenTwitter', new Date().toISOString(), 'POST /open/twitter_watch', 'https://ai.6551.io/open/twitter_watch'),
    analysis: {
      eventType: 'KOL 追踪',
      relatedAssets: [],
      sentiment: '未知',
      impact: '名单只说明这些账号在监控里，不说明他们说了什么。',
      impactPath: '监控名单 → 账号。帖文需要另一次检索。',
      timeHorizon: '未知',
      evidence: posts.slice(0, 3).map((post) => ({ quote: post.text, source: 'OpenTwitter', url: post.url })),
      risks: ['名单不是持仓，也不是交易信号。'],
      counterpoints: [],
      confidence: '中',
      confidenceBasis: '账号名来自 twitter_watch，没有补写帖文。',
      heatTags: [],
      facts: [`监控账号 ${names.slice(0, 8).join('、')}`],
      inferences: [],
      unknowns: ['这些账号最近的原文'],
    },
  }
}

function mapSignal(value: unknown, trader: string, api: string): WhaleTransfer | null {
  const row = asRecord(value)
  if (!row) return null
  const token = asRecord(row.token)
  const symbol = stringOf(token?.symbol) || stringOf(row.symbol)
  const amountUsd = numberOf(row.amountUsd)
  if (!symbol && amountUsd == null) return null
  const walletType = stringOf(row.walletType) || '未知'
  const address = stringOf(token?.tokenAddress)
  const timestamp = millisToIso(row.timestamp)
  return {
    id: `sig-${symbol || 'token'}-${stringOf(row.timestamp) || address || walletType}`,
    asset: symbol || '未识别',
    amount: null,
    amountUsd,
    fromAddress: stringOf(row.triggerWalletAddress),
    toAddress: address,
    fromTag: walletType,
    toTag: stringOf(token?.name),
    chain: stringOf(row.chainIndex) === '501' ? 'Solana' : stringOf(row.chainIndex) || '未知',
    timestamp,
    txHash: null,
    explorerUrl: null,
    observation: 'onchain_observed',
    direction: 'unknown',
    attributionNote: `OpenTrade 只读信号（${trader}/${api}）。walletType=${walletType}。这不是已确认的交易所充值或提现，也没有交易哈希。`,
    provenance: liveProvenance('OpenTrade', timestamp, 'POST /market/signal-list，只读', 'https://ai.6551.io'),
    analysis: {
      eventType: '聪明钱信号',
      relatedAssets: symbol ? [symbol] : [],
      sentiment: '未知',
      impact: '信号只表示接口返回了一笔达到金额阈值的钱包活动，不能推出价格方向。',
      impactPath: 'OpenTrade signal-list → 代币与金额。没有成交回报。',
      timeHorizon: '未知',
      evidence: [{ quote: `${symbol || '未识别'} ${walletType} ${amountUsd ?? '金额未知'}`, source: 'OpenTrade', url: null }],
      risks: ['钱包标签可能错误。', '没有交易哈希就不能在浏览器复核。'],
      counterpoints: ['触发钱包数：' + (stringOf(row.triggerWalletCount) || '未知')],
      confidence: '低',
      confidenceBasis: '只有 signal-list 的字段，没有链上交易哈希。',
      heatTags: [],
      facts: [`代币 ${symbol || '未识别'}`, `钱包类型 ${walletType}`],
      inferences: [],
      unknowns: ['交易哈希', '是否已进入交易所'],
    },
  }
}

function coinSymbols(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (typeof item === 'string') return item
    return stringOf(asRecord(item)?.symbol) || ''
  }).filter(Boolean)
}

function stringOf(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function millisToIso(value: unknown): string {
  const parsed = numberOf(value)
  if (parsed == null) return new Date().toISOString()
  return new Date(parsed > 10_000_000_000 ? parsed : parsed * 1000).toISOString()
}
