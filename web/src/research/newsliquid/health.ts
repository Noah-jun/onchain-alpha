import { missingKey } from '@/research/env'
import {
  NEWSLIQUID_BASE,
  errorMessage,
  newsliquidRequest,
  newsliquidToken,
  sanitizeNewsliquidError,
} from '@/research/newsliquid/client'

export interface NewsliquidCheck {
  id: string
  endpoint: string
  auth: string
  httpStatus: number | null
  ok: boolean
  error: string | null
  ms: number
}

export async function newsliquidHealth(): Promise<{ configured: boolean; base: string; checks: NewsliquidCheck[] }> {
  const configured = Boolean(newsliquidToken())
  const checks = await Promise.all([
    probe('daily-news-categories', 'GET', '/open/free_categories', undefined, false),
    probe('daily-news-hot', 'GET', '/open/free_hot?category=web3', undefined, false),
    probe('opennews-search', 'POST', '/open/news_search', { limit: 1, page: 1 }, true),
    probe('opentwitter-search', 'POST', '/open/twitter_search', { keywords: 'bitcoin', maxResults: 1, product: 'Latest' }, true),
    probe('opentrade-routers', 'GET', '/open/trader/routers', undefined, true),
  ])
  return { configured, base: NEWSLIQUID_BASE, checks }
}

async function probe(
  id: string,
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
  auth: boolean
): Promise<NewsliquidCheck> {
  const endpoint = `${method} ${NEWSLIQUID_BASE}${path}`
  const authLabel = auth ? 'Bearer NEWSLIQUID_API_TOKEN' : '无'
  if (auth && !newsliquidToken()) {
    return { id, endpoint, auth: authLabel, httpStatus: null, ok: false, error: missingKey('NEWSLIQUID_API_TOKEN'), ms: 0 }
  }
  const started = Date.now()
  try {
    const result = await newsliquidRequest(path, { method, body, auth })
    return { id, endpoint, auth: authLabel, httpStatus: result.status, ok: true, error: null, ms: Date.now() - started }
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : null
    const message = error instanceof Error ? error.message : '请求失败'
    return {
      id,
      endpoint,
      auth: authLabel,
      httpStatus: status || null,
      ok: false,
      error: sanitizeNewsliquidError(errorMessage(null) || message),
      ms: Date.now() - started,
    }
  }
}
