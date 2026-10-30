import type { DataMode, Freshness, Provenance } from '@/domain/types'

/** Fixed demo clock: 2026-10-29 08:00 Asia/Shanghai. */
export const DEMO_UPDATED_AT = '2026-10-29T08:00:00+08:00'

export function computeFreshness(updatedAt: string | null, maxAgeMs: number): Freshness {
  if (!updatedAt) return 'missing'
  const time = new Date(updatedAt).getTime()
  if (Number.isNaN(time)) return 'missing'
  return Date.now() - time > maxAgeMs ? 'stale' : 'fresh'
}

export function demoProvenance(
  source: string,
  note = '内置演示快照，不是实时数据',
  maxAgeMs = 15 * 60 * 1000
): Provenance {
  return {
    source,
    sourceUrl: null,
    fetchedAt: new Date().toISOString(),
    updatedAt: DEMO_UPDATED_AT,
    freshness: computeFreshness(DEMO_UPDATED_AT, maxAgeMs),
    mode: 'demo',
    note,
  }
}

export function liveProvenance(
  source: string,
  updatedAt: string | null,
  note: string,
  sourceUrl: string | null = null,
  maxAgeMs = 15 * 60 * 1000
): Provenance {
  return {
    source,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    updatedAt,
    freshness: updatedAt ? computeFreshness(updatedAt, maxAgeMs) : 'missing',
    mode: 'live',
    note,
  }
}

export function failedLiveProvenance(source: string, note: string, sourceUrl: string | null = null): Provenance {
  return {
    source,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    updatedAt: null,
    freshness: 'missing',
    mode: 'live',
    note,
  }
}

export function unconfiguredProvenance(source: string, note: string): Provenance {
  return {
    source,
    sourceUrl: null,
    fetchedAt: new Date().toISOString(),
    updatedAt: null,
    freshness: 'missing',
    mode: 'unconfigured',
    note,
  }
}

export function modeOf(configured: boolean, selected: 'demo' | 'live' | 'unconfigured'): DataMode {
  if (selected === 'demo') return 'demo'
  if (!configured) return 'unconfigured'
  return 'live'
}
