import type { FlowDirection, FlowObservation, Provenance, ResearchNote, WhaleTransfer } from '@/domain/types'
import { DEMO_FLOWS } from '@/research/demo/catalog'
import { demoAllowed, envSet, missingKey, secretValue } from '@/research/env'
import { fetchJson } from '@/research/http'
import { demoProvenance, failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'
import { loadOpenTradeSignals, newsliquidConfigured, newsliquidMissing } from '@/research/newsliquid/content'
import { asArray, asRecord, newsliquidRequest, unwrapData } from '@/research/newsliquid/client'
import { loadLivePrints } from '@/research/publicMarkets'
import { flowDirection, parseWhaleAlertTweet } from '@/research/whaleAlertTweet'

const WHALE_X_SOURCE = 'Whale Alert（X @whale_alert，经 NewsLiquid）'
const WHALE_X_NOTE = '转出和转入名称是 Whale Alert 自己的标注，不是本站识别的地址主人。'

export async function loadFlows(extra: string[] = []): Promise<{
  items: WhaleTransfer[]
  provenance: Provenance
  onchainProvenance: Provenance
  error: string | null
}> {
  if (demoAllowed()) {
    const provenance = demoProvenance('演示链上样本', 'RESEARCH_ALLOW_DEMO=1，这些不是真实转账。')
    return { items: DEMO_FLOWS, provenance, onchainProvenance: provenance, error: null }
  }
  const prints = await loadLivePrints(extra)
  let signals: WhaleTransfer[] = []
  let signalNote = newsliquidConfigured() ? '' : newsliquidMissing()
  if (newsliquidConfigured()) {
    try {
      signals = await loadOpenTradeSignals()
    } catch (error) {
      signalNote = `OpenTrade 失败：${error instanceof Error ? error.message : '请求失败'}`
      prints.provenance = { ...prints.provenance, note: `${prints.provenance.note} ${signalNote}` }
    }
  }
  const chain = envSet('WHALE_ALERT_API_KEY')
    ? await loadWhaleAlert()
    : newsliquidConfigured()
      ? await loadWhaleAlertTweets()
      : {
          items: [],
          provenance: unconfiguredProvenance('链上大额转账', `${missingKey('NEWSLIQUID_API_TOKEN')} 未填写 Whale Alert key 时，大额转账读取 X @whale_alert，需要 NewsLiquid token。${signalNote ? ` OpenTrade：${signalNote}` : ''}`),
          error: missingKey('NEWSLIQUID_API_TOKEN'),
        }
  return {
    items: [...prints.items, ...signals, ...chain.items],
    provenance: prints.provenance,
    onchainProvenance: chain.provenance,
    error: prints.error,
  }
}

async function loadWhaleAlertTweets(): Promise<{ items: WhaleTransfer[]; provenance: Provenance; error: string | null }> {
  try {
    const { body } = await newsliquidRequest('/open/twitter_user_tweets', {
      method: 'POST',
      body: { username: 'whale_alert', maxResults: 100, product: 'Latest', includeReplies: false, includeRetweets: false },
    })
    const items = asArray(unwrapData(body)).flatMap((row) => {
      const transfer = tweetToTransfer(row)
      return transfer ? [transfer] : []
    })
    return {
      items,
      provenance: liveProvenance(WHALE_X_SOURCE, new Date().toISOString(), items.length ? WHALE_X_NOTE : `${WHALE_X_NOTE} 这次没有解析出转账，未补写演示数据。`, 'https://x.com/whale_alert'),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return {
      items: [],
      provenance: failedLiveProvenance(WHALE_X_SOURCE, `链上源请求失败（${message}），未回退到演示转账`, 'https://x.com/whale_alert'),
      error: message,
    }
  }
}

function tweetToTransfer(value: unknown): WhaleTransfer | null {
  const row = asRecord(value)
  if (!row) return null
  const text = textOf(row.text) || textOf(row.full_text)
  const id = textOf(row.id) || textOf(row.twId) || textOf(row.tweet_id)
  const timestamp = timeOf(row.createdAt ?? row.created_at)
  if (!text || !id || !timestamp) return null
  const parsed = parseWhaleAlertTweet(text)
  if (!parsed) return null
  const tweetUrl = textOf(row.url) || (/^\d+$/.test(id) ? `https://x.com/whale_alert/status/${id}` : null)
  const direction = flowDirection(parsed.kind, parsed.from, parsed.to)
  const named = Boolean(parsed.from || parsed.to)
  const observation: FlowObservation = named ? 'onchain_observed' : 'uncertain'
  const evidence = [
    { quote: text, source: 'X @whale_alert', url: tweetUrl },
    ...(parsed.whaleUrl ? [{ quote: 'Whale Alert 交易页', source: 'whale-alert.io', url: parsed.whaleUrl }] : []),
  ]
  const analysis: ResearchNote = {
    eventType: kindLabel(parsed.kind),
    relatedAssets: [parsed.symbol],
    sentiment: '未知',
    impact: '只能描述这条推文写出的数量和 Whale Alert 标注。标注不能推出交易意图。',
    impactPath: 'X @whale_alert → 推文原文。交易所是否入账未知。',
    timeHorizon: '未知',
    evidence,
    risks: ['标注会过期或冲突。', '大额转移不等于即将买卖。'],
    counterpoints: ['推文里的 whale-alert.io 链接可以打开核对。'],
    confidence: '低',
    confidenceBasis: '数量和双方名称来自 @whale_alert 原文，没有交易所回执。',
    heatTags: [],
    facts: [`原文：${text}`, `资产 ${parsed.symbol}，数量 ${parsed.amount}。`],
    inferences: [],
    unknowns: ['交易所是否入账', '地址持有人的意图'],
  }
  return {
    id: `wa-x-${id}`,
    asset: parsed.symbol,
    amount: parsed.amount,
    amountUsd: parsed.amountUsd,
    fromAddress: null,
    toAddress: null,
    fromTag: parsed.from ? `${parsed.from}（Whale Alert 标注）` : null,
    toTag: parsed.to ? `${parsed.to}（Whale Alert 标注）` : null,
    chain: parsed.chain || 'unknown',
    timestamp,
    txHash: parsed.txHash,
    explorerUrl: parsed.whaleUrl,
    observation,
    direction,
    attributionNote: WHALE_X_NOTE,
    analysis,
    provenance: liveProvenance(WHALE_X_SOURCE, timestamp, WHALE_X_NOTE, tweetUrl || parsed.whaleUrl),
  }
}

function kindLabel(kind: 'transfer' | 'mint' | 'burn' | 'lock' | 'unlock'): string {
  if (kind === 'mint') return '铸造'
  if (kind === 'burn') return '销毁'
  if (kind === 'lock') return '锁定'
  if (kind === 'unlock') return '解锁'
  return '大额转移'
}

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : null
}

function timeOf(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 10_000_000_000 ? value : value * 1000
    return new Date(millis).toISOString()
  }
  const text = textOf(value)
  if (!text) return null
  const parsed = Date.parse(text)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

async function loadWhaleAlert(): Promise<{ items: WhaleTransfer[]; provenance: Provenance; error: string | null }> {
  try {
    const key = secretValue('WHALE_ALERT_API_KEY') || ''
    const body = await fetchJson<{ result?: string; transactions?: WhaleAlertTx[]; message?: string }>(
      `https://api.whale-alert.io/v1/transactions?api_key=${encodeURIComponent(key)}&min_value=500000&limit=20`
    )
    if (body.result && body.result !== 'success') throw new Error(body.message || body.result)
    const items = (body.transactions ?? []).map(toTransfer)
    return {
      items,
      provenance: liveProvenance('Whale Alert', new Date().toISOString(), '地址标签来自数据源，不等于交易所入账回执', 'https://whale-alert.io'),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return {
      items: [],
      provenance: failedLiveProvenance('Whale Alert', `链上源请求失败（${message}），未回退到演示转账`),
      error: message,
    }
  }
}

export async function loadFlow(id: string): Promise<WhaleTransfer | null> {
  const list = await loadFlows()
  return list.items.find((item) => item.id === id) ?? null
}

interface WhaleParty {
  address?: string
  owner?: string
  owner_type?: string
}

interface WhaleAlertTx {
  blockchain?: string
  symbol?: string
  hash?: string
  from?: WhaleParty
  to?: WhaleParty
  amount?: number
  amount_usd?: number
  timestamp?: number
}

function toTransfer(tx: WhaleAlertTx, index: number): WhaleTransfer {
  const from = tx.from ?? {}
  const to = tx.to ?? {}
  const fromExchange = from.owner_type === 'exchange' && Boolean(from.owner)
  const toExchange = to.owner_type === 'exchange' && Boolean(to.owner)
  let direction: FlowDirection = 'transfer'
  if (toExchange && !fromExchange) direction = 'deposit'
  else if (fromExchange && !toExchange) direction = 'withdraw'
  else if (!from.address && !to.address) direction = 'unknown'
  const named = Boolean(from.owner || to.owner)
  const observation: FlowObservation = named ? 'onchain_observed' : 'uncertain'
  const chain = tx.blockchain || 'unknown'
  const hash = tx.hash || null
  const asset = (tx.symbol || '未知').toUpperCase()
  const amount = typeof tx.amount === 'number' ? tx.amount : null
  const amountUsd = typeof tx.amount_usd === 'number' ? tx.amount_usd : null
  const timestamp = tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString()
  const attributionNote = named
    ? '所有者名称来自 Whale Alert 标签。这是链上观察，不是交易所确认的充值或提现回执。'
    : '数据源没有给出所有者，归属标为不确定。'
  const analysis: ResearchNote = {
    eventType: '大额转移',
    relatedAssets: asset === '未知' ? [] : [asset],
    sentiment: '未知',
    impact: '只能描述链上记录到的数量和标签。标签不能推出交易意图。',
    impactPath: '链上交易 → 数据源标签。入账确认与后续成交未知。',
    timeHorizon: '未知',
    evidence: [{ quote: attributionNote, source: 'Whale Alert', url: explorerUrl(chain, hash) }],
    risks: ['标签会过期或冲突。', '大额转移不等于即将买卖。'],
    counterpoints: ['有交易哈希时可以用区块浏览器核对金额。'],
    confidence: '低',
    confidenceBasis: observation === 'uncertain' ? '所有者缺失。' : '有标签，但没有交易所回执。',
    heatTags: [],
    facts: [
      `资产 ${asset}，数量 ${amount ?? '暂无数据'}。`,
      `观察状态：${observation === 'uncertain' ? '归属不确定' : '链上已观察到'}。`,
    ],
    inferences: [],
    unknowns: ['交易所是否入账', '地址持有人的意图'],
  }
  return {
    id: hash ? `wa-${hash}` : `wa-${index}`,
    asset,
    amount,
    amountUsd,
    fromAddress: from.address ?? null,
    toAddress: to.address ?? null,
    fromTag: from.owner ? `${from.owner}（数据源标签）` : null,
    toTag: to.owner ? `${to.owner}（数据源标签）` : null,
    chain,
    timestamp,
    txHash: hash,
    explorerUrl: explorerUrl(chain, hash),
    observation,
    direction,
    attributionNote,
    analysis,
    provenance: liveProvenance('Whale Alert', timestamp, attributionNote, explorerUrl(chain, hash)),
  }
}

function explorerUrl(chain: string, hash: string | null): string | null {
  if (!hash) return null
  if (chain === 'bitcoin') return `https://mempool.space/tx/${hash}`
  if (chain === 'ethereum') return `https://etherscan.io/tx/${hash}`
  if (chain === 'tron') return `https://tronscan.org/#/transaction/${hash}`
  return null
}
