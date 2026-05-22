// AI Market Intelligence API
// 模拟「2点情报」风格的市场情报日报
// 每1小时由前端触发更新（或手动刷新）

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const CACHE_FILE = path.join(process.cwd(), '..', 'data', 'ai-intelligence.json')

async function callDeepSeekJSON(messages: any[]) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-v4-flash', messages, temperature: 0.2, max_tokens: 4096, response_format: { type: 'json_object' } }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  return JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}')
}

async function fetchNews(): Promise<string> {
  try {
    return fs.readFileSync(path.join(process.cwd(), '..', 'data', 'odaily-news.html'), 'utf-8').slice(0, 8000)
  } catch { return '' }
}

async function fetchData() {
  const [anomaliesRes, fundingRes, trendingRes] = await Promise.all([
    fetch('http://localhost:3001/api/anomalies').then(r => r.json()).catch(() => ({ signals: [] })),
    fetch('http://localhost:3001/api/funding-rates').then(r => r.json()).catch(() => ({ signals: [] })),
    (async () => {
      try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), '..', 'data', 'coingecko-trending.json'), 'utf-8')) }
      catch { return { coins: [] } }
    })(),
  ])
  return { anomalies: anomaliesRes.signals || [], funding: fundingRes.signals || [], trending: trendingRes }
}

export async function GET() {
  // 检查缓存（1小时内有效）
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
      if (Date.now() - (cached.generatedAt || 0) < 3600000 && cached.sections?.length > 0) {
        return NextResponse.json(cached)
      }
    }
  } catch {}

  try {
    const newsHtml = await fetchNews()
    const { anomalies, funding, trending } = await fetchData()

    // 构建市场摘要
    const anomalySummary = anomalies.slice(0, 5).map((a: any) =>
      `${a.symbol} 24h${a.change24h >= 0 ? '+' : ''}${a.change24h?.toFixed(1)}%`
    ).join(', ') || '无异常'
    const fundingSummary = funding.slice(0, 5).map((f: any) =>
      `${f.symbol}@${f.exchange} ${f.rate >= 0 ? '+' : ''}${f.rate?.toFixed(3)}%`
    ).join(', ') || '无异常'
    const trendingSummary = (trending.coins || []).slice(0, 8).map((c: any) =>
      `${c.item.name}(${c.item.symbol})`
    ).join(', ')

    const prompt = `你是一个专业的加密市场情报分析师。基于以下实时数据，生成一份结构化的市场情报报告。

【价格异动】
${anomalySummary}

【资金费率异常】
${fundingSummary}

【CoinGecko 热门趋势】
${trendingSummary}

【最新新闻（含时间戳）】
${newsHtml}

请输出 JSON 格式（不要任何其他文字），严格按照以下结构：

{
  "reportTime": "HH:mm",
  "date": "YYYY-MM-DD",
  "summary": "一句话市场概要（基于数据）",
  "priceAlerts": [
    { "symbol": "BTC", "change24h": 数字, "change1h": 数字, "reason": "异动原因（引用新闻或数据）" }
  ],
  "keyInfo": [
    { "title": "标题", "tags": ["标签1","标签2"], "source": "数据来源名", "sourceUrl": "", "engagement": "热度指标" }
  ],
  "watchlist": [
    { "title": "事件标题", "tags": ["治理","新增"], "source": "来源", "sourceUrl": "" }
  ],
  "hotSectors": ["热门赛道1","热门赛道2"]
}

要求：
1. 所有信息必须基于提供的真实数据
2. 标签使用中文：分析/事件/资金流/监管/安全/治理/协议/新增/延续
3. 标题简洁有力
4. 价格异动中 change24h 和 change1h 填数字或 null`

    const result = await callDeepSeekJSON([
      { role: 'system', content: '你是加密市场情报分析师。基于真实数据输出 JSON。不编造。' },
      { role: 'user', content: prompt },
    ])

    // 格式化输出
    const output = {
      reportTime: result.reportTime || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: result.date || new Date().toISOString().slice(0, 10),
      summary: result.summary || '暂无数据',
      priceAlerts: (result.priceAlerts || []).slice(0, 3),
      keyInfo: (result.keyInfo || []).slice(0, 5),
      watchlist: (result.watchlist || []).slice(0, 6),
      hotSectors: (result.hotSectors || []).slice(0, 4),
      generatedAt: Date.now(),
      rawNews: [],
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(output, null, 2))
    return NextResponse.json(output)
  } catch (error: any) {
    return NextResponse.json({ error: String(error), generatedAt: Date.now() })
  }
}
