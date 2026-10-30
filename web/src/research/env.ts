export type ProviderChoice =
  | { kind: 'demo' }
  | { kind: 'unconfigured'; reason: string }
  | { kind: 'live'; provider: string }

export function envSet(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

/** Demo fixtures stay off unless this exact flag is set. */
export function demoAllowed(): boolean {
  return process.env.RESEARCH_ALLOW_DEMO === '1'
}

export function missingKey(name: string): string {
  return `未配置，需在 Vercel 环境变量设置 ${name}`
}

export function resolveProvider(envName: string, liveNames: string[], secretName?: string): ProviderChoice {
  if (demoAllowed()) return { kind: 'demo' }
  const raw = (process.env[envName] || '').trim().toLowerCase()
  if (secretName && !envSet(secretName)) {
    return { kind: 'unconfigured', reason: missingKey(secretName) }
  }
  if (!raw) return { kind: 'live', provider: liveNames[0] }
  if (raw === 'demo') {
    return { kind: 'unconfigured', reason: '演示模式未打开。若要使用演示快照，请显式设置 RESEARCH_ALLOW_DEMO=1。' }
  }
  if (!liveNames.includes(raw)) {
    return { kind: 'unconfigured', reason: `${envName}=${raw} 不是已实现的数据源` }
  }
  return { kind: 'live', provider: raw }
}

export function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
}
