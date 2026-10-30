import type { FundingRate, HistoryPoint, MoveScan, Provenance, Quote, WhaleTransfer } from '@/domain/types'
import { deriveVolatilityStatus, isFiveMinuteShock } from '@/domain/volatility'
import { demoAllowed, envSet, secretValue } from '@/research/env'
import { cached, fetchJson } from '@/research/http'
import { failedLiveProvenance, liveProvenance } from '@/research/provenance'

const TTL = 45_000
const NAMES: Record<string, string> = {
  BTC: '比特币',
  ETH: '以太坊',
  QQQ: '纳斯达克100 ETF',
  SPX: '标普500',
  CL: 'WTI 原油',
}
const YAHOO: Record<string, string> = { QQQ: 'QQQ', SPX: '^GSPC', CL: 'CL=F' }
const GECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  BNB: 'binancecoin',
  XRP: 'ripple',
}

type Candle = { t: number; open: number; close: number; volume: number }

export async function loadLiveQuotes(symbols: string[]): Promise<{ quotes: Quote[]; provenance: Provenance; error: string | null }> {
  const quotes = await Promise.all(symbols.map((symbol) => oneQuote(symbol)))
  const failed = quotes.filter((quote) => quote.price == null).length
  const sources = [...new Set(quotes.map((quote) => quote.provenance.source))].join(' / ')
  return {
    quotes,
    provenance: liveProvenance(
      sources || '公开行情',
      new Date().toISOString(),
      failed
        ? `${failed} 个代码没有公开报价，这些卡片保持暂无数据。Binance 对部分地区返回 451 时会改用其他交易所。`
        : '公开接口的实时价格，没有混入演示快照。',
      'https://www.okx.com'
    ),
    error: failed === quotes.length && quotes.length ? '公开行情暂时不可用' : null,
  }
}

async function oneQuote(symbol: string): Promise<Quote> {
  const errors: string[] = []
  const loaders = quoteLoaders(symbol)
  for (const loader of loaders) {
    try {
      const quote = await loader()
      if (quote?.price != null) return quote
    } catch (error) {
      errors.push(error instanceof Error ? error.message : '请求失败')
    }
  }
  return blankQuote(symbol, errors)
}

function quoteLoaders(symbol: string): Array<() => Promise<Quote | null>> {
  if (YAHOO[symbol]) return [() => yahooQuote(symbol)]
  if (symbol.endsWith('USDT')) {
    return [
      () => okxSwapQuote(symbol),
      () => bitgetSwapQuote(symbol),
      () => gateSwapQuote(symbol),
      () => binancePerpQuote(symbol),
      () => bybitPerpQuote(symbol),
    ]
  }
  const gecko = GECKO[symbol]
  const loaders: Array<() => Promise<Quote | null>> = []
  if (gecko) loaders.push(() => geckoQuote(symbol, gecko))
  loaders.push(() => okxSpotQuote(symbol), () => mexcSpotQuote(symbol))
  return loaders
}

function blankQuote(symbol: string, errors: string[]): Quote {
  const note = errors.length
    ? `公开行情没有返回 ${symbol}。${errors.slice(0, 3).join('；')}`
    : `公开行情没有这个代码：${symbol}`
  return {
    symbol,
    name: NAMES[symbol] || symbol,
    assetClass: symbol.endsWith('USDT') ? 'perp' : YAHOO[symbol] ? 'traditional' : 'crypto',
    price: null,
    change24h: null,
    currency: 'USD',
    history: [],
    provenance: failedLiveProvenance('公开行情', note),
  }
}

async function geckoQuote(symbol: string, id: string): Promise<Quote> {
  const headers: Record<string, string> = {}
  const coingeckoKey = secretValue('COINGECKO_API_KEY')
  if (coingeckoKey) headers['x-cg-demo-api-key'] = coingeckoKey
  const body = await cached(`cg:${id}`, TTL, () => fetchJson<Record<string, { usd?: number; usd_24h_change?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
    { headers }
  ))
  const row = body[id]
  if (typeof row?.usd !== 'number') throw new Error('CoinGecko 无价格')
  let history: HistoryPoint[] = []
  try {
    const chart = await cached(`cg-chart:${id}`, TTL, () => fetchJson<{ prices?: [number, number][] }>(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1`,
      { headers }
    ))
    history = (chart.prices || []).filter((point) => typeof point[1] === 'number').map(([t, price]) => ({ t: new Date(t).toISOString(), price }))
  } catch {
    history = []
  }
  return quote(symbol, NAMES[symbol] || symbol, 'crypto', row.usd, typeof row.usd_24h_change === 'number' ? row.usd_24h_change : null, history, 'CoinGecko', 'https://www.coingecko.com')
}

async function yahooQuote(symbol: string): Promise<Quote> {
  const ticker = YAHOO[symbol]
  const body = await cached(`yahoo:${ticker}`, TTL, () => fetchJson<{
    chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number; regularMarketTime?: number }; timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] }
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=30m&range=5d`))
  const result = body.chart?.result?.[0]
  const price = result?.meta?.regularMarketPrice
  if (typeof price !== 'number') throw new Error('Yahoo Finance 无价格')
  const previous = result?.meta?.chartPreviousClose
  const change = typeof previous === 'number' && previous !== 0 ? ((price - previous) / previous) * 100 : null
  const times = result?.timestamp ?? []
  const closes = result?.indicators?.quote?.[0]?.close ?? []
  const history = times.flatMap((time, index) => typeof closes[index] === 'number' ? [{ t: new Date(time * 1000).toISOString(), price: closes[index] as number }] : [])
  const updated = result?.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : new Date().toISOString()
  return quote(symbol, NAMES[symbol] || symbol, 'traditional', price, change, history, 'Yahoo Finance', 'https://finance.yahoo.com', updated)
}

async function okxSpotQuote(symbol: string): Promise<Quote | null> {
  return okxTickerQuote(symbol, `${symbol}-USDT`, 'crypto', 'OKX 现货')
}

async function okxSwapQuote(symbol: string): Promise<Quote | null> {
  const inst = okxSwapId(symbol)
  if (!inst) return null
  return okxTickerQuote(symbol, inst, 'perp', 'OKX 永续')
}

async function okxTickerQuote(symbol: string, instId: string, assetClass: Quote['assetClass'], source: string): Promise<Quote> {
  const body = await cached(`okx-ticker:${instId}`, TTL, () => fetchJson<{ data?: { last?: string; open24h?: string }[] }>(
    `https://www.okx.com/api/v5/market/ticker?instId=${instId}`
  ))
  const row = body.data?.[0]
  const price = Number(row?.last)
  const open = Number(row?.open24h)
  if (!Number.isFinite(price)) throw new Error(`${source} 无 ${instId}`)
  const change = Number.isFinite(open) && open !== 0 ? ((price - open) / open) * 100 : null
  const history = await okxHistory(instId)
  return quote(symbol, assetClass === 'perp' ? `${symbol} 永续` : (NAMES[symbol] || symbol), assetClass, price, change, history, source, 'https://www.okx.com')
}

async function okxHistory(instId: string): Promise<HistoryPoint[]> {
  try {
    const body = await cached(`okx-h1:${instId}`, TTL, () => fetchJson<{ data?: string[][] }>(
      `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=1H&limit=24`
    ))
    return (body.data || []).map((row) => ({ t: new Date(Number(row[0])).toISOString(), price: Number(row[4]) })).filter((point) => Number.isFinite(point.price)).reverse()
  } catch {
    return []
  }
}

async function mexcSpotQuote(symbol: string): Promise<Quote | null> {
  const pair = `${symbol}USDT`
  const body = await cached(`mexc:${pair}`, TTL, () => fetchJson<{ lastPrice?: string; priceChangePercent?: string }>(
    `https://api.mexc.com/api/v3/ticker/24hr?symbol=${pair}`
  ))
  const price = Number(body.lastPrice)
  if (!Number.isFinite(price)) return null
  const change = Number(body.priceChangePercent)
  return quote(symbol, NAMES[symbol] || symbol, 'crypto', price, Number.isFinite(change) ? change : null, [], 'MEXC', 'https://www.mexc.com')
}

async function bitgetSwapQuote(symbol: string): Promise<Quote | null> {
  const body = await cached(`bitget-ticker:${symbol}`, TTL, () => fetchJson<{ data?: { lastPr?: string; open24h?: string }[] }>(
    `https://api.bitget.com/api/v2/mix/market/ticker?productType=USDT-FUTURES&symbol=${symbol}`
  ))
  const row = body.data?.[0]
  const price = Number(row?.lastPr)
  const open = Number(row?.open24h)
  if (!Number.isFinite(price)) return null
  const change = Number.isFinite(open) && open !== 0 ? ((price - open) / open) * 100 : null
  return quote(symbol, `${symbol} 永续`, 'perp', price, change, [], 'Bitget 永续', 'https://www.bitget.com')
}

async function gateSwapQuote(symbol: string): Promise<Quote | null> {
  const contract = gateId(symbol)
  if (!contract) return null
  const body = await cached(`gate:${contract}`, TTL, () => fetchJson<{ last_price?: string; change_percentage?: string }>(
    `https://api.gateio.ws/api/v4/futures/usdt/contracts/${contract}`
  ))
  const price = Number(body.last_price)
  const change = Number(body.change_percentage)
  if (!Number.isFinite(price)) return null
  return quote(symbol, `${symbol} 永续`, 'perp', price, Number.isFinite(change) ? change : null, [], 'Gate 永续', 'https://www.gate.io')
}

async function binancePerpQuote(symbol: string): Promise<Quote | null> {
  const body = await cached(`binance-perp:${symbol}`, TTL, () => fetchJson<{ lastPrice?: string; priceChangePercent?: string; closeTime?: number }>(
    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`
  ))
  const price = Number(body.lastPrice)
  if (!Number.isFinite(price)) return null
  const change = Number(body.priceChangePercent)
  let history: HistoryPoint[] = []
  try {
    const klines = await fetchJson<(string | number)[][]>(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=24`)
    history = klines.flatMap((row) => {
      const close = Number(row[4])
      return Number.isFinite(close) ? [{ t: new Date(Number(row[0])).toISOString(), price: close }] : []
    })
  } catch {
    history = []
  }
  return quote(symbol, `${symbol} 永续`, 'perp', price, Number.isFinite(change) ? change : null, history, 'Binance USD-M', 'https://www.binance.com', body.closeTime ? new Date(body.closeTime).toISOString() : undefined)
}

async function bybitPerpQuote(symbol: string): Promise<Quote | null> {
  const body = await cached(`bybit:${symbol}`, TTL, () => fetchJson<{ result?: { list?: { lastPrice?: string; price24hPcnt?: string }[] } }>(
    `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`
  ))
  const row = body.result?.list?.[0]
  const price = Number(row?.lastPrice)
  const change = Number(row?.price24hPcnt) * 100
  if (!Number.isFinite(price)) return null
  return quote(symbol, `${symbol} 永续`, 'perp', price, Number.isFinite(change) ? change : null, [], 'Bybit 永续', 'https://www.bybit.com')
}

function quote(
  symbol: string,
  name: string,
  assetClass: Quote['assetClass'],
  price: number,
  change24h: number | null,
  history: HistoryPoint[],
  source: string,
  sourceUrl: string,
  updatedAt?: string
): Quote {
  return {
    symbol,
    name,
    assetClass,
    price,
    change24h,
    currency: 'USD',
    history,
    provenance: liveProvenance(source, updatedAt || new Date().toISOString(), '公开接口', sourceUrl, 15 * 60 * 1000),
  }
}

export async function loadLiveFunding(): Promise<{ rates: FundingRate[]; provenance: Provenance; error: string | null; venues: string[] }> {
  const settled = await Promise.allSettled([
    binanceFunding(),
    bybitFunding(),
    gateFunding(),
    bitgetFunding(),
  ])
  const chunks = settled.flatMap((item) => item.status === 'fulfilled' ? [item.value] : [])
  let rates = chunks.flat()
  const venues = [...new Set(rates.map((rate) => rate.exchange))]
  const selected = new Set(selectPairs(rates))
  const okx = await okxFunding([...selected]).catch(() => [] as FundingRate[])
  rates = dedupeRates([...rates, ...okx])
  if (okx.length) venues.push('OKX')
  const kept = new Set(selectPairs(rates))
  rates = rates.filter((rate) => kept.has(rate.pair))
  if (!rates.length) {
    return {
      rates: [],
      venues: [],
      provenance: failedLiveProvenance('资金费率', 'Binance、Bybit、OKX、Gate、Bitget 都没有返回资金费率。'),
      error: '资金费率暂时不可用',
    }
  }
  return {
    rates,
    venues,
    provenance: liveProvenance(venues.join(' / '), new Date().toISOString(), '公开资金费率。手续费、盘口和保证金不在这些接口里，跨所价差仍是待验证。', 'https://www.okx.com'),
    error: null,
  }
}

function selectPairs(rates: FundingRate[]): string[] {
  const byPair = new Map<string, FundingRate[]>()
  for (const rate of rates) {
    const rows = byPair.get(rate.pair) ?? []
    rows.push(rate)
    byPair.set(rate.pair, rows)
  }
  const ranked = [...byPair.entries()].sort((a, b) => maxAbs(b[1]) - maxAbs(a[1]))
  const keep = new Set(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
  for (const [pair, rows] of ranked) {
    if (rows.some((row) => Math.abs(row.ratePct) > 0.5)) keep.add(pair)
  }
  for (const [pair] of ranked) {
    if (keep.size >= 24) break
    keep.add(pair)
  }
  return [...keep]
}

function maxAbs(rows: FundingRate[]): number {
  return Math.max(...rows.map((row) => Math.abs(row.ratePct)))
}

function dedupeRates(rates: FundingRate[]): FundingRate[] {
  const seen = new Map<string, FundingRate>()
  for (const rate of rates) seen.set(`${rate.exchange}:${rate.pair}`, rate)
  return [...seen.values()]
}

function rate(exchange: string, pair: string, ratePct: number, period: string, markPrice: number | null, sourceUrl: string): FundingRate {
  const base = pair.replace(/USDT$/, '')
  return {
    id: `${exchange}-${pair}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    pair,
    base,
    exchange,
    ratePct: Number(ratePct.toFixed(4)),
    period,
    markPrice,
    updatedAt: new Date().toISOString(),
    provenance: liveProvenance(exchange, new Date().toISOString(), '公开资金费率', sourceUrl),
  }
}

async function binanceFunding(): Promise<FundingRate[]> {
  const [premium, info] = await Promise.all([
    cached('binance-premium', TTL, () => fetchJson<{ symbol?: string; lastFundingRate?: string; markPrice?: string }[]>('https://fapi.binance.com/fapi/v1/premiumIndex')),
    cached('binance-funding-info', 10 * 60_000, () => fetchJson<{ symbol?: string; fundingIntervalHours?: number }[]>('https://fapi.binance.com/fapi/v1/fundingInfo')).catch(() => []),
  ])
  const hours = new Map(info.map((row) => [row.symbol, row.fundingIntervalHours]))
  return premium.flatMap((row) => {
    if (!row.symbol?.endsWith('USDT')) return []
    const value = Number(row.lastFundingRate) * 100
    if (!Number.isFinite(value)) return []
    const periodHours = hours.get(row.symbol)
    return [rate('Binance', row.symbol, value, periodHours ? `${periodHours}h` : '8h', numberOrNull(row.markPrice), 'https://www.binance.com')]
  })
}

async function bybitFunding(): Promise<FundingRate[]> {
  const body = await cached('bybit-tickers', TTL, () => fetchJson<{ result?: { list?: { symbol?: string; fundingRate?: string; fundingIntervalHour?: string; markPrice?: string }[] } }>(
    'https://api.bybit.com/v5/market/tickers?category=linear'
  ))
  return (body.result?.list || []).flatMap((row) => {
    if (!row.symbol?.endsWith('USDT')) return []
    const value = Number(row.fundingRate) * 100
    if (!Number.isFinite(value)) return []
    return [rate('Bybit', row.symbol, value, row.fundingIntervalHour ? `${row.fundingIntervalHour}h` : '未知', numberOrNull(row.markPrice), 'https://www.bybit.com')]
  })
}

async function gateFunding(): Promise<FundingRate[]> {
  const rows = await cached('gate-contracts', TTL, () => fetchJson<{ name?: string; funding_rate?: string; funding_interval?: number; mark_price?: string }[]>(
    'https://api.gateio.ws/api/v4/futures/usdt/contracts'
  ))
  return rows.flatMap((row) => {
    if (!row.name?.endsWith('_USDT')) return []
    const value = Number(row.funding_rate) * 100
    if (!Number.isFinite(value)) return []
    const pair = row.name.replace('_', '')
    const hours = row.funding_interval ? row.funding_interval / 3600 : null
    return [rate('Gate', pair, value, hours ? `${hours}h` : '未知', numberOrNull(row.mark_price), 'https://www.gate.io')]
  })
}

async function bitgetFunding(): Promise<FundingRate[]> {
  const body = await cached('bitget-tickers', TTL, () => fetchJson<{ data?: { symbol?: string; fundingRate?: string; markPrice?: string }[] }>(
    'https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES'
  ))
  return (body.data || []).flatMap((row) => {
    if (!row.symbol?.endsWith('USDT')) return []
    const value = Number(row.fundingRate) * 100
    if (!Number.isFinite(value)) return []
    return [rate('Bitget', row.symbol, value, '未知', numberOrNull(row.markPrice), 'https://www.bitget.com')]
  })
}

async function okxFunding(pairs: string[]): Promise<FundingRate[]> {
  const targets = pairs.filter((pair) => pair.endsWith('USDT')).slice(0, 16)
  const rows = await Promise.all(targets.map(async (pair) => {
    const instId = okxSwapId(pair)
    if (!instId) return null
    try {
      const body = await cached(`okx-funding:${instId}`, TTL, () => fetchJson<{ data?: { fundingRate?: string; fundingTime?: string; nextFundingTime?: string }[] }>(
        `https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`
      ))
      const row = body.data?.[0]
      const value = Number(row?.fundingRate) * 100
      if (!Number.isFinite(value)) return null
      const start = Number(row?.fundingTime)
      const next = Number(row?.nextFundingTime)
      const hours = Number.isFinite(start) && Number.isFinite(next) && next > start ? Math.round((next - start) / 3_600_000) : null
      return rate('OKX', pair, value, hours ? `${hours}h` : '未知', null, 'https://www.okx.com')
    } catch {
      return null
    }
  }))
  return rows.filter((row): row is FundingRate => row !== null)
}

export async function loadLiveMoves(extra: string[]): Promise<{ items: import('@/domain/types').VolatilityAlert[]; scans: MoveScan[]; provenance: Provenance; error: string | null }> {
  const symbols = [...new Set(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT', 'BNBUSDT', ...extra.map((item) => item.toUpperCase())])].filter((symbol) => symbol.endsWith('USDT'))
  const scans: MoveScan[] = []
  const alerts: import('@/domain/types').VolatilityAlert[] = []
  await Promise.all(symbols.map(async (symbol) => {
    const candles = await loadCandles(symbol)
    if (!candles.length) return
    const primary = candles[0]
    const change = ((primary.closed.close - primary.closed.open) / primary.closed.open) * 100
    if (!Number.isFinite(change)) return
    const above = isFiveMinuteShock(change)
    scans.push({
      symbol,
      change5m: Number(change.toFixed(2)),
      price: primary.closed.close,
      exchange: primary.exchange,
      aboveThreshold: above,
      windowEnd: new Date(primary.closed.t).toISOString(),
    })
    if (!above) return
    const sameSign = candles.every((item) => Math.sign(item.closed.close - item.closed.open) === Math.sign(change))
    const allLarge = candles.every((item) => isFiveMinuteShock(((item.closed.close - item.closed.open) / item.closed.open) * 100))
    const volumeOk = primary.previous && primary.previous.volume > 0 && primary.closed.volume >= primary.previous.volume * 2
    const fresh = Date.now() - primary.closed.t < 15 * 60 * 1000
    const checks = {
      multiExchange: {
        ok: candles.length >= 2 && sameSign && allLarge,
        detail: candles.length >= 2
          ? `${candles.map((item) => item.exchange).join('、')} 都返回了 5 分钟 K 线。${sameSign && allLarge ? '方向一致且都超过 10%。' : '没有同时满足同向且都超过 10%。'}`
          : `只有 ${primary.exchange} 返回了 K 线，不能做跨所核对。`,
      },
      volume: {
        ok: Boolean(volumeOk),
        detail: volumeOk ? `${primary.exchange} 这根 K 线成交额至少为前一根的 2 倍。` : `${primary.exchange} 成交额没有达到前一根的 2 倍，或前一根缺失。`,
      },
      freshness: {
        ok: fresh,
        detail: fresh ? 'K 线时间在 15 分钟内。' : 'K 线时间超过 15 分钟。',
      },
    }
    const alert: import('@/domain/types').VolatilityAlert = {
      id: `live-${symbol}-${primary.closed.t}`,
      symbol,
      name: symbol,
      change5m: Number(change.toFixed(2)),
      price: primary.closed.close,
      windowStart: new Date(primary.closed.t - 5 * 60 * 1000).toISOString(),
      windowEnd: new Date(primary.closed.t).toISOString(),
      checks,
      status: 'pending',
      provenance: liveProvenance(candles.map((item) => item.exchange).join(' / '), new Date(primary.closed.t).toISOString(), '由公开 5 分钟 K 线计算'),
      analysis: {
        eventType: '5 分钟波动',
        relatedAssets: [symbol.replace(/USDT$/, '')],
        sentiment: '未知',
        impact: '这是公开 K 线算出的窗口变化，不是对后续价格的判断。',
        impactPath: '多交易所 K 线 → 超过 10% 才进入异常列表；核对不全则保持待确认。',
        timeHorizon: '5 分钟窗口',
        evidence: candles.map((item) => ({
          quote: `${item.exchange} 开 ${item.closed.open} 收 ${item.closed.close}`,
          source: item.exchange,
          url: null,
        })),
        risks: ['永续价格可以偏离现货。', '单一交易所的窗口不能当成已确认异常。'],
        counterpoints: ['没有超过阈值的窗口不会被写成异常。'],
        confidence: '低',
        confidenceBasis: '只使用本页拉到的 K 线，没有新闻对照。',
        heatTags: [],
        facts: [`${symbol} 在 ${primary.exchange} 的 5 分钟变化为 ${change.toFixed(2)}%。`],
        inferences: [],
        unknowns: ['是否有对应的新闻或链上转账'],
      },
    }
    alert.status = deriveVolatilityStatus(alert)
    alerts.push(alert)
  }))
  scans.sort((a, b) => Math.abs(b.change5m) - Math.abs(a.change5m))
  return {
    items: alerts,
    scans,
    provenance: liveProvenance('OKX / Gate / Bitget / Binance / Bybit', new Date().toISOString(), scans.length ? '5 分钟变化由公开 K 线计算。未超过 10% 的不记为异常。' : '没有拿到可计算的 5 分钟 K 线。'),
    error: scans.length ? null : '波动扫描没有返回 K 线',
  }
}

async function loadCandles(symbol: string): Promise<{ exchange: string; closed: Candle; previous: Candle | null }[]> {
  const tasks = [
    () => okxCandles(symbol),
    () => gateCandles(symbol),
    () => bitgetCandles(symbol),
    () => binanceCandles(symbol),
    () => bybitCandles(symbol),
  ]
  const settled = await Promise.allSettled(tasks.map((task) => task()))
  return settled.flatMap((item) => item.status === 'fulfilled' && item.value ? [item.value] : [])
}

function closedPair(rows: Candle[]): { closed: Candle; previous: Candle | null } | null {
  const usable = rows.filter((row) => row.t <= Date.now() && row.open > 0)
  if (!usable.length) return null
  const closed = usable[usable.length - 1]
  const previous = usable.length > 1 ? usable[usable.length - 2] : null
  return { closed, previous }
}

async function okxCandles(symbol: string) {
  const instId = okxSwapId(symbol)
  if (!instId) return null
  const body = await cached(`okx-5m:${instId}`, 20_000, () => fetchJson<{ data?: string[][] }>(
    `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=5m&limit=4`
  ))
  const rows = (body.data || []).map((row) => ({
    t: Number(row[0]) + 5 * 60 * 1000,
    open: Number(row[1]),
    close: Number(row[4]),
    volume: Number(row[7]),
    confirm: row[8],
  })).filter((row) => row.confirm === '1').sort((a, b) => a.t - b.t)
  const pair = closedPair(rows)
  return pair ? { exchange: 'OKX', ...pair } : null
}

async function gateCandles(symbol: string) {
  const contract = gateId(symbol)
  if (!contract) return null
  const rows = await cached(`gate-5m:${contract}`, 20_000, () => fetchJson<{ t?: number; o?: string; c?: string; sum?: string }[]>(
    `https://api.gateio.ws/api/v4/futures/usdt/candlesticks?contract=${contract}&interval=5m&limit=4`
  ))
  const candles = rows.map((row) => ({ t: Number(row.t) * 1000 + 5 * 60 * 1000, open: Number(row.o), close: Number(row.c), volume: Number(row.sum) })).sort((a, b) => a.t - b.t)
  const pair = closedPair(candles.filter((row) => row.t <= Date.now()))
  return pair ? { exchange: 'Gate', ...pair } : null
}

async function bitgetCandles(symbol: string) {
  const body = await cached(`bitget-5m:${symbol}`, 20_000, () => fetchJson<{ data?: string[][] }>(
    `https://api.bitget.com/api/v2/mix/market/candles?symbol=${symbol}&granularity=5m&limit=4&productType=USDT-FUTURES`
  ))
  const candles = (body.data || []).map((row) => ({ t: Number(row[0]) + 5 * 60 * 1000, open: Number(row[1]), close: Number(row[4]), volume: Number(row[6]) })).sort((a, b) => a.t - b.t)
  const pair = closedPair(candles)
  return pair ? { exchange: 'Bitget', ...pair } : null
}

async function binanceCandles(symbol: string) {
  const rows = await cached(`binance-5m:${symbol}`, 20_000, () => fetchJson<(string | number)[][]>(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=5m&limit=4`
  ))
  const candles = rows.map((row) => ({ t: Number(row[6]), open: Number(row[1]), close: Number(row[4]), volume: Number(row[7]) }))
  const pair = closedPair(candles)
  return pair ? { exchange: 'Binance', ...pair } : null
}

async function bybitCandles(symbol: string) {
  const body = await cached(`bybit-5m:${symbol}`, 20_000, () => fetchJson<{ result?: { list?: string[][] } }>(
    `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=4`
  ))
  const candles = (body.result?.list || []).map((row) => ({ t: Number(row[0]) + 5 * 60 * 1000, open: Number(row[1]), close: Number(row[4]), volume: Number(row[6]) })).sort((a, b) => a.t - b.t)
  const pair = closedPair(candles)
  return pair ? { exchange: 'Bybit', ...pair } : null
}

export async function loadLivePrints(extra: string[]): Promise<{ items: WhaleTransfer[]; provenance: Provenance; error: string | null }> {
  const symbols = [...new Set(['BTCUSDT', 'ETHUSDT', ...extra])].filter((symbol) => symbol.endsWith('USDT')).slice(0, 4)
  const groups = await Promise.all(symbols.map((symbol) => okxPrints(symbol).catch(() => [] as WhaleTransfer[])))
  const items = groups.flat().sort((a, b) => (b.amountUsd || 0) - (a.amountUsd || 0)).slice(0, 20)
  if (!items.length) {
    return {
      items: [],
      provenance: failedLiveProvenance('OKX 公开成交', '没有拉到公开成交。这不是演示数据。'),
      error: '公开成交暂时不可用',
    }
  }
  return {
    items,
    provenance: liveProvenance('OKX 公开成交', new Date().toISOString(), '最近公开成交按名义金额排序。这不是链上充值或提现，也没有十万美元阈值以外的伪造记录。', 'https://www.okx.com'),
    error: null,
  }
}

async function okxPrints(symbol: string): Promise<WhaleTransfer[]> {
  const instId = okxSwapId(symbol)
  if (!instId) return []
  const [trades, instrument] = await Promise.all([
    cached(`okx-trades:${instId}`, 20_000, () => fetchJson<{ data?: { tradeId?: string; px?: string; sz?: string; side?: string; ts?: string }[] }>(
      `https://www.okx.com/api/v5/market/trades?instId=${instId}&limit=100`
    )),
    cached(`okx-inst:${instId}`, 60 * 60_000, () => fetchJson<{ data?: { ctVal?: string }[] }>(
      `https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId=${instId}`
    )),
  ])
  const ctVal = Number(instrument.data?.[0]?.ctVal)
  if (!Number.isFinite(ctVal) || ctVal <= 0) return []
  return (trades.data || []).flatMap((trade) => {
    const price = Number(trade.px)
    const size = Number(trade.sz)
    if (!Number.isFinite(price) || !Number.isFinite(size) || !trade.tradeId) return []
    const amount = size * ctVal
    const amountUsd = amount * price
    const asset = symbol.replace(/USDT$/, '')
    const side = trade.side === 'buy' ? 'buy' : 'sell'
    return [{
      id: `okx-${trade.tradeId}`,
      asset,
      amount,
      amountUsd,
      fromAddress: null,
      toAddress: null,
      fromTag: null,
      toTag: 'OKX 永续公开成交',
      chain: '交易所',
      timestamp: new Date(Number(trade.ts)).toISOString(),
      txHash: null,
      explorerUrl: null,
      observation: 'exchange_print' as const,
      direction: side as 'buy' | 'sell',
      attributionNote: '这是 OKX 永续的公开成交回报，不是链上转账，也不能确认对手方或是否为充值、提现。',
      provenance: liveProvenance('OKX 公开成交', new Date(Number(trade.ts)).toISOString(), '公开成交', 'https://www.okx.com'),
      analysis: {
        eventType: '大额成交',
        relatedAssets: [asset],
        sentiment: '未知',
        impact: '单笔公开成交只说明当时有人成交，不能推出后续价格方向。',
        impactPath: '成交回报 → 名义金额。没有账户身份，也没有链上确认。',
        timeHorizon: '未知',
        evidence: [{ quote: `${side === 'buy' ? '买入' : '卖出'} ${amount} ${asset}，价格 ${price}`, source: 'OKX', url: null }],
        risks: ['成交可以被拆成多笔。', '公开成交不等于交易所充提。'],
        counterpoints: ['价格和数量来自交易所回报，不是估算。'],
        confidence: '中',
        confidenceBasis: '数量、价格和方向来自 OKX 公开成交；合约面值来自同一交易所的合约资料。',
        heatTags: [],
        facts: [`名义金额约 ${amountUsd.toFixed(0)} 美元。`, '观察状态是交易所公开成交，不是链上充提。'],
        inferences: [],
        unknowns: ['成交账户', '是否对应链上转账'],
      },
    }]
  })
}

function okxSwapId(symbol: string): string | null {
  if (!symbol.endsWith('USDT')) return null
  return `${symbol.slice(0, -4)}-USDT-SWAP`
}

function gateId(symbol: string): string | null {
  if (!symbol.endsWith('USDT')) return null
  return `${symbol.slice(0, -4)}_USDT`
}

function numberOrNull(value: string | undefined): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function usesDemo(): boolean {
  return demoAllowed()
}
