export type DataMode = 'live' | 'demo' | 'unconfigured'

export type Freshness = 'fresh' | 'stale' | 'missing'

export interface Provenance {
  source: string
  sourceUrl: string | null
  fetchedAt: string
  updatedAt: string | null
  freshness: Freshness
  mode: DataMode
  note: string
}

export type AssetClass = 'crypto' | 'traditional' | 'perp'

export interface HistoryPoint {
  t: string
  price: number
}

export interface Quote {
  symbol: string
  name: string
  assetClass: AssetClass
  price: number | null
  change24h: number | null
  currency: 'USD'
  provenance: Provenance
  history: HistoryPoint[]
}

export type HeatTag = '社交热度高' | '基本面有支撑'

export interface EvidenceQuote {
  quote: string
  source: string
  url: string | null
}

export interface ResearchNote {
  eventType: string
  relatedAssets: string[]
  sentiment: string
  impact: string
  impactPath: string
  timeHorizon: string
  evidence: EvidenceQuote[]
  risks: string[]
  counterpoints: string[]
  confidence: '低' | '中' | '高'
  confidenceBasis: string
  heatTags: HeatTag[]
  facts: string[]
  inferences: string[]
  unknowns: string[]
}

export interface NewsArticle {
  id: string
  title: string
  summary: string
  body: string
  publishedAt: string
  publisher: string
  url: string | null
  analysis: ResearchNote
  provenance: Provenance
  /** Chinese text already returned by NewsLiquid for the same field. */
  sourceZh?: Partial<Record<'title' | 'summary' | 'body', string>>
  /** Grade and score from 6551 daily-news, present only when that API returned them. */
  daily?: { grade: string | null; score: number | null }
  /** Exchange listing or delisting announcement from the OpenNews listing engine. */
  listing?: { exchange: string; action: '上新' | '下架' | '未分类' }
}

export interface DailySection {
  key: string
  nameZh: string
}

export interface DailyHotTweet {
  id: string
  author: string
  text: string
  url: string | null
}

export interface DiscussionPost {
  id: string
  author: string
  text: string
  postedAt: string
  url: string | null
  note: string
  sourceZh?: string
}

export interface DiscussionTopic {
  id: string
  date: string
  topic: string
  category: string
  postCount: number
  authorCount: number
  heat: number
  sentiment: string
  summary: string
  heatTags: HeatTag[]
  assets: string[]
  posts: DiscussionPost[]
  analysis: ResearchNote
  provenance: Provenance
  sourceZh?: string
}

export interface FundingRate {
  id: string
  pair: string
  base: string
  exchange: string
  ratePct: number
  period: string
  markPrice: number | null
  updatedAt: string
  provenance: Provenance
}

export interface PairCostProfile {
  pair: string
  fee: string | null
  spread: string | null
  margin: string | null
  settlementNote: string | null
  residualRisks: string[] | null
}

export interface FundingOpportunity {
  id: string
  pair: string
  highExchange: string
  lowExchange: string
  highRate: number
  lowRate: number
  spreadPct: number
  periods: string[]
  label: '待验证的费率差' | '费率差观察'
  missing: string[]
  known: { label: string; value: string }[]
  structureNote: string
  risks: string[]
  provenance: Provenance
}

export type FlowObservation = 'onchain_observed' | 'exchange_confirmed' | 'uncertain' | 'exchange_print'

export type FlowDirection = 'deposit' | 'withdraw' | 'transfer' | 'unknown' | 'buy' | 'sell'

export interface WhaleTransfer {
  id: string
  asset: string
  amount: number | null
  amountUsd: number | null
  fromAddress: string | null
  toAddress: string | null
  fromTag: string | null
  toTag: string | null
  chain: string
  timestamp: string
  txHash: string | null
  explorerUrl: string | null
  observation: FlowObservation
  direction: FlowDirection
  attributionNote: string
  analysis: ResearchNote
  provenance: Provenance
}

export interface VolCheck {
  ok: boolean
  detail: string
}

export interface VolatilityAlert {
  id: string
  symbol: string
  name: string
  change5m: number
  price: number | null
  windowStart: string
  windowEnd: string
  checks: {
    multiExchange: VolCheck
    volume: VolCheck
    freshness: VolCheck
  }
  status: 'verified' | 'pending'
  analysis: ResearchNote
  provenance: Provenance
}

export interface Citation {
  id: string
  source: string
  title: string
  url: string | null
  updatedAt: string | null
  mode: DataMode
}

export interface CitedText {
  text: string
  citationIds: string[]
}

export interface AiAnswer {
  facts: CitedText[]
  inferences: CitedText[]
  unknowns: string[]
  risks: string[]
  disclaimer: string
  citations: Citation[]
  provenance: Provenance
}

export interface SourceStatus {
  id: string
  name: string
  liveState: 'unconfigured' | 'configured'
  displayMode: DataMode
  adapter: string
  refreshHint: string
  note: string
  envVars: { name: string; purpose: string; set: boolean }[]
}

export interface ListEnvelope<T> {
  items: T[]
  provenance: Provenance
  error: string | null
}

export interface MoveScan {
  symbol: string
  change5m: number
  price: number | null
  exchange: string
  aboveThreshold: boolean
  windowEnd: string
}

export interface MarketBoard {
  quotes: Quote[]
  anomalies: VolatilityAlert[]
  scans: MoveScan[]
  fundingExtremes: FundingRate[]
  headlines: NewsArticle[]
  topics: DiscussionTopic[]
  notices: { id: string; message: string }[]
  provenance: Provenance
  error: string | null
}
