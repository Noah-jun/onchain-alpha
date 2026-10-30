import type { Provenance, Quote } from '@/domain/types'
import { DEMO_QUOTES } from '@/research/demo/catalog'
import { envSet, normalizeSymbol, resolveProvider } from '@/research/env'
import { fetchJson } from '@/research/http'
import {
  demoProvenance,
  failedLiveProvenance,
  liveProvenance,
  unconfiguredProvenance,
} from '@/research/provenance'

const YAHOO: Record<string, string> = {
  QQQ: 'QQQ',
  SPX: '^GSPC',
  CL: 'CL=F',
}

const COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
}

export async function loadQuotes(symbols: string[]): Promise<{ quotes: Quote[]; provenance: Provenance; error: string | null }> {
  const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))]
  const choice = resolveProvider('RESEARCH_MARKET_PROVIDER', ['coingecko'])
  if (choice.kind === 'demo') {
    return {
      quotes: unique.map((symbol) => demoQuote(symbol)),
      provenance: demoProvenance('演示快照 · 行情'),
      error: null,
    }
  }
  if (choice.kind === 'unconfigured') {
    return {
      quotes: unique.map((symbol) => blankQuote(symbol, 'unconfigured', '行情', choice.reason)),
      provenance: unconfiguredProvenance('行情', choice.reason),
      error: choice.reason,
    }
  }
  const quotes = await Promise.all(unique.map((symbol) => liveQuote(symbol)))
  const failed = quotes.filter((quote) => quote.price == null).length
  return {
    quotes,
    provenance: liveProvenance(
      'CoinGecko / Yahoo Finance / Binance',
      new Date().toISOString(),
      failed ? `${failed} 个代码没有取到价格，这些卡片保持暂无数据。` : '公开接口返回的价格，未混入演示快照。',
      'https://api.coingecko.com'
    ),
    error: null,
  }
}

function demoQuote(symbol: string): Quote {
  return (
    DEMO_QUOTES.find((quote) => quote.symbol === symbol) ??
    blankQuote(symbol, 'demo', '演示行情目录', '演示目录中没有该代码')
  )
}

function blankQuote(symbol: string, mode: Quote['provenance']['mode'], source: string, note: string): Quote {
  const base = mode === 'unconfigured'
    ? unconfiguredProvenance(source, note)
    : mode === 'live'
      ? failedLiveProvenance(source, note)
      : { ...demoProvenance(source, note), freshness: 'missing' as const }
  return {
    symbol,
    name: symbol,
    assetClass: symbol.endsWith('USDT') ? 'perp' : 'crypto',
    price: null,
    change24h: null,
    currency: 'USD',
    history: [],
    provenance: base,
  }
}

async function liveQuote(symbol: string): Promise<Quote> {
  try {
    if (COINGECKO[symbol]) return await coinGeckoQuote(symbol)
    if (YAHOO[symbol]) return await yahooQuote(symbol)
    if (symbol.endsWith('USDT')) return await binancePerpQuote(symbol)
    return blankQuote(symbol, 'live', '行情', '实时适配器没有这个代码的映射')
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return blankQuote(symbol, 'live', '行情', `实时源请求失败（${message}），未用演示价格填充`)
  }
}

async function coinGeckoQuote(symbol: string): Promise<Quote> {
  const id = COINGECKO[symbol]
  const headers: Record<string, string> = { accept: 'application/json' }
  if (envSet('COINGECKO_API_KEY')) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY!.trim()
  const priceBody = await fetchJson<Record<string, { usd?: number; usd_24h_change?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
    { headers }
  )
  const row = priceBody[id]
  if (!row || typeof row.usd !== 'number') {
    return blankQuote(symbol, 'live', 'CoinGecko', 'CoinGecko 没有返回价格')
  }
  let history: Quote['history'] = []
  let historyNote = '历史序列暂无。'
  try {
    const chart = await fetchJson<{ prices?: [number, number][] }>(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1`,
      { headers }
    )
    if (chart.prices && chart.prices.length > 2) {
      history = chart.prices.map(([t, price]) => ({ t: new Date(t).toISOString(), price }))
      historyNote = '历史序列来自 CoinGecko market_chart。'
    }
  } catch {
    historyNote = 'CoinGecko 历史序列请求失败，图上不使用演示价格。'
    history = []
  }
  return {
    symbol,
    name: symbol === 'BTC' ? '比特币' : '以太坊',
    assetClass: 'crypto',
    price: row.usd,
    change24h: typeof row.usd_24h_change === 'number' ? row.usd_24h_change : null,
    currency: 'USD',
    history,
    provenance: liveProvenance('CoinGecko', new Date().toISOString(), historyNote, 'https://www.coingecko.com'),
  }
}

async function yahooQuote(symbol: string): Promise<Quote> {
  const ticker = YAHOO[symbol]
  const body = await fetchJson<{
    chart?: {
      result?: {
        meta?: { regularMarketPrice?: number; chartPreviousClose?: number; regularMarketTime?: number }
        timestamp?: number[]
        indicators?: { quote?: { close?: (number | null)[] }[] }
      }[]
    }
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=30m&range=5d`, {
    headers: { 'user-agent': 'onchain-alpha-research/0.1' },
  })
  const result = body.chart?.result?.[0]
  const price = result?.meta?.regularMarketPrice
  if (typeof price !== 'number') return blankQuote(symbol, 'live', 'Yahoo Finance', 'Yahoo Finance 没有返回价格')
  const previous = result?.meta?.chartPreviousClose
  const change24h = typeof previous === 'number' && previous !== 0 ? ((price - previous) / previous) * 100 : null
  const times = result?.timestamp ?? []
  const closes = result?.indicators?.quote?.[0]?.close ?? []
  const history = times.flatMap((time, index) => {
    const close = closes[index]
    return typeof close === 'number' ? [{ t: new Date(time * 1000).toISOString(), price: close }] : []
  })
  const names: Record<string, string> = { QQQ: '纳斯达克100 ETF', SPX: '标普500', CL: 'WTI 原油' }
  const updatedAt = result?.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : new Date().toISOString()
  return {
    symbol,
    name: names[symbol] ?? symbol,
    assetClass: 'traditional',
    price,
    change24h,
    currency: 'USD',
    history,
    provenance: liveProvenance('Yahoo Finance', updatedAt, '传统市场公开报价', 'https://finance.yahoo.com'),
  }
}

async function binancePerpQuote(symbol: string): Promise<Quote> {
  const ticker = await fetchJson<{ lastPrice?: string; priceChangePercent?: string; closeTime?: number }>(
    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`
  )
  const price = ticker.lastPrice ? Number(ticker.lastPrice) : NaN
  if (!Number.isFinite(price)) return blankQuote(symbol, 'live', 'Binance USD-M', 'Binance 没有返回该永续价格')
  const change = ticker.priceChangePercent ? Number(ticker.priceChangePercent) : null
  let history: Quote['history'] = []
  try {
    const klines = await fetchJson<(string | number)[][]>(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=24`
    )
    if (Array.isArray(klines)) {
      history = klines.flatMap((row) => {
        const openTime = Number(row[0])
        const close = Number(row[4])
        return Number.isFinite(openTime) && Number.isFinite(close) ? [{ t: new Date(openTime).toISOString(), price: close }] : []
      })
    }
  } catch {
    history = []
  }
  return {
    symbol,
    name: `${symbol} 永续`,
    assetClass: 'perp',
    price,
    change24h: change != null && Number.isFinite(change) ? change : null,
    currency: 'USD',
    history,
    provenance: liveProvenance(
      'Binance USD-M',
      ticker.closeTime ? new Date(ticker.closeTime).toISOString() : new Date().toISOString(),
      history.length ? '永续最新价与 1 小时 K 线。' : 'K 线缺失，只保留最新价。',
      'https://www.binance.com'
    ),
  }
}
