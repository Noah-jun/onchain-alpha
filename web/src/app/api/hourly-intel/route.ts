// 小时情报 API
// 每整点聚合全网数据 → AI 生成结构化情报报告

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { internalFetch, isVercel, DATA_DIR } from '@/lib/serverEnv'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const CACHE_DIR = path.join(process.cwd(), 'data', 'hourly-intel')

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
  if (isVercel) return // Vercel 只读，跳过
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(hourCachePath(), JSON.stringify(data, null, 2))
  } catch {}
}

// 实时市场数据获取
async function fetchMarketData() {
  let anomalies: any[] = [], fundingRates: any[] = [], whales: any[] = []
  let trending: any[] = [], liquidations: any[] = []

  const [a, f, w, t, l] = await Promise.all([
    internalFetch('/api/anomalies'),
    internalFetch('/api/funding-rates'),
    internalFetch('/api/whales'),
    internalFetch('/api/trending'),
    internalFetch('/api/liquidations'),
  ])

  if (a?.signals) anomalies = a.signals
  if (f?.signals) fundingRates = f.signals
  if (w?.signals) whales = w.signals
  if (t?.sectors) trending = t.sectors
  if (l?.signals) liquidations = l.signals

  // 新闻
  let odailyHtml = ''
  try {
    odailyHtml = fs.readFileSync(path.join(process.cwd(), 'data', 'odaily-news.html'), 'utf-8')
  } catch {}

  return { anomalies, fundingRates, whales, trending, liquidations, odailyHtml }
}

export async function GET() {
  // 读缓存
  const cached = readCache()
  if (cached) return NextResponse.json(cached)

  try {
    const { anomalies, fundingRates, whales, trending, liquidations, odailyHtml } = await fetchMarketData()

    // 构造 Prompt
    const prompt = `你是一个加密市场情报分析师。请分析以下实时数据，生成结构化的市场情报报告。

【价格异动 TOP5】
${anomalies.slice(0, 5).map((a: any) => `${a.symbol} 24h${a.change24h >= 0 ? '+' : ''}${a.change24h?.toFixed(1)}% (振幅${a.amplitude}%)`).join('\n') || '无显著异动'}

【资金费率异常】
${fundingRates.slice(0, 5).map((f: any) => `${f.symbol}@${f.exchange}: ${f.rate >= 0 ? '+' : ''}${f.rate?.toFixed(4)}%`).join('\n') || '无异常'}

【巨鲸异动】
${whales.slice(0, 3).map((w: any) => `${w.symbol || w.token}: $${(w.value || 0).toLocaleString()} (${w.direction || w.type})`).join('\n') || '无数据'}

【热点赛道】
${trending.slice(0, 5).map((s: any) => `${s.term || s.name} (热度${s.heat})`).join('\n') || '无数据'}

【新闻摘要】
${odailyHtml.slice(0, 4000)}

请输出 JSON 格式（不要任何其他文字），结构如下：
{
  "hour": "当前小时",
  "date": "日期",
  "summary": "一句话概述",
  "anomalies": [{ "symbol": "", "change24h": 数字, "reason": "" }],
  "fundingHighlights": [{ "symbol": "", "rate": 数字, "exchange": "" }],
  "whaleMovements": [{ "description": "" }],
  "trendingSectors": [{"name": "赛道名", "heat": 数字}],
  "keyEvents": [{"title": "事件", "detail": "详情", "source": "来源"}]
}`

    // 调用 DeepSeek
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: '你是一个加密市场情报分析师。基于真实数据输出 JSON。不编造数据。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
    const result = JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}')

    const output = {
      hour: result.hour || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: result.date || new Date().toISOString().slice(0, 10),
      summary: result.summary || '暂无数据',
      anomalies: (result.anomalies || []).slice(0, 5),
      fundingHighlights: (result.fundingHighlights || []).slice(0, 3),
      whaleMovements: (result.whaleMovements || []).slice(0, 3),
      trendingSectors: (result.trendingSectors || []).slice(0, 5),
      keyEvents: (result.keyEvents || []).slice(0, 5),
      generatedAt: Date.now(),
    }

    writeCache(output)
    return NextResponse.json(output, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    })
  } catch (error: any) {
    console.error('[Hourly Intel] Error:', error)
    return NextResponse.json({
      hour: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().slice(0, 10),
      summary: '',
      anomalies: [], fundingHighlights: [], whaleMovements: [],
      trendingSectors: [], keyEvents: [],
      generatedAt: Date.now(),
      error: error.message,
    })
  }
}
