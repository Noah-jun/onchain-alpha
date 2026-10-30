import { AsyncLocalStorage } from 'async_hooks'

export interface RequestSecrets {
  NEWSLIQUID_API_TOKEN?: string
  AI_API_KEY?: string
  AI_BASE_URL?: string
  AI_MODEL?: string
  NEWS_API_KEY?: string
  X_BEARER_TOKEN?: string
  WHALE_ALERT_API_KEY?: string
  COINGECKO_API_KEY?: string
  DEEPL_API_KEY?: string
}

const HEADER_TO_NAME: Record<string, keyof RequestSecrets> = {
  'x-newsliquid-token': 'NEWSLIQUID_API_TOKEN',
  'x-ai-api-key': 'AI_API_KEY',
  'x-ai-base-url': 'AI_BASE_URL',
  'x-ai-model': 'AI_MODEL',
  'x-news-api-key': 'NEWS_API_KEY',
  'x-x-bearer-token': 'X_BEARER_TOKEN',
  'x-whale-alert-key': 'WHALE_ALERT_API_KEY',
  'x-coingecko-api-key': 'COINGECKO_API_KEY',
  'x-deepl-api-key': 'DEEPL_API_KEY',
}

const storage = new AsyncLocalStorage<RequestSecrets>()

export function withClientKeys<T>(request: Request, run: () => Promise<T>): Promise<T> {
  const secrets: RequestSecrets = {}
  for (const [header, name] of Object.entries(HEADER_TO_NAME)) {
    const value = request.headers.get(header)?.trim()
    if (value) secrets[name] = value.slice(0, 500)
  }
  return storage.run(secrets, run)
}

export function requestSecret(name: keyof RequestSecrets): string | null {
  const value = storage.getStore()?.[name]?.trim()
  return value || null
}
