import type { VolatilityAlert } from './types'

export function deriveVolatilityStatus(alert: Pick<VolatilityAlert, 'checks'>): VolatilityAlert['status'] {
  const { multiExchange, volume, freshness } = alert.checks
  return multiExchange.ok && volume.ok && freshness.ok ? 'verified' : 'pending'
}

export function isFiveMinuteShock(change5m: number): boolean {
  return Math.abs(change5m) > 10
}

export function assertVolatilityRules(alerts: VolatilityAlert[]) {
  for (const alert of alerts) {
    if (!isFiveMinuteShock(alert.change5m)) {
      throw new Error(`volatility alert must exceed 10%: ${alert.id}`)
    }
    const expected = deriveVolatilityStatus(alert)
    if (alert.status !== expected) {
      throw new Error(`volatility status mismatch: ${alert.id}`)
    }
  }
}
