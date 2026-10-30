export type ProviderChoice =
  | { kind: 'demo' }
  | { kind: 'unconfigured'; reason: string }
  | { kind: 'live'; provider: string }

export function envSet(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

export function resolveProvider(envName: string, liveNames: string[], secretName?: string): ProviderChoice {
  const raw = (process.env[envName] || 'demo').trim().toLowerCase()
  if (!raw || raw === 'demo') return { kind: 'demo' }
  if (!liveNames.includes(raw)) {
    return { kind: 'unconfigured', reason: `${envName}=${raw} 不是已实现的数据源` }
  }
  if (secretName && !envSet(secretName)) {
    return { kind: 'unconfigured', reason: `已选择 ${raw}，但未配置 ${secretName}` }
  }
  return { kind: 'live', provider: raw }
}

export function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
}
