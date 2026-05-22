// AI Research API
// RAG pipeline: 检索知识库 → 构造 Prompt → 调用 DeepSeek → 结构化输出

import { NextResponse } from 'next/server'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''

interface ResearchRequest {
  query: string
  project?: string  // 可选：指定项目名
}

// 调用 DeepSeek
async function callDeepSeek(messages: any[], responseFormat?: any) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// RAG: 从现有 API 获取上下文
async function fetchContext(project: string): Promise<string> {
  const parts: string[] = []

  // 1. 项目详情
  try {
    const detailRes = await fetch(`http://localhost:3001/api/project-detail?symbol=${project}`, { cache: 'no-store' })
    if (detailRes.ok) {
      const detail = await detailRes.json()
      parts.push(`【项目基本信息】
名称: ${detail.name || project}
赛道: ${detail.sector || '未知'}
代币状态: ${detail.tgeStatus || '未知'}
公链: ${detail.chain || '未知'}
价格: $${detail.price || 'N/A'}
24h涨跌: ${detail.change24h ? detail.change24h.toFixed(2) + '%' : 'N/A'}
TVL: ${detail.tvl ? '$' + (detail.tvl / 1e9).toFixed(2) + 'B' : 'N/A'}
24h成交量: ${detail.volume24h ? '$' + (detail.volume24h / 1e6).toFixed(1) + 'M' : 'N/A'}
描述: ${detail.description || ''}
官网: ${detail.website || 'N/A'}
Twitter: ${detail.twitter || 'N/A'}
`)
      if (detail.team?.length > 0) {
        parts.push(`【团队成员】\n${detail.team.map((t: any) => `- ${t.name} (${t.role})`).join('\n')}`)
      }
      if (detail.funding?.length > 0) {
        parts.push(`【融资纪录】\n${detail.funding.map((f: any) => `- ${f.round}: ${f.amount} (${f.date}) 投资方: ${f.investors?.join(', ') || 'N/A'}`).join('\n')}`)
      }
    }
  } catch {}

  // 2. 概念知识库（匹配赛道）
  try {
    const sectorsRes = await fetch(`http://localhost:3001/api/sectors`, { cache: 'no-store' })
    if (sectorsRes.ok) {
      const sectors = await sectorsRes.json()
      const matched = sectors.sectors?.filter((s: any) =>
        project && (s.term?.toLowerCase().includes(project.toLowerCase()) || s.id?.includes(project.toLowerCase()))
      )
      if (matched?.length > 0) {
        const m = matched[0]
        parts.push(`【赛道分析】
赛道: ${m.term}
24h涨跌: ${m.change24h ? m.change24h.toFixed(2) + '%' : 'N/A'}
热度原因: ${m.reason || ''}
${m.trends ? '趋势: ' + m.trends : ''}`)
      }
    }
  } catch {}

  // 3. 最新新闻（从 Odaily 缓存）
  try {
    const fs = await import('fs')
    const path = await import('path')
    const cacheFile = path.join(process.cwd(), '..', 'data', 'odaily-news.html')
    if (fs.existsSync(cacheFile)) {
      const html = fs.readFileSync(cacheFile, 'utf-8')
      const nameRegex = new RegExp(`\\[([^\\]]*${project.toLowerCase()}[^\\]]*)\\]`, 'gi')
      const matches = html.match(nameRegex)
      if (matches) {
        parts.push(`【相关新闻】\n${matches.slice(0, 3).join('\n')}`)
      }
    }
  } catch {}

  // 4. 资金费率（市场情绪）
  try {
    const fundingRes = await fetch(`http://localhost:3001/api/funding-rates`, { cache: 'no-store' })
    if (fundingRes.ok) {
      const funding = await fundingRes.json()
      const matched = funding.signals?.filter((s: any) =>
        s.symbol?.toLowerCase() === project.toLowerCase()
      )
      if (matched?.length > 0) {
        parts.push(`【资金费率（市场情绪）】
${matched.map((s: any) => `- ${s.exchange}: ${s.rate >= 0 ? '+' : ''}${s.rate.toFixed(4)}%`).join('\n')}`)
      }
    }
  } catch {}

  // 5. 异常波动
  try {
    const anomalyRes = await fetch(`http://localhost:3001/api/anomalies`, { cache: 'no-store' })
    if (anomalyRes.ok) {
      const anomalies = await anomalyRes.json()
      const matched = anomalies.signals?.filter((s: any) =>
        s.symbol?.toLowerCase() === project.toLowerCase()
      )
      if (matched?.length > 0) {
        const m = matched[0]
        parts.push(`【异常波动】\n- 1h变化: ${m.change1h ? m.change1h.toFixed(2) + '%' : 'N/A'}\n- 24h变化: ${m.change24h ? m.change24h.toFixed(2) + '%' : 'N/A'}`)
      }
    }
  } catch {}

  return parts.join('\n\n')
}

export async function POST(request: Request) {
  try {
    const { query, project } = await request.json() as ResearchRequest
    if (!query && !project) {
      return NextResponse.json({ error: '需要输入查询内容' }, { status: 400 })
    }

    // 提取项目名
    const targetProject = project || query.replace(/^(分析|研究|查看)\s*/i, '').trim().toUpperCase()

    // RAG: 获取上下文
    const context = await fetchContext(targetProject)

    // 构造 Prompt
    const systemPrompt = `你是一个专业的加密投研分析师。你的任务是基于提供的实时数据，生成结构化的投研报告。

【规则】
1. 只基于提供的上下文数据回答，不要自行编造数据
2. 如果某项数据不可用，标注"暂无数据"
3. 输出必须使用严谨、客观的投研分析语言
4. 数据引用需标注来源`

    const userPrompt = `请对以下项目进行专业投研分析：${targetProject}

【已有数据】
${context || '暂无该项目的详细数据，请基于你的知识进行分析，但需标注哪些是推测信息。'}

请输出以下结构的分析报告（用 Markdown 格式）：
1. **项目概览** — 定位、赛道、核心叙事
2. **市场表现** — 价格走势、成交量、TVL
3. **竞争优势** — 与同类项目的差异化
4. **风险提示** — 资金费率异动、波动风险、新闻情绪
5. **关键结论** — 综合判断和投资建议`

    // 调用 DeepSeek
    const report = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    return NextResponse.json({
      project: targetProject,
      report,
      context,  // 附上检索到的原始数据以供验证
      timestamp: Date.now(),
    })
  } catch (error: any) {
    console.error('[AI Research] Error:', error)
    return NextResponse.json({ error: `分析失败: ${error.message}` }, { status: 500 })
  }
}
