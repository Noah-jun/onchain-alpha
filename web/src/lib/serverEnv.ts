// Server environment utilities
// Detects Vercel vs local (Mac Mini behind GFW) and adapts accordingly

import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

// Environment detection
export const isVercel = process.env.VERCEL === '1'

// Data directory — now lives inside web/ so same path works locally and on Vercel
export const DATA_DIR = path.join(process.cwd(), 'data')

// Read a JSON file from the data directory
export function readDataFile(filename: string): any {
  try {
    const p = path.join(DATA_DIR, filename)
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {}
  return null
}

// Read raw file text from data directory
export function readDataText(filename: string): string {
  try {
    const p = path.join(DATA_DIR, filename)
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8')
  } catch {}
  return ''
}

// External API fetch — uses proxy on local, direct on Vercel
export async function externalFetch(url: string): Promise<any> {
  if (isVercel) {
    const res = await fetch(url, { next: { revalidate: 120 } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  // Local: curl through proxy
  const text = execSync(
    `curl -s --max-time 10 --connect-timeout 5 -H "Accept: application/json" --proxy http://127.0.0.1:7897 "${url}"`,
    { timeout: 15000, encoding: 'utf-8' }
  )
  return JSON.parse(text)
}

// Internal API call (localhost:3001) — returns null on Vercel (no local server)
export async function internalFetch(pathname: string): Promise<any> {
  if (isVercel) return null
  try {
    const res = await fetch(`http://localhost:3001${pathname}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

// Read cache file if fresh, with TTL
export function readCache(cachePath: string, ttlMs: number): any {
  try {
    if (!fs.existsSync(cachePath)) return null
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    if (Date.now() - (raw.cachedAt || raw.generatedAt || raw.timestamp || 0) < ttlMs) return raw
  } catch {}
  return null
}

// Write cache file — skip on Vercel (read-only filesystem)
export function writeCache(cachePath: string, data: any) {
  if (isVercel) return // Vercel serverless is read-only
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true })
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2))
  } catch {}
}

// Cryptocompare batch price fetch (used by multiple APIs)
export async function fetchTokenPrices(symbols: string[]): Promise<Map<string, { price: number; change24h: number }>> {
  const result = new Map<string, { price: number; change24h: number }>()
  if (!symbols.length) return result
  try {
    const data = await externalFetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols.join(',')}&tsyms=USD`)
    for (const sym of symbols) {
      const raw = data?.RAW?.[sym]?.USD
      if (raw) result.set(sym, { price: raw.PRICE ?? 0, change24h: raw.CHANGEPCT24HOUR ?? 0 })
    }
  } catch {}
  return result
}
