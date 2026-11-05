import { getCache } from '@vercel/functions'

const TTL_SECONDS = 24 * 60 * 60
const MEMORY_LIMIT = 1000

type Kind = 'discussion' | 'news'

interface MemoryEntry {
  exp: number
  value: unknown
}

const memory = new Map<string, MemoryEntry>()

function cacheKey(kind: Kind, id: string) {
  return `${kind}:${id}`
}

function rememberMemory(key: string, value: unknown) {
  if (memory.size >= MEMORY_LIMIT) {
    const oldest = memory.keys().next().value
    if (oldest) memory.delete(oldest)
  }
  memory.delete(key)
  memory.set(key, { exp: Date.now() + TTL_SECONDS * 1000, value })
}

function recallMemory(key: string): unknown | null {
  const hit = memory.get(key)
  if (!hit) return null
  if (hit.exp <= Date.now()) {
    memory.delete(key)
    return null
  }
  memory.delete(key)
  memory.set(key, hit)
  return hit.value
}

function runtime() {
  try {
    return getCache({ namespace: 'research-seen' })
  } catch {
    return null
  }
}

export async function rememberItems(kind: Kind, items: { id: string }[]) {
  const cache = runtime()
  await Promise.all(items.map(async (item) => {
    if (!item?.id) return
    const key = cacheKey(kind, item.id)
    rememberMemory(key, item)
    if (!cache) return
    try {
      await cache.set(key, item, { ttl: TTL_SECONDS, tags: [`research-seen-${kind}`], name: key.slice(0, 120) })
    } catch {
      // Local Next.js has no shared Runtime Cache. The memory copy still serves this instance.
    }
  }))
}

export async function recallItem<T extends { id: string }>(kind: Kind, id: string): Promise<T | null> {
  const key = cacheKey(kind, id)
  const local = recallMemory(key)
  if (isItem<T>(local, id)) return local
  const cache = runtime()
  if (!cache) return null
  try {
    const stored = await cache.get(key)
    if (!isItem<T>(stored, id)) return null
    rememberMemory(key, stored)
    return stored
  } catch {
    return null
  }
}

function isItem<T extends { id: string }>(value: unknown, id: string): value is T {
  return Boolean(value && typeof value === 'object' && (value as { id?: string }).id === id)
}
