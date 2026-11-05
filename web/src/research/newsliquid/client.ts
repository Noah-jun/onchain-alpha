import { missingKey, secretValue } from '@/research/env'

export const NEWSLIQUID_BASE = (process.env.NEWSLIQUID_API_BASE || 'https://ai.6551.io').replace(/\/$/, '')

export function newsliquidToken(): string | null {
  return secretValue('NEWSLIQUID_API_TOKEN')
}

export function sanitizeNewsliquidError(message: string): string {
  const token = newsliquidToken()
  const cleaned = token ? message.split(token).join('[redacted]') : message
  return cleaned.slice(0, 300)
}

export class NewsliquidHttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(sanitizeNewsliquidError(message))
    this.status = status
  }
}

export async function newsliquidRequest(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; auth?: boolean } = {}
): Promise<{ status: number; body: unknown }> {
  const auth = options.auth !== false
  const headers: Record<string, string> = { accept: 'application/json' }
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (auth) {
    const token = newsliquidToken()
    if (!token) throw new NewsliquidHttpError(0, missingKey('NEWSLIQUID_API_TOKEN'))
    headers.authorization = `Bearer ${token}`
  }
  let response: Response
  try {
    response = await fetch(`${NEWSLIQUID_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
  } catch (error) {
    throw new NewsliquidHttpError(0, error instanceof Error ? error.message : '请求失败')
  }
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text.slice(0, 180) }
    }
  }
  if (!response.ok) {
    throw new NewsliquidHttpError(response.status, errorMessage(body) || `HTTP ${response.status}`)
  }
  return { status: response.status, body }
}

export function errorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const record = body as Record<string, unknown>
  const message = record.msg || record.message || record.error
  return typeof message === 'string' ? sanitizeNewsliquidError(message) : ''
}

export function unwrapData(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const record = body as Record<string, unknown>
  if ((record.ok === true || record.success === true || record.code === '0' || record.code === 0) && 'data' in record) {
    return record.data
  }
  return body
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  if (!record) return []
  for (const key of ['data', 'items', 'tweets', 'list', 'users']) {
    const child = record[key]
    if (Array.isArray(child)) return child
    const nested = asRecord(child)
    if (nested) {
      for (const inner of ['items', 'tweets', 'list', 'data']) {
        if (Array.isArray(nested[inner])) return nested[inner] as unknown[]
      }
    }
  }
  return []
}
