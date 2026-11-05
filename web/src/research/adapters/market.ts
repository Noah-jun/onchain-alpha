import type { Provenance, Quote } from '@/domain/types'
import { DEMO_QUOTES } from '@/research/demo/catalog'
import { demoAllowed, normalizeSymbol } from '@/research/env'
import { demoProvenance } from '@/research/provenance'
import { loadLiveQuotes } from '@/research/publicMarkets'

export async function loadQuotes(symbols: string[]): Promise<{ quotes: Quote[]; provenance: Provenance; error: string | null }> {
  const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))]
  if (demoAllowed()) {
    return {
      quotes: unique.map((symbol) => DEMO_QUOTES.find((quote) => quote.symbol === symbol) ?? blank(symbol)),
      provenance: demoProvenance('演示快照 · 行情', 'RESEARCH_ALLOW_DEMO=1，这是显式打开的演示快照，不是实时行情。'),
      error: null,
    }
  }
  return loadLiveQuotes(unique)
}

function blank(symbol: string): Quote {
  return {
    symbol,
    name: symbol,
    assetClass: symbol.endsWith('USDT') ? 'perp' : 'crypto',
    price: null,
    change24h: null,
    currency: 'USD',
    history: [],
    provenance: { ...demoProvenance('演示行情目录', '演示目录中没有该代码'), freshness: 'missing' },
  }
}
