import type { MoveScan, Provenance, VolatilityAlert } from '@/domain/types'
import { DEMO_VOLATILITY } from '@/research/demo/catalog'
import { demoAllowed, normalizeSymbol } from '@/research/env'
import { demoProvenance } from '@/research/provenance'
import { loadLiveMoves } from '@/research/publicMarkets'

export async function loadVolatility(extraSymbols: string[] = []): Promise<{
  items: VolatilityAlert[]
  scans: MoveScan[]
  provenance: Provenance
  error: string | null
}> {
  if (demoAllowed()) {
    return {
      items: DEMO_VOLATILITY,
      scans: DEMO_VOLATILITY.map((item) => ({
        symbol: item.symbol,
        change5m: item.change5m,
        price: item.price,
        exchange: '演示',
        aboveThreshold: true,
        windowEnd: item.windowEnd,
      })),
      provenance: demoProvenance('演示 5 分钟波动样本', 'RESEARCH_ALLOW_DEMO=1，这是显式打开的演示警报。'),
      error: null,
    }
  }
  return loadLiveMoves(extraSymbols.map(normalizeSymbol))
}
