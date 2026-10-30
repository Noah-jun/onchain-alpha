const KEY = 'onchain-alpha.research.seen.v1'
const MAX = 200

type Kind = 'discussion' | 'news'

interface Entry {
  id: string
  savedAt: number
  item: { id: string }
}

function empty(): Record<Kind, Entry[]> {
  return { discussion: [], news: [] }
}

function readAll(): Record<Kind, Entry[]> {
  if (typeof window === 'undefined') return empty()
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(KEY) || '{}') as Partial<Record<Kind, Entry[]>>
    return {
      discussion: Array.isArray(parsed.discussion) ? parsed.discussion : [],
      news: Array.isArray(parsed.news) ? parsed.news : [],
    }
  } catch {
    return empty()
  }
}

export function rememberSeen(kind: Kind, items: { id: string }[]) {
  if (typeof window === 'undefined' || !items.length) return
  const all = readAll()
  const now = Date.now()
  const map = new Map(all[kind].map((entry) => [entry.id, entry]))
  for (const item of items) {
    if (!item?.id) continue
    map.set(item.id, { id: item.id, savedAt: now, item })
  }
  all[kind] = [...map.values()].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX)
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    all[kind] = all[kind].slice(0, 40)
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(all))
    } catch {
      // The browser refused the write. The server cache is the other copy.
    }
  }
}

export function recallSeen<T extends { id: string }>(kind: Kind, id: string): T | null {
  const entry = readAll()[kind].find((item) => item.id === id)
  const value = entry?.item as T | undefined
  return value && value.id === id ? value : null
}

export function tweetStatusUrl(id: string): string | null {
  const match = /^tw-(\d+)$/.exec(id)
  return match ? `https://x.com/i/web/status/${match[1]}` : null
}
