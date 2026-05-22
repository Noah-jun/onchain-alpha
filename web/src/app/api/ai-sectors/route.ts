// AI Sector Analysis API
// 立即返回缓存 → 后台异步刷新（不阻塞用户体验）

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const CACHE_FILE = path.join(process.cwd(), '..', 'data', 'ai-sectors.json')
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

async function callDeepSeek(messages: any[]) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-v4-flash', messages, temperature: 0.2, max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const data = await res.json()
  return JSON.parse(data.choices?.[0]?.message?.content || '{}')
}

// 后台刷新缓存
async function refreshCache() {
  try {
    const [sectorsRes, trendingRes, newsHtml] = await Promise.all([
      fetch('http://localhost:3001/api/sectors', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ sectors: [] })),
      fetch('http://localhost:3001/api/trending', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ topics: [] })),
      (async () => { try { return fs.readFileSync(path.join(process.cwd(), '..', 'data', 'odaily-news.html'), 'utf-8').slice(0, 5000) } catch { return '' } })(),
    ])

    const sectorsSummary = sectorsRes.sectors?.slice(0, 10).map((s: any) =>
      `${s.term}(热度${s.heat},24h${s.change24h ?? 'N/A'}%,来源${s.sources?.join(',')})`
    ).join('; ') || ''

    const trendingSummary = trendingRes.topics?.slice(0, 10).map((t: any) =>
      `${t.name}(排名${t.rank},评分${t.web3Score})`
    ).join('; ') || ''

    const prompt = `你是一个专业的加密赛道分析师。请基于以下数据，分析当前（2026年5月）加密市场最热门的赛道。

【实时赛道数据】
${sectorsSummary}

【热门话题趋势】
${trendingSummary}

【最新新闻摘要（含关键词）】
${newsHtml.slice(0, 3000)}

请输出 JSON 格式（不要任何其他文字）：
{
  "sectors": [
    { "rank": 1, "name": "赛道名", "heat": "热度分0-100", "reason": "为什么热", "narrative": "核心叙事", "keyProjects": ["项目"], "trend": "up/down/stable" }
  ],
  "analysisTime": "ISO时间戳"
}`

    const result = await callDeepSeek([
      { role: 'system', content: '你是一个加密市场分析师。输出纯 JSON，不允许编造数据。' },
      { role: 'user', content: prompt },
    ])

    const output = {
      sectors: (result.sectors || []).slice(0, 12),
      generatedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
      source: 'DeepSeek AI analysis based on real market data',
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(output, null, 2))
    console.log('[AI Sectors] Cache refreshed')
  } catch (e: any) {
    console.error('[AI Sectors] Background refresh error:', e.message)
  }
}

export async function GET() {
  // 1. 检查缓存
  let cache: any = null
  try {
    if (fs.existsSync(CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
    }
  } catch {}

  // 2. 有缓存 → 立即返回（即使过期），后台异步刷新
  if (cache?.sectors?.length > 0) {
    const age = Date.now() - (cache.timestamp || cache.generatedAt || 0)
    if (age >= CACHE_TTL) {
      // 过期 → 先返回旧数据，后台刷新
      refreshCache().catch(() => {})
      return NextResponse.json({ ...cache, note: '后台刷新中，下次访问自动更新' })
    }
    return NextResponse.json(cache) // 新鲜 → 直接返回
  }

  // 3. 没有缓存 → 首次生成（需等待）
  await refreshCache()
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return NextResponse.json(JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')))
    }
  } catch {}
  return NextResponse.json({ sectors: [] })
}
