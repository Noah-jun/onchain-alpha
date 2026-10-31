export type ListingAction = '上新' | '下架' | '未分类'

export const LISTING_EXCHANGE_FALLBACK = ['Binance', 'Coinbase', 'OKX', 'Bybit', 'Upbit', 'Bithumb', 'Robinhood', 'Hyperliquid', 'Aster']

const DELIST = /delist|will delist|removal|下架|终止交易|停止交易|退市|trading halt|suspend(?:ed)? trading/i
const LISTING = /will list|new listing|perpetual launch|\bperps?\b.*\blaunch|上线|上币|\blist(?:s|ed|ing)?\b/i
const DELIST_CODE = /delist|下架|removal|halt|终止|退市/i

export function classifyListing(text: string, newsType = '', delistCodes: string[] = []): ListingAction {
  if (delistCodes.some((code) => code.toLowerCase() === newsType.toLowerCase())) return '下架'
  if (DELIST.test(text)) return '下架'
  if (LISTING.test(text)) return '上新'
  return '未分类'
}

export function parseListingTypes(body: unknown): { exchanges: string[]; delistCodes: string[] } | null {
  const exchanges = new Set<string>()
  const delistCodes = new Set<string>()
  walk(unwrap(body), false, exchanges, delistCodes)
  if (!exchanges.size) return null
  return { exchanges: [...exchanges], delistCodes: [...delistCodes] }
}

function unwrap(body: unknown): unknown {
  const row = record(body)
  if (!row) return body
  if ((row.ok === true || row.success === true || row.code === '0' || row.code === 0) && 'data' in row) return row.data
  return body
}

function walk(value: unknown, inListing: boolean, exchanges: Set<string>, delistCodes: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, inListing, exchanges, delistCodes)
    return
  }
  const row = record(value)
  if (!row) return
  const engine = (text(row.engineType) || text(row.engine) || text(row.key) || '').toLowerCase()
  const here = inListing || engine === 'listing'
  if (here) {
    collect(row.children ?? row.types ?? row.sources ?? row.items ?? row.newsTypes ?? row.list ?? row.subTypes, exchanges, delistCodes)
    const own = text(row.code) || text(row.newsType)
    if (inListing && own) add(own, exchanges, delistCodes)
  }
  for (const [key, child] of Object.entries(row)) {
    if (key.toLowerCase() === 'listing') collect(child, exchanges, delistCodes)
    walk(child, here || key.toLowerCase() === 'listing', exchanges, delistCodes)
  }
}

function collect(value: unknown, exchanges: Set<string>, delistCodes: Set<string>) {
  if (typeof value === 'string') {
    add(value, exchanges, delistCodes)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, exchanges, delistCodes)
    return
  }
  const row = record(value)
  if (!row) return
  const code = text(row.code) || text(row.newsType) || text(row.key)
  if (code) add(code, exchanges, delistCodes)
  collect(row.children ?? row.types ?? row.sources ?? row.items, exchanges, delistCodes)
}

function add(code: string, exchanges: Set<string>, delistCodes: Set<string>) {
  const clean = code.trim()
  if (!clean || clean.toLowerCase() === 'listing') return
  exchanges.add(clean)
  if (DELIST_CODE.test(clean)) delistCodes.add(clean)
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
