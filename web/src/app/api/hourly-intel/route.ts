// 小时情报 API
// 每整点聚合全网数据 → AI 生成结构化情报报告

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const CACHE_DIR = path.join(process.cwd(), '..', 'data', 'hourly-intel')

function hourCachePath(): string {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  const now = new Date()
  const hourKey = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}`
  return path.join(CACHE_DIR, `${hourKey}.json`)
}

function readCache(): any {
  try {
    const p = hourCachePath()
    if (!fs.existsSync(p)) return null
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'))
    if (Date.now() - raw.generatedAt < 60 * 60 * 1000) return raw
  } catch {}
  return null
}

function writeCache(data: any) {
  try { fs.writeFileSync(hourCachePath(), JSON.stringify({ ...data, generatedAt: Date.now() })) } catch {}
}

function getAllHourlyCaches(): any[] {
  try {
    if (!fs.existsSync(CACHE_DIR)) return []
    return fs.readdirSync(CACHE_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf-8'))
          const hourKey = f.replace('.json', '')
          return { ...raw, hourKey, hourLabel: hourKey.replace(/(\d{4})(\d{2})(\d{2})-(\d{2})/, '$1-$2-$3 $4:00') }
        } catch { return null }
      })
      .filter(Boolean)
      .sort((a, b) => b.generatedAt - a.generatedAt)
  } catch { return [] }
}

async function callDeepSeek(messages: any[], timeoutMs = 60000): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-v4-flash', messages, temperature: 0.2, max_tokens: 8192, response_format: { type: 'json_object' } }),
    })
    if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || '{}'
  } finally { clearTimeout(timeoutId) }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'latest' // latest | list

  // Mode: list all hourly caches
  if (mode === 'list') {
    const items = getAllHourlyCaches()
    return NextResponse.json({ items: items.slice(0, 24), total: items.length })
  }

  // Mode: latest (generate current hour if needed)
  const cached = readCache()
  if (cached) return NextResponse.json(cached)

  // Collect real-time data
  const now = new Date()
  const hourStr = `${String(now.getHours()).padStart(2, '0')}:00`
  const prevHour = `${String((now.getHours() - 1 + 24) % 24).padStart(2, '0')}:00`
  const dateStr = now.toISOString().split('T')[0]

  // Fetch data in parallel
  let anomalies: any[] = [], fundingRates: any[] = [], whales: any[] = [], trending: any[] = [], news: string[] = [], liquidations: any[] = []

  await Promise.allSettled([
    fetch('http://localhost:3001/api/anomalies', { cache: 'no-store' }).then(r => r.json()).then(d => anomalies = d.signals || []).catch(() => {}),
    fetch('http://localhost:3001/api/funding-rates', { cache: 'no-store' }).then(r => r.json()).then(d => fundingRates = d.signals || []).catch(() => {}),
    fetch('http://localhost:3001/api/whales', { cache: 'no-store' }).then(r => r.json()).then(d => whales = d.signals || []).catch(() => {}),
    fetch('http://localhost:3001/api/trending', { cache: 'no-store' }).then(r => r.json()).then(d => trending = d.topics || []).catch(() => {}),
    fetch('http://localhost:3001/api/liquidations', { cache: 'no-store' }).then(r => r.json()).then(d => liquidations = d.signals || []).catch(() => {}),
    (async () => {
      try {
        const html = fs.readFileSync(path.join(process.cwd(), '..', 'data', 'odaily-news.html'), 'utf-8')
        const items = html.match(/"name":"([^"]+)"/g) || []
        news = items.slice(0, 20).map((x: string) => x.replace(/"name":"|"$/g, ''))
      } catch {}
    })(),
  ])

  // Build data summary for AI
  const topAnomalies = anomalies.slice(0, 5).map((a: any) =>
    `${a.symbol} ${a.change24h >= 0 ? '+' : ''}${a.change24h?.toFixed(1)}% (24h) OI $${((a.volume || 0) / 1e6).toFixed(1)}M`
  ).join('\n')

  const topFundings = fundingRates.filter((f: any) => Math.abs(f.rate) > 0.1).slice(0, 5).map((f: any) =>
    `${f.symbol} ${f.exchange} ${f.rate >= 0 ? '+' : ''}${(f.rate * 100).toFixed(3)}%`
  ).join('\n')

  const topWhales = whales.slice(0, 3).map((w: any) =>
    `${w.symbol} $${(w.amountUsd / 1e6).toFixed(1)}M ${w.direction === 'in' ? '→' : w.direction === 'out' ? '←' : '⇄'} ${w.fromLabel || '?'}→${w.toLabel || '?'}`
  ).join('\n')

  const newsBullets = news.slice(0, 15).map((n: string) => `• ${n}`).join('\n')

  // AI generates the intelligence report
  const prompt = `你是一个加密市场情报分析师。请基于以下实时数据，生成 ${dateStr} ${hourStr}（${prevHour}→${hourStr} SGT）的加密市场小时情报报告。严格按照模板格式输出 JSON。

【价格异动】
${topAnomalies || '暂无异常数据'}

【资金费率异常】
${topFundings || '暂无异常'}

【巨鲸动向】
${topWhales || '暂无'}

【新闻快讯】
${newsBullets || '暂无'}

【清算数据】
${liquidations.length > 0 ? liquidations.slice(0, 5).map((l: any) => `${l.symbol} $${(l.amountUsd / 1e3).toFixed(0)}K ${l.side || 'long'}`).join('\n') : '暂无'}

请输出 JSON（仅 JSON）：
{
  "hour": "${hourStr}",
  "date": "${dateStr}",
  "period": "${prevHour}→${hourStr} SGT",
  "summary": {
    "totalItems": 数字(新增情报数),
    "highPriority": 数字(高优先数),
    "topSymbol": "本小时最受关注代币"
  },
  "priceAnomalies": [
    {"symbol": "代币", "change24h": 数字, "change5m": 数字, "oi": "OI金额", "volumeRatio": "量比", "tags": ["标签"], "direction": "up/down"}
  ],
  "keyInfo": [
    {"rank": 1, "title": "标题", "tags": ["标签"], "sources": [{"name": "来源名", "url": "URL或null"}]}
  ],
  "analysis": [
    {"type": "分析/数据/观点", "content": "内容", "source": {"name": "来源", "url": "URL或null"}}
  ],
  "watchlist": [
    {"title": "事件标题", "tags": ["标签"], "source": {"name": "来源", "url": "URL或null"}}
  ],
  "events": [
    {"title": "事件", "detail": "详情", "source": {"name": "来源", "url": "URL或null"}}
  ],
  "narrativeTemp": [
    {"trend": "升温/降温", "title": "叙事描述", "source": {"name": "来源", "url": "URL或null"}}
  ],
  "macro": [
    {"title": "宏观事件", "detail": "详情", "source": {"name": "来源", "url": "URL或null"}}
  ]
}`

  let report = { hour: hourStr, date: dateStr, period: `${prevHour}→${hourStr} SGT`, summary: { totalItems: 0, highPriority: 0, topSymbol: '' }, priceAnomalies: [], keyInfo: [], analysis: [], watchlist: [], events: [], narrativeTemp: [], macro: [] }

  try {
    const raw = await callDeepSeek([
      { role: 'system', content: '你是加密市场情报分析师。生成结构化 JSON 情报报告，不要编造数据。' },
      { role: 'user', content: prompt },
    ], 60000)
    const ai = JSON.parse(raw)
    if (ai.priceAnomalies || ai.keyInfo) report = ai
  } catch (e: any) {
    console.error('[Hourly Intel] DeepSeek error:', e.message)
  }

  const output = {
    ...report,
    rawCounts: { anomalies: anomalies.length, fundings: fundingRates.length, whales: whales.length, news: news.length, liquidations: liquidations.length },
    sources: ['Cryptocompare', 'Hyperliquid', 'Odaily', 'DeepSeek AI'],
    generatedAt: Date.now(),
  }

  writeCache(output)
  return NextResponse.json(output)
}
