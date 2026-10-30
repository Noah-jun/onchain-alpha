import type { FlowDirection, FlowObservation, Provenance, ResearchNote, WhaleTransfer } from '@/domain/types'
import { DEMO_FLOWS } from '@/research/demo/catalog'
import { resolveProvider } from '@/research/env'
import { fetchJson } from '@/research/http'
import { demoProvenance, failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'

export async function loadFlows(): Promise<{ items: WhaleTransfer[]; provenance: Provenance; error: string | null }> {
  const choice = resolveProvider('ONCHAIN_PROVIDER', ['whalealert'], 'WHALE_ALERT_API_KEY')
  if (choice.kind === 'demo') {
    return { items: DEMO_FLOWS, provenance: demoProvenance('演示链上样本'), error: null }
  }
  if (choice.kind === 'unconfigured') {
    return { items: [], provenance: unconfiguredProvenance('链上大额转账', choice.reason), error: choice.reason }
  }
  try {
    const key = process.env.WHALE_ALERT_API_KEY!.trim()
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
