export interface ClientSettings {
  perpSymbol: string
  watchlist: string[]
  refreshSeconds: number
  flowMinUsd: number
}

export const SETTINGS_KEY = 'onchain-alpha.research.settings.v2'

export const DEFAULT_SETTINGS: ClientSettings = {
  perpSymbol: '',
  watchlist: [],
  refreshSeconds: 60,
  flowMinUsd: 500000,
}

export function readSettings(): ClientSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<ClientSettings>
    const perpSymbol = String(parsed.perpSymbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    const watchlist = Array.isArray(parsed.watchlist)
      ? parsed.watchlist.map((item) => String(item).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)).filter(Boolean)
      : []
    const refreshSeconds = [30, 60, 120, 300].includes(Number(parsed.refreshSeconds)) ? Number(parsed.refreshSeconds) : 60
    const flowMinUsd = Number(parsed.flowMinUsd)
    return {
      perpSymbol,
      watchlist,
      refreshSeconds,
      flowMinUsd: Number.isFinite(flowMinUsd) && flowMinUsd >= 0 ? flowMinUsd : DEFAULT_SETTINGS.flowMinUsd,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(settings: ClientSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export const KEY_STORAGE = 'onchain-alpha.research.keys.v1'

export const KEY_FIELDS = [
  { name: 'NEWSLIQUID_API_TOKEN', header: 'x-newsliquid-token', label: 'NewsLiquid Token', detail: '用于 OpenNews、OpenTwitter 和只读 OpenTrade。在 6551.io/mcp 获取。' },
  { name: 'AI_API_KEY', header: 'x-ai-api-key', label: 'AI API Key', detail: '用于研究助手调用兼容 /chat/completions 的模型。' },
  { name: 'AI_BASE_URL', header: 'x-ai-base-url', label: 'AI Base URL', detail: '可选。默认 https://api.openai.com/v1。' },
  { name: 'AI_MODEL', header: 'x-ai-model', label: 'AI Model', detail: '可选。默认 gpt-4o-mini。' },
  { name: 'DEEPL_API_KEY', header: 'x-deepl-api-key', label: 'DeepL API Key', detail: '没有 AI key 时用来翻译新闻和讨论。官方接口 https://api.deepl.com/v2/translate ；以 :fx 结尾的 Free key 走 api-free.deepl.com。文档：https://developers.deepl.com' },
  { name: 'NEWS_API_KEY', header: 'x-news-api-key', label: 'CryptoPanic Key', detail: '可选兜底。OpenNews 和每日热点都没有结果时才使用。' },
  { name: 'X_BEARER_TOKEN', header: 'x-x-bearer-token', label: 'X Bearer Token', detail: '可选兜底。没有 NewsLiquid token 时才搜索 X。' },
  { name: 'WHALE_ALERT_API_KEY', header: 'x-whale-alert-key', label: 'Whale Alert Key', detail: '可选。用于链上大额转账。公开成交和 OpenTrade 不依赖它。' },
  { name: 'COINGECKO_API_KEY', header: 'x-coingecko-api-key', label: 'CoinGecko Key', detail: '可选。不填也能用 CoinGecko 免费接口。' },
] as const

export type KeyName = (typeof KEY_FIELDS)[number]['name']

export function readKeys(): Partial<Record<KeyName, string>> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const keys: Partial<Record<KeyName, string>> = {}
    for (const field of KEY_FIELDS) {
      const value = parsed[field.name]
      if (typeof value === 'string' && value.trim()) keys[field.name] = value.trim()
    }
    return keys
  } catch {
    return {}
  }
}

export function writeKeys(keys: Partial<Record<KeyName, string>>) {
  const stored: Partial<Record<KeyName, string>> = {}
  for (const field of KEY_FIELDS) {
    const value = keys[field.name]?.trim()
    if (value) stored[field.name] = value
  }
  window.localStorage.setItem(KEY_STORAGE, JSON.stringify(stored))
}

export function researchHeaders(): Record<string, string> {
  const keys = readKeys()
  const headers: Record<string, string> = {}
  for (const field of KEY_FIELDS) {
    const value = keys[field.name]
    if (value) headers[field.header] = value
  }
  return headers
}
