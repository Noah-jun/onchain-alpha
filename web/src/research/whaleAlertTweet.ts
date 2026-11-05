import type { FlowDirection } from '@/domain/types'

export type WhaleTweetKind = 'transfer' | 'mint' | 'burn' | 'lock' | 'unlock'

export interface ParsedWhaleAlert {
  amount: number
  symbol: string
  amountUsd: number
  from: string | null
  to: string | null
  kind: WhaleTweetKind
  stolen: boolean
  whaleUrl: string | null
  link: string | null
  chain: string | null
  txHash: string | null
}

const EXCHANGES = ['binance', 'coinbase', 'kraken', 'okx', 'okex', 'bitfinex', 'huobi', 'htx', 'gemini', 'bitstamp', 'kucoin', 'bybit', 'gate.io', 'gateio', 'crypto.com', 'bithumb', 'upbit', 'robinhood', 'bitget', 'mexc', 'deribit', 'bitflyer', 'coincheck', 'korbit', 'poloniex', 'paxos', 'bitmex']

const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)`
const HEAD = new RegExp(`${AMOUNT}\\s+([A-Za-z][A-Za-z0-9]{1,15})\\s+\\(${AMOUNT}\\s+USD\\)`, 'i')

export function parseWhaleAlertTweet(text: string): ParsedWhaleAlert | null {
  const { body, whaleUrl, link } = stripTweet(text)
  const head = body.match(HEAD)
  if (!head) return null
  const amount = number(head[1])
  const amountUsd = number(head[3])
  const symbol = head[2].toUpperCase()
  if (amount == null || amountUsd == null || !symbol) return null
  const action = actionOf(body)
  if (!action) return null
  const located = locate(whaleUrl)
  return {
    amount,
    symbol,
    amountUsd,
    from: action.from,
    to: action.to,
    kind: action.kind,
    stolen: /of stolen funds/i.test(body),
    whaleUrl,
    link,
    chain: located.chain,
    txHash: located.txHash,
  }
}

export function flowDirection(kind: WhaleTweetKind, from: string | null, to: string | null): FlowDirection {
  if (kind === 'mint') return 'mint'
  if (kind === 'burn') return 'burn'
  if (kind === 'lock') return 'lock'
  if (kind === 'unlock') return 'unlock'
  const fromExchange = isExchange(from)
  const toExchange = isExchange(to)
  if (toExchange && !fromExchange) return 'deposit'
  if (fromExchange && !toExchange) return 'withdraw'
  if (!from && !to) return 'unknown'
  return 'transfer'
}

function actionOf(body: string): { kind: WhaleTweetKind; from: string | null; to: string | null } | null {
  const minted = body.match(/\bminted at (.+)$/i)
  if (minted) return { kind: 'mint', from: party(minted[1]), to: null }
  const burned = body.match(/\bburned at (.+)$/i)
  if (burned) return { kind: 'burn', from: party(burned[1]), to: null }
  const unlocked = body.match(/\bunlocked from (.+)$/i)
  if (unlocked) return { kind: 'unlock', from: party(unlocked[1]), to: null }
  const locked = body.match(/\blocked (?:at|from|in) (.+)$/i)
  if (locked) return { kind: 'lock', from: party(locked[1]), to: null }
  const moved = body.match(/\btransferred from (.+?) to (.+)$/i)
  if (!moved) return null
  const from = party(moved[1])
  const to = party(moved[2])
  if (!from || !to) return null
  return { kind: 'transfer', from, to }
}

function party(value: string): string | null {
  const clean = value.replace(/[.。]+$/g, '').trim()
  return clean || null
}

function isExchange(partyName: string | null): boolean {
  if (!partyName) return false
  const name = partyName.toLowerCase()
  if (/\bunknown\b|\bwallet\b|\btreasury\b/.test(name)) return false
  return EXCHANGES.some((exchange) => name.includes(exchange))
}

function stripTweet(text: string): { body: string; whaleUrl: string | null; link: string | null } {
  const urls = (text.match(/https?:\/\/\S+/g) ?? []).map((url) => url.replace(/[),.;]+$/g, ''))
  const whaleUrl = urls.find((url) => /whale-alert\.io/i.test(url)) ?? null
  const link = whaleUrl || urls[0] || null
  const body = text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[#$]([A-Za-z][A-Za-z0-9]{1,20})/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return { body, whaleUrl, link }
}

function locate(url: string | null): { chain: string | null; txHash: string | null } {
  const match = url?.match(/whale-alert\.io\/transaction\/([^/?#]+)\/([^/?#]+)/i)
  if (!match) return { chain: null, txHash: null }
  return { chain: decodeURIComponent(match[1]), txHash: decodeURIComponent(match[2]) }
}

function number(value: string): number | null {
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}
