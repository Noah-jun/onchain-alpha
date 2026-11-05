import { requestSecret, type RequestSecrets } from '@/research/requestSecrets'

export type ProviderChoice =
  | { kind: 'demo' }
  | { kind: 'unconfigured'; reason: string }
  | { kind: 'live'; provider: string }

const CLIENT_SECRET_NAMES = new Set<keyof RequestSecrets>([
  'NEWSLIQUID_API_TOKEN',
  'AI_API_KEY',
  'AI_BASE_URL',
  'AI_MODEL',
  'NEWS_API_KEY',
  'X_BEARER_TOKEN',
  'WHALE_ALERT_API_KEY',
  'COINGECKO_API_KEY',
  'DEEPL_API_KEY',
])

/** Header value for this request, otherwise the server environment variable. */
export function secretValue(name: string): string | null {
  if (CLIENT_SECRET_NAMES.has(name as keyof RequestSecrets)) {
    const fromHeader = requestSecret(name as keyof RequestSecrets)
    if (fromHeader) return fromHeader
  }
  const fromEnv = process.env[name]?.trim()
  return fromEnv || null
}

export function envSet(name: string): boolean {
  return Boolean(secretValue(name))
}

/** Demo fixtures stay off unless this exact flag is set. */
export function demoAllowed(): boolean {
  return process.env.RESEARCH_ALLOW_DEMO === '1'
}

export function missingKey(name: string): string {
  return `未配置。请在设置页保存 ${name}，或在服务端环境变量中设置。`
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
