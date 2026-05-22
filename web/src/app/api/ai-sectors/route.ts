// AI Sector Analysis API
// 每12小时由 cron 触发刷新
// AI 基于实时市场数据 + 新闻分析当前热门赛道
// 结果写入缓存文件，前端读取

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const CACHE_FILE = path.join(process.cwd(), '..', 'data', 'ai-sectors.json')

async function callDeepSeek(messages: any[]) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const data = await res.json()
  return JSON.parse(data.choices?.[0]?.message?.content || '{}')
}

export async function GET() {
  // 读取缓存
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
      const age = Date.now() - (cached.timestamp || 0)
      if (age < 24 * 60 * 60 * 1000 && cached.sectors?.length > 0) {
        return NextResponse.json(cached)
      }
    }
  } catch {}

  // 无缓存或过期 → AI 分析
  try {
    // 获取原始数据
    const [sectorsRes, trendingRes, newsHtml] = await Promise.all([
      fetch('http://localhost:3001/api/sectors', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ sectors: [] })),
      fetch('http://localhost:3001/api/trending', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ topics: [] })),
      (async () => {
        try {
          return fs.readFileSync(path.join(process.cwd(), '..', 'data', 'odaily-news.html'), 'utf-8').slice(0, 5000)
        } catch { return '' }
      })(),
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
    {
      "rank": 1,
      "name": "赛道名",
      "heat": "热度分0-100",
      "reason": "为什么热（引用数据）",
      "narrative": "当前核心叙事（1句话）",
      "keyProjects": ["项目名1","项目名2"],
      "trend": "up/down/stable",
      "dataSources": ["数据来源1"]
    }
  ],
  "analysisTime": "ISO时间戳"
}

必须基于提供的真实数据，只输出 JSON。`

    const result = await callDeepSeek([
      { role: 'system', content: '你是一个加密市场分析师。输出纯 JSON，不允许编造数据。' },
      { role: 'user', content: prompt },
    ])

    const output = {
      sectors: (result.sectors || []).slice(0, 12),
      generatedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      source: 'DeepSeek AI analysis based on real market data',
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(output, null, 2))
    return NextResponse.json(output)
  } catch (error: any) {
    console.error('[AI Sectors] Error:', error)
    return NextResponse.json({ sectors: [], error: String(error) })
  }
}
