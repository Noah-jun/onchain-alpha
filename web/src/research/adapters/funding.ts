import type { FundingRate, PairCostProfile, Provenance } from '@/domain/types'
import { DEMO_FUNDING, DEMO_FUNDING_COSTS } from '@/research/demo/catalog'
import { demoAllowed } from '@/research/env'
import { demoProvenance } from '@/research/provenance'
import { loadLiveFunding } from '@/research/publicMarkets'

export async function loadFunding(): Promise<{
  rates: FundingRate[]
  profiles: PairCostProfile[]
  provenance: Provenance
  error: string | null
}> {
  if (demoAllowed()) {
    return {
      rates: DEMO_FUNDING,
      profiles: DEMO_FUNDING_COSTS,
      provenance: demoProvenance('演示资金费率表', 'RESEARCH_ALLOW_DEMO=1，这是显式打开的演示费率，不是交易所当前费率。'),
      error: null,
    }
  }
  const live = await loadLiveFunding()
  const profiles = [...new Set(live.rates.map((rate) => rate.pair))].map((pair) => ({
    pair,
    fee: null,
    spread: null,
    margin: null,
    settlementNote: null,
    residualRisks: null,
  }))
  return { rates: live.rates, profiles, provenance: live.provenance, error: live.error }
}
