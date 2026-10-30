import type { FundingOpportunity, FundingRate, PairCostProfile, Provenance } from './types'

export type FundingFilter = 'all' | 'below' | 'above'

export const FUNDING_THRESHOLD = 0.5

export function matchesFundingFilter(ratePct: number, filter: FundingFilter): boolean {
  if (filter === 'below') return ratePct < -FUNDING_THRESHOLD
  if (filter === 'above') return ratePct > FUNDING_THRESHOLD
  return true
}

/** Keep every venue for a pair once any venue matches, so comparison stays intact. */
export function filterRates(rates: FundingRate[], filter: FundingFilter): FundingRate[] {
  if (filter === 'all') return rates
  const pairs = new Set(
    rates.filter((rate) => matchesFundingFilter(rate.ratePct, filter)).map((rate) => rate.pair)
  )
  return rates.filter((rate) => pairs.has(rate.pair))
}

const BASE_RISKS = [
  '资金费率在结算前可能变化，价差不是已锁定的收益。',
  '手续费、盘口、保证金和强平没有被证明可以忽略。',
  '本工具不下单，也不把费率差称为无风险利润。',
]

export function buildOpportunities(
  rates: FundingRate[],
  profiles: PairCostProfile[],
  provenanceFor: (pair: string) => Provenance
): FundingOpportunity[] {
  const grouped = new Map<string, FundingRate[]>()
  for (const rate of rates) {
    const rows = grouped.get(rate.pair) ?? []
    rows.push(rate)
    grouped.set(rate.pair, rows)
  }

  const opportunities: FundingOpportunity[] = []
  for (const [pair, rows] of grouped) {
    if (rows.length < 2) continue
    const high = rows.reduce((best, row) => (row.ratePct > best.ratePct ? row : best))
    const low = rows.reduce((best, row) => (row.ratePct < best.ratePct ? row : best))
    const spread = high.ratePct - low.ratePct
    const extreme = rows.some((row) => Math.abs(row.ratePct) > FUNDING_THRESHOLD)
    if (spread < 0.2 && !extreme) continue

    const profile = profiles.find((item) => item.pair === pair)
    const missing: string[] = []
    const known: { label: string; value: string }[] = []
    if (profile?.fee) known.push({ label: '手续费', value: profile.fee })
    else missing.push('双边交易手续费')
    if (profile?.spread) known.push({ label: '盘口价差', value: profile.spread })
    else missing.push('盘口价差与滑点')
    if (profile?.margin) known.push({ label: '保证金', value: profile.margin })
    else missing.push('保证金占用与强平缓冲')

    const periods = new Set(rows.map((row) => row.period))
    if ([...periods].some((period) => period === '未知')) {
      missing.push('结算周期')
    } else if (periods.size > 1) {
      missing.push('不同结算周期的对齐口径')
    } else if (profile?.settlementNote) {
      known.push({ label: '结算', value: profile.settlementNote })
    } else {
      missing.push('结算时点能否同时成交的核验')
    }

    if (profile?.residualRisks?.length) {
      known.push({ label: '已列风险', value: profile.residualRisks.join('；') })
    } else {
      missing.push('对手方、穿仓与划转风险清单')
    }

    const unverified = missing.length > 0
    opportunities.push({
      id: pair,
      pair,
      highExchange: high.exchange,
      lowExchange: low.exchange,
      highRate: high.ratePct,
      lowRate: low.ratePct,
      spreadPct: Number(spread.toFixed(4)),
      periods: rows.map((row) => `${row.exchange} ${row.period}`),
      label: unverified ? '待验证的费率差' : '费率差观察',
      missing,
      known,
      structureNote:
        '数学上，费率较高的一侧重空、费率较低的一侧重多，才会收取这个费率差。这只是结构描述，不是交易指令。',
      risks: unverified
        ? BASE_RISKS
        : [
            ...BASE_RISKS,
            '即便下列成本已填写，仍可能有未建模的借币、强平和交易所风险。',
          ],
      provenance: provenanceFor(pair),
    })
  }

  return opportunities.sort((a, b) => b.spreadPct - a.spreadPct)
}

export function assertFundingRules(rates: FundingRate[], opportunities: FundingOpportunity[]) {
  for (const opportunity of opportunities) {
    if (opportunity.label.includes('无风险')) {
      throw new Error('funding opportunity must not claim risk-free profit')
    }
    if (opportunity.missing.length > 0 && opportunity.label !== '待验证的费率差') {
      throw new Error(`missing costs must stay unverified: ${opportunity.pair}`)
    }
  }
  if (rates.length && !rates.every((rate) => Number.isFinite(rate.ratePct))) {
    throw new Error('funding rate must be numeric')
  }
}
