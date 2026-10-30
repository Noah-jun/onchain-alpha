const memory = new Map<string, { exp: number; value: unknown }>()

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('accept')) headers.set('accept', 'application/json')
  if (!headers.has('user-agent')) headers.set('user-agent', 'onchain-alpha-research/1.0')
  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key)
  if (hit && hit.exp > Date.now()) return hit.value as T
  const value = await load()
  memory.set(key, { exp: Date.now() + ttlMs, value })
  return value
}
