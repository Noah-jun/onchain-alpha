import type { Provenance, ResearchNote, VolatilityAlert } from '@/domain/types'
import { deriveVolatilityStatus, isFiveMinuteShock } from '@/domain/volatility'
import { DEMO_VOLATILITY } from '@/research/demo/catalog'
import { normalizeSymbol, resolveProvider } from '@/research/env'
import { fetchJson } from '@/research/http'
import { demoProvenance, failedLiveProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'

const DEFAULT_LIVE = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'PEPEUSDT']

export async function loadVolatility(extraSymbols: string[] = []): Promise<{
  items: VolatilityAlert[]
  provenance: Provenance
  error: string | null
}> {
  const choice = resolveProvider('VOLATILITY_PROVIDER', ['binance'])
  if (choice.kind === 'demo') {
    return { items: DEMO_VOLATILITY, provenance: demoProvenance('演示 5 分钟波动样本'), error: null }
  }
  if (choice.kind === 'unconfigured') {
    return { items: [], provenance: unconfiguredProvenance('异常波动', choice.reason), error: choice.reason }
  }
  const symbols = [...new Set([...DEFAULT_LIVE, ...extraSymbols.map(normalizeSymbol)].filter((symbol) => symbol.endsWith('USDT')))]
  try {
    const scanned = await Promise.all(symbols.map(async (symbol) => {
      try {
        return await scanSymbol(symbol)
      } catch {
        return null
      }
    }))
    const items = scanned.filter((item): item is VolatilityAlert => item !== null)
    return {
      items,
      provenance: liveProvenance(
        'Binance USD-M 5m K线',
        new Date().toISOString(),
        items.length
          ? '只有单交易所，跨所核对失败，因此超过阈值的窗口会标成待确认异常。'
          : '已检查默认永续列表，没有绝对变化超过 10% 的 5 分钟窗口。',
        'https://www.binance.com'
      ),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return {
      items: [],
      provenance: failedLiveProvenance('Binance USD-M', `波动检查失败（${message}），未回退到演示警报`),
      error: message,
    }
  }
}

async function scanSymbol(symbol: string): Promise<VolatilityAlert | null> {
  const klines = await fetchJson<(string | number)[][]>(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=5m&limit=3`
  )
  if (!Array.isArray(klines) || klines.length < 2) return null
  const closed = selectClosed(klines)
  if (!closed) return null
  const open = Number(closed.row[1])
  const close = Number(closed.row[4])
  const volume = Number(closed.row[5])
  const previousVolume = closed.previousVolume
  if (!open || !Number.isFinite(close)) return null
  const change5m = ((close - open) / open) * 100
  if (!isFiveMinuteShock(change5m)) return null
  const volumeOk = Number.isFinite(previousVolume) && previousVolume > 0 && volume >= previousVolume * 2
  const closeTime = Number(closed.row[6])
  const fresh = Number.isFinite(closeTime) && Date.now() - closeTime < 15 * 60 * 1000
  const checks = {
    multiExchange: { ok: false, detail: '实时适配器只有 Binance，不能做跨所核对。' },
    volume: {
      ok: volumeOk,
      detail: volumeOk ? '该根 K 线成交量至少为前一根的 2 倍。' : '成交量没有达到前一根的 2 倍，或前值缺失。',
    },
    freshness: {
      ok: fresh,
      detail: fresh ? 'K 线收盘时间在 15 分钟内。' : 'K 线收盘时间过旧。',
    },
  }
  const alert: VolatilityAlert = {
    id: `bn-${symbol}-${closed.row[0]}`,
    symbol,
    name: symbol,
    change5m: Number(change5m.toFixed(2)),
    price: close,
    windowStart: new Date(Number(closed.row[0])).toISOString(),
    windowEnd: new Date(closeTime).toISOString(),
    checks,
    status: 'pending',
    provenance: liveProvenance('Binance USD-M', new Date(closeTime).toISOString(), '单交易所 5 分钟 K 线'),
    analysis: emptyAnalysis(symbol, change5m),
  }
  alert.status = deriveVolatilityStatus(alert)
  return alert
}

function selectClosed(klines: (string | number)[][]) {
  const now = Date.now()
  let picked: { row: (string | number)[]; previousVolume: number } | null = null
  for (let index = 0; index < klines.length; index += 1) {
    const row = klines[index]
    const closeTime = Number(row[6])
    if (Number.isFinite(closeTime) && closeTime <= now) {
      picked = { row, previousVolume: index > 0 ? Number(klines[index - 1][5]) : NaN }
    }
  }
  return picked
}

function emptyAnalysis(symbol: string, change5m: number): ResearchNote {
  return {
    eventType: '5 分钟波动',
    relatedAssets: [symbol.replace(/USDT$/, '')],
    sentiment: '未知',
    impact: '变化超过 10% 阈值，但缺少跨所核对，只能作为待确认异常。',
    impactPath: '单一交易所 K 线 → 尚未被其他 venue 证实。',
    timeHorizon: '5 分钟窗口',
    evidence: [{ quote: `${symbol} 5 分钟变化 ${change5m.toFixed(2)}%`, source: 'Binance USD-M', url: null }],
    risks: ['单一交易所可能出现坏点。', '永续价格可以偏离现货。'],
    counterpoints: ['阈值规则是明确的，失败的核对也被保留。'],
    confidence: '低',
    confidenceBasis: '跨所核对未通过。',
    heatTags: [],
    facts: [`${symbol} 的 5 分钟变化为 ${change5m.toFixed(2)}%。`],
    inferences: [],
    unknowns: ['其他交易所是否同向', '是否有对应新闻'],
  }
}
