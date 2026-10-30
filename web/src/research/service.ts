import type {
  Citation,
  DataMode,
  DiscussionTopic,
  FundingRate,
  MarketBoard,
  NewsArticle,
  Provenance,
  Quote,
  VolatilityAlert,
  WhaleTransfer,
} from '@/domain/types'
import { formatFunding, formatShanghai, formatUsd, observationLabel, volStatusLabel } from '@/domain/format'
import { assertFundingRules, buildOpportunities } from '@/domain/fundingLogic'
import { assertVolatilityRules } from '@/domain/volatility'
import { answerQuestion, type GroundingBundle } from '@/research/adapters/ai'
import { loadFunding } from '@/research/adapters/funding'
import { loadQuotes } from '@/research/adapters/market'
import { loadNews, loadNewsItem } from '@/research/adapters/news'
import { loadFlow, loadFlows } from '@/research/adapters/onchain'
import { loadTopic, loadTopics } from '@/research/adapters/social'
import { loadVolatility } from '@/research/adapters/volatility'
import { CORE_SYMBOLS } from '@/research/demo/catalog'
import { normalizeSymbol } from '@/research/env'
import { listSources } from '@/research/sources'

export function getSources() {
  return { items: listSources(), error: null as string | null }
}

export async function getMarket(perpSymbol: string, watchlist: string[]): Promise<MarketBoard> {
  const perp = normalizeSymbol(perpSymbol || 'CLUSDT') || 'CLUSDT'
  const symbols = [...new Set([...CORE_SYMBOLS, perp, ...watchlist.map(normalizeSymbol)].filter(Boolean))]
  const [quotes, news, topics, funding, volatility] = await Promise.all([
    loadQuotes(symbols),
    loadNews(),
    loadTopics(),
    loadFunding(),
    loadVolatility([perp]),
  ])
  const opportunities = opportunitiesFrom(funding.rates, funding.profiles, funding.provenance)
  const extremes = funding.rates.filter((rate) => Math.abs(rate.ratePct) > 0.5)
  const error = quotes.error || news.error || topics.error || funding.error || volatility.error
  return {
    quotes: quotes.quotes,
    anomalies: volatility.items,
    fundingExtremes: extremes,
    headlines: news.items.slice(0, 4),
    topics: topics.items.slice(0, 4),
    provenance: quotes.provenance,
    error,
  }
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const normalized = normalizeSymbol(symbol)
  if (!normalized) return null
  const loaded = await loadQuotes([normalized])
  return loaded.quotes[0] ?? null
}

export async function getNews() {
  const loaded = await loadNews()
  return { items: loaded.items, provenance: loaded.provenance, error: loaded.error }
}

export async function getNewsById(id: string) {
  return loadNewsItem(id)
}

export async function getDiscussions() {
  const loaded = await loadTopics()
  return { items: loaded.items, provenance: loaded.provenance, error: loaded.error }
}

export async function getDiscussion(id: string) {
  return loadTopic(id)
}

export async function getFundingBoard() {
  const loaded = await loadFunding()
  const opportunities = opportunitiesFrom(loaded.rates, loaded.profiles, loaded.provenance)
  assertFundingRules(loaded.rates, opportunities)
  return { rates: loaded.rates, opportunities, provenance: loaded.provenance, error: loaded.error }
}

export async function getFundingPair(pair: string) {
  const board = await getFundingBoard()
  const normalized = normalizeSymbol(pair)
  const rates = board.rates.filter((rate) => rate.pair === normalized)
  const opportunity = board.opportunities.find((item) => item.pair === normalized) ?? null
  return { pair: normalized, rates, opportunity, provenance: board.provenance, error: rates.length ? null : '暂无该交易对' }
}

export async function getFlows() {
  const loaded = await loadFlows()
  return { items: loaded.items, provenance: loaded.provenance, error: loaded.error }
}

export async function getFlowById(id: string) {
  return loadFlow(id)
}

export async function getVolatility(extra: string[] = []) {
  const loaded = await loadVolatility(extra)
  assertVolatilityRules(loaded.items)
  return { items: loaded.items, provenance: loaded.provenance, error: loaded.error }
}

export async function getVolatilityById(id: string) {
  const loaded = await getVolatility()
  return loaded.items.find((item) => item.id === id) ?? null
}

export async function askResearch(message: string, context: { type?: string; id?: string; perp?: string }) {
  const built = await buildBundle(context)
  return answerQuestion(message, built)
}

function opportunitiesFrom(rates: FundingRate[], profiles: { pair: string; fee: string | null; spread: string | null; margin: string | null; settlementNote: string | null; residualRisks: string[] | null }[], provenance: Provenance) {
  return buildOpportunities(rates, profiles, () => provenance)
}

async function buildBundle(context: { type?: string; id?: string; perp?: string }): Promise<GroundingBundle> {
  const type = context.type || 'digest'
  const id = context.id || ''
  if (type === 'news' && id) return newsBundle(await getNewsById(id))
  if (type === 'discussion' && id) return topicBundle(await getDiscussion(id))
  if (type === 'funding' && id) return fundingBundle(await getFundingPair(id))
  if (type === 'flow' && id) return flowBundle(await getFlowById(id))
  if (type === 'volatility' && id) return volBundle(await getVolatilityById(id))
  if (type === 'market' && id) return quoteBundle(await getQuote(id))
  return digestBundle(context.perp || 'CLUSDT')
}

function cite(id: string, source: string, title: string, url: string | null, updatedAt: string | null, mode: DataMode): Citation {
  return { id, source, title, url, updatedAt, mode }
}

function point(text: string, citationIds: string[], keywords: string[]) {
  return { text, citationIds, keywords }
}

async function digestBundle(perp: string): Promise<GroundingBundle> {
  const board = await getMarket(perp, [])
  const funding = await getFundingBoard()
  const flows = await getFlows()
  const citations: Citation[] = []
  const facts = []
  for (const quote of board.quotes) {
    const cid = `q-${quote.symbol}`
    citations.push(cite(cid, quote.provenance.source, quote.name, quote.provenance.sourceUrl, quote.provenance.updatedAt, quote.provenance.mode))
    facts.push(point(
      quote.price == null
        ? `${quote.symbol} 暂无价格。状态：${quote.provenance.mode} / ${quote.provenance.freshness}。`
        : `${quote.name}（${quote.symbol}）${formatUsd(quote.price)}，24 小时 ${quote.change24h?.toFixed(2) ?? '暂无'}%，更新于 ${formatShanghai(quote.provenance.updatedAt)}，${quote.provenance.mode === 'demo' ? '演示' : quote.provenance.mode}。`,
      [cid],
      [quote.symbol, quote.name, '价格', '行情', '看板']
    ))
  }
  for (const rate of funding.rates.filter((item) => Math.abs(item.ratePct) > 0.5)) {
    const cid = `f-${rate.id}`
    citations.push(cite(cid, rate.provenance.source, `${rate.exchange} ${rate.pair}`, null, rate.updatedAt, rate.provenance.mode))
    facts.push(point(
      `${rate.exchange} ${rate.pair} 资金费率 ${formatFunding(rate.ratePct)}，结算周期 ${rate.period}。`,
      [cid],
      [rate.pair, rate.base, rate.exchange, '资金费率', '费率']
    ))
  }
  for (const opportunity of funding.opportunities) {
    const cid = `o-${opportunity.id}`
    citations.push(cite(cid, opportunity.provenance.source, opportunity.pair, null, opportunity.provenance.updatedAt, opportunity.provenance.mode))
    facts.push(point(
      `${opportunity.pair} 被标为${opportunity.label}。费率差 ${opportunity.spreadPct.toFixed(4)} 个百分点。缺失：${opportunity.missing.join('、') || '无'}。`,
      [cid],
      [opportunity.pair, '套利', '费率差', '待验证']
    ))
  }
  for (const article of board.headlines) {
    const cid = `n-${article.id}`
    citations.push(cite(cid, article.provenance.source, article.title, article.url, article.publishedAt, article.provenance.mode))
    facts.push(point(`${article.title}。相关资产：${article.analysis.relatedAssets.join('、') || '未识别'}。`, [cid], ['新闻', article.title, ...article.analysis.relatedAssets]))
  }
  for (const alert of board.anomalies) {
    const cid = `v-${alert.id}`
    citations.push(cite(cid, alert.provenance.source, alert.symbol, null, alert.windowEnd, alert.provenance.mode))
    facts.push(point(`${alert.symbol} 5 分钟 ${alert.change5m.toFixed(2)}%，状态 ${volStatusLabel(alert.status)}。`, [cid], [alert.symbol, '异常', '波动', '5分钟']))
  }
  for (const flow of flows.items) {
    const cid = `w-${flow.id}`
    citations.push(cite(cid, flow.provenance.source, flow.asset, flow.explorerUrl, flow.timestamp, flow.provenance.mode))
    facts.push(point(
      `${flow.asset} 转移，观察状态 ${observationLabel(flow.observation)}，美元价值 ${formatUsd(flow.amountUsd)}。`,
      [cid],
      [flow.asset, '巨鲸', '转账', '充值', '提现']
    ))
  }
  const dataMode = combinedMode([board.provenance, funding.provenance, flows.provenance])
  return {
    title: '研究终端摘要',
    facts,
    inferences: [point('以上数字只在各自的引用时间与数据模式内有效。演示条目不能当成当前市场。', citations.slice(0, 1).map((item) => item.id), ['演示', '实时', '现在'])],
    unknowns: ['外部原始文件是否与演示稿一致', '未接入的数据源当前数值'],
    risks: ['摘要会漏掉筛选后才看得见的行。', '不能从热度或费率差推出收益。'],
    citations,
    dataMode,
  }
}

function newsBundle(article: NewsArticle | null): GroundingBundle {
  if (!article) return missingBundle('没有这条新闻')
  const cid = `n-${article.id}`
  const assets = article.analysis.relatedAssets.length ? article.analysis.relatedAssets.join('、') : '未识别'
  const tags = article.analysis.heatTags.length ? article.analysis.heatTags.join('、') : '未区分'
  return {
    title: article.title,
    dataMode: article.provenance.mode,
    citations: [cite(cid, article.provenance.source, article.title, article.url, article.publishedAt, article.provenance.mode)],
    facts: [
      point(`标题：${article.title}`, [cid], ['新闻', '标题', article.title]),
      point(`事件类型 ${article.analysis.eventType}，相关资产 ${assets}，情绪 ${article.analysis.sentiment}。`, [cid], ['事件', '资产', '情绪', ...article.analysis.relatedAssets]),
      point(`可能影响：${article.analysis.impact}`, [cid], ['影响', '路径']),
      point(`路径：${article.analysis.impactPath}`, [cid], ['路径', '影响']),
      point(`时间范围 ${article.analysis.timeHorizon}。热度标签：${tags}。`, [cid], ['时间', '热度', '社交', '基本面']),
      point(`置信度 ${article.analysis.confidence}。依据：${article.analysis.confidenceBasis}`, [cid], ['置信', '依据', '信心']),
      ...article.analysis.evidence.map((item) => point(`证据引文：${item.quote}`, [cid], ['证据', '引文', '原文'])),
      ...article.analysis.facts.map((text) => point(text, [cid], ['事实', article.title])),
    ],
    inferences: article.analysis.inferences.map((text) => point(text, [cid], ['推断', '影响'])),
    unknowns: article.analysis.unknowns,
    risks: [...article.analysis.risks, ...article.analysis.counterpoints.map((item) => `反方：${item}`)],
  }
}

function topicBundle(topic: DiscussionTopic | null): GroundingBundle {
  if (!topic) return missingBundle('没有这条讨论')
  const cid = `d-${topic.id}`
  const postCitations = topic.posts.map((post) => cite(post.id, '演示帖文', post.author, post.url, post.postedAt, topic.provenance.mode))
  return {
    title: topic.topic,
    dataMode: topic.provenance.mode,
    citations: [cite(cid, topic.provenance.source, topic.topic, null, topic.provenance.updatedAt, topic.provenance.mode), ...postCitations],
    facts: [
      point(`${topic.date}，帖文 ${topic.postCount}，账号 ${topic.authorCount}，热度 ${topic.heat}。这些计数来自${topic.provenance.mode === 'demo' ? '演示' : '当前'}适配器。`, [cid], ['讨论', '热度', topic.topic, ...topic.assets]),
      ...topic.posts.map((post) => point(`${post.author}：${post.text}`, [post.id], [post.author, '帖', topic.topic])),
      ...topic.analysis.facts.map((text) => point(text, [cid], ['事实', topic.topic, ...topic.assets])),
    ],
    inferences: topic.analysis.inferences.map((text) => point(text, [cid], ['热度', '社交'])),
    unknowns: topic.analysis.unknowns,
    risks: topic.analysis.risks,
  }
}

function fundingBundle(result: Awaited<ReturnType<typeof getFundingPair>>): GroundingBundle {
  if (!result.rates.length) return missingBundle(result.error || '没有该交易对')
  const citations = result.rates.map((rate) => cite(`f-${rate.id}`, rate.provenance.source, `${rate.exchange} ${rate.pair}`, null, rate.updatedAt, rate.provenance.mode))
  const facts = result.rates.map((rate) => point(
    `${rate.exchange} ${rate.pair} 当前样本费率 ${formatFunding(rate.ratePct)}，周期 ${rate.period}，标记价 ${formatUsd(rate.markPrice)}，更新 ${formatShanghai(rate.updatedAt)}。`,
    [`f-${rate.id}`],
    [rate.pair, rate.exchange, '资金费率', '费率']
  ))
  if (result.opportunity) {
    citations.push(cite(`o-${result.opportunity.id}`, result.opportunity.provenance.source, result.opportunity.label, null, result.opportunity.provenance.updatedAt, result.opportunity.provenance.mode))
    facts.push(point(
      `${result.opportunity.label}：${result.opportunity.highExchange} ${formatFunding(result.opportunity.highRate)} 对 ${result.opportunity.lowExchange} ${formatFunding(result.opportunity.lowRate)}。缺失项：${result.opportunity.missing.join('、') || '无'}。`,
      [`o-${result.opportunity.id}`],
      ['套利', '费率差', '待验证', '手续费', '无风险']
    ))
  } else {
    facts.push(point(`${result.pair} 没有形成跨所比较所需的第二条报价，或价差未达到展示阈值。`, [citations[0].id], ['比较', '套利']))
  }
  return {
    title: result.pair,
    dataMode: result.provenance.mode,
    citations,
    facts,
    inferences: [point(result.opportunity?.structureNote || '单所费率不能称为跨所费率差。', [citations[0].id], ['结构', '做空', '做多'])],
    unknowns: result.opportunity?.missing ?? ['其他交易所报价'],
    risks: result.opportunity?.risks ?? ['缺少对照交易所。'],
  }
}

function flowBundle(flow: WhaleTransfer | null): GroundingBundle {
  if (!flow) return missingBundle('没有这笔转账')
  const cid = `w-${flow.id}`
  return {
    title: `${flow.asset} 转账`,
    dataMode: flow.provenance.mode,
    citations: [cite(cid, flow.provenance.source, flow.asset, flow.explorerUrl, flow.timestamp, flow.provenance.mode)],
    facts: [
      point(`资产 ${flow.asset}，数量 ${flow.amount ?? '暂无数据'}，美元 ${formatUsd(flow.amountUsd)}。`, [cid], [flow.asset, '金额', '美元']),
      point(`观察状态 ${observationLabel(flow.observation)}。${flow.attributionNote}`, [cid], ['确认', '链上', '交易所', '归属']),
      point(`交易哈希 ${flow.txHash ?? '暂无数据'}。浏览器链接 ${flow.explorerUrl ?? '未提供'}。`, [cid], ['哈希', '浏览器', '地址']),
      ...flow.analysis.facts.map((text) => point(text, [cid], [flow.asset])),
    ],
    inferences: flow.analysis.inferences.map((text) => point(text, [cid], ['影响'])),
    unknowns: flow.analysis.unknowns,
    risks: flow.analysis.risks,
  }
}

function volBundle(alert: VolatilityAlert | null): GroundingBundle {
  if (!alert) return missingBundle('没有这条波动')
  const cid = `v-${alert.id}`
  return {
    title: alert.symbol,
    dataMode: alert.provenance.mode,
    citations: [cite(cid, alert.provenance.source, alert.symbol, null, alert.windowEnd, alert.provenance.mode)],
    facts: [
      point(`${alert.symbol} 在 ${formatShanghai(alert.windowStart)} 至 ${formatShanghai(alert.windowEnd)} 的变化为 ${alert.change5m.toFixed(2)}%。`, [cid], [alert.symbol, '5分钟', '波动']),
      point(`跨所：${alert.checks.multiExchange.detail}`, [cid], ['交易所', '核对']),
      point(`成交：${alert.checks.volume.detail}`, [cid], ['成交', '成交量']),
      point(`新鲜度：${alert.checks.freshness.detail}`, [cid], ['延迟', '新鲜']),
      point(`状态：${volStatusLabel(alert.status)}。`, [cid], ['待确认', '核对']),
    ],
    inferences: alert.analysis.inferences.map((text) => point(text, [cid], ['异常'])),
    unknowns: alert.analysis.unknowns,
    risks: alert.analysis.risks,
  }
}

function quoteBundle(quote: Quote | null): GroundingBundle {
  if (!quote) return missingBundle('没有这个代码')
  const cid = `q-${quote.symbol}`
  return {
    title: quote.name,
    dataMode: quote.provenance.mode,
    citations: [cite(cid, quote.provenance.source, quote.name, quote.provenance.sourceUrl, quote.provenance.updatedAt, quote.provenance.mode)],
    facts: [point(
      quote.price == null
        ? `${quote.symbol} 暂无价格。${quote.provenance.note}`
        : `${quote.name} ${formatUsd(quote.price)}，24 小时 ${quote.change24h?.toFixed(2) ?? '暂无'}%。更新于 ${formatShanghai(quote.provenance.updatedAt)}。`,
      [cid],
      [quote.symbol, quote.name, '价格', '涨跌']
    )],
    inferences: [],
    unknowns: quote.price == null ? ['该代码在当前数据源中没有价格'] : ['快照之后的价格'],
    risks: [quote.provenance.note],
  }
}

function missingBundle(message: string): GroundingBundle {
  return {
    title: '未找到',
    dataMode: 'unconfigured',
    citations: [],
    facts: [],
    inferences: [],
    unknowns: [message],
    risks: ['不会用其他标的的数据填补这条空记录。'],
  }
}

function combinedMode(items: Provenance[]): DataMode {
  const present = items.filter((item) => item.mode !== 'unconfigured')
  if (!present.length) return 'unconfigured'
  if (present.every((item) => item.mode === 'live')) return 'live'
  return 'demo'
}
