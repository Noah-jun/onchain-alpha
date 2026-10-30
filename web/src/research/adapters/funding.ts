import type { FundingRate, PairCostProfile, Provenance } from '@/domain/types'
import { DEMO_FUNDING, DEMO_FUNDING_COSTS } from '@/research/demo/catalog'
import { resolveProvider } from '@/research/env'
import { fetchJson } from '@/research/http'
import { demoProvenance, failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'

const EXCHANGES: Record<string, string> = {
  BinPerp: 'Binance',
  HlPerp: 'Hyperliquid',
  BybitPerp: 'Bybit',
  OkxPerp: 'OKX',
}

export async function loadFunding(): Promise<{
  rates: FundingRate[]
  profiles: PairCostProfile[]
  provenance: Provenance
  error: string | null
}> {
  const choice = resolveProvider('FUNDING_PROVIDER', ['hyperliquid'])
  if (choice.kind === 'demo') {
    return {
      rates: DEMO_FUNDING,
      profiles: DEMO_FUNDING_COSTS,
      provenance: demoProvenance('演示资金费率表'),
      error: null,
    }
  }
  if (choice.kind === 'unconfigured') {
    return { rates: [], profiles: [], provenance: unconfiguredProvenance('资金费率', choice.reason), error: choice.reason }
  }
  try {
    const data = await fetchJson<unknown>('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'predictedFundings' }),
    })
    const rates = selectRates(parsePredicted(data))
    const profiles = [...new Set(rates.map((rate) => rate.pair))].map((pair) => ({
      pair,
      fee: null,
      spread: null,
      margin: null,
      settlementNote: null,
      residualRisks: null,
    }))
    return {
      rates,
      profiles,
      provenance: liveProvenance(
        'Hyperliquid predictedFundings',
        new Date().toISOString(),
        '公开预测资金费率。结算周期未在该接口中提供，成本项为空。',
        'https://hyperliquid.gitbook.io'
      ),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return {
      rates: [],
      profiles: [],
      provenance: failedLiveProvenance('Hyperliquid', `资金费率请求失败（${message}），未回退到演示费率`),
      error: message,
    }
  }
}

function parsePredicted(data: unknown): FundingRate[] {
  if (!Array.isArray(data)) throw new Error('返回结构无法识别')
  const provenance = liveProvenance('Hyperliquid predictedFundings', new Date().toISOString(), '单条预测费率')
  const rows: FundingRate[] = []
  for (const row of data) {
    if (!Array.isArray(row) || row.length < 2 || !Array.isArray(row[1])) continue
    const coin = String(row[0])
    for (const entry of row[1] as unknown[]) {
      const parsed = readEntry(entry)
      if (!parsed) continue
      const ratePct = Number(parsed.info.fundingRate) * 100
      if (!Number.isFinite(ratePct)) continue
      const exchange = EXCHANGES[parsed.key] || parsed.key.replace(/Perp$/, '')
      const pair = `${coin}USDT`
      rows.push({
        id: `${exchange}-${pair}`.toLowerCase(),
        pair,
        base: coin,
        exchange,
        ratePct: Number(ratePct.toFixed(4)),
        period: '未知',
        markPrice: null,
        updatedAt: new Date().toISOString(),
        provenance,
      })
    }
  }
  const seen = new Map<string, FundingRate>()
  for (const row of rows) seen.set(`${row.pair}:${row.exchange}`, row)
  return [...seen.values()]
}

function readEntry(entry: unknown): { key: string; info: { fundingRate?: string | number } } | null {
  if (Array.isArray(entry) && entry.length >= 2 && entry[1] && typeof entry[1] === 'object') {
    return { key: String(entry[0]), info: entry[1] as { fundingRate?: string | number } }
  }
  if (entry && typeof entry === 'object') {
    const key = Object.keys(entry)[0]
    const info = (entry as Record<string, { fundingRate?: string | number }>)[key]
    if (key && info) return { key, info }
  }
  return null
}

function selectRates(rates: FundingRate[]): FundingRate[] {
  const byPair = new Map<string, FundingRate[]>()
  for (const rate of rates) {
    const list = byPair.get(rate.pair) ?? []
    list.push(rate)
    byPair.set(rate.pair, list)
  }
  const extremePairs = [...byPair.entries()]
    .filter(([, rows]) => rows.some((row) => Math.abs(row.ratePct) > 0.5))
    .map(([pair]) => pair)
  const ranked = [...byPair.entries()].sort((a, b) => {
    const av = Math.max(...a[1].map((row) => Math.abs(row.ratePct)))
    const bv = Math.max(...b[1].map((row) => Math.abs(row.ratePct)))
    return bv - av
  })
  const selected = new Set(extremePairs.length ? extremePairs : ranked.slice(0, 12).map(([pair]) => pair))
  for (const [pair] of ranked) {
    if (selected.size >= 20) break
    selected.add(pair)
  }
  return rates.filter((rate) => selected.has(rate.pair))
}
