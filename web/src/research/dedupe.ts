export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/^[\p{L}\p{N} ._-]{2,40}:\s+/u, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function canonicalUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname.replace(/\/+$/, '')
    const status = path.match(/\/status\/(\d+)/)
    if ((host === 'x.com' || host === 'twitter.com') && status) return `x:${status[1]}`
    return `${host}${path}`
  } catch {
    return normalizeText(url)
  }
}

export function contentFingerprint(title: string, body = ''): string {
  return normalizeText(title) || normalizeText(body)
}

export function isLowValuePost(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  const withoutLinks = trimmed.replace(/https?:\/\/\S+/gi, ' ').replace(/\bwww\.\S+/gi, ' ').replace(/t\.co\/\S+/gi, ' ').trim()
  if (!withoutLinks) return true
  const normalized = normalizeText(withoutLinks)
  if (normalized.length < 8) return true
  const words = normalized.split(' ').filter(Boolean)
  if (words.length === 1 && words[0].length < 12) return true
  return false
}

export function dedupeByFingerprint<T>(items: T[], options: {
  fingerprint: (item: T) => string[]
  rank: (item: T) => number
}): T[] {
  const ranked = [...items].sort((a, b) => options.rank(b) - options.rank(a))
  const seen = new Set<string>()
  const kept: T[] = []
  for (const item of ranked) {
    const keys = options.fingerprint(item).map((key) => key.trim()).filter(Boolean)
    if (keys.some((key) => seen.has(key))) continue
    for (const key of keys) seen.add(key)
    kept.push(item)
  }
  return kept
}
