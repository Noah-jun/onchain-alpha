// AI Project Detail API v4
// 两层模式：
//   - quick（默认）：6维轻量概览，5-10s
//   - deep：8节机构级报告，15-20s
// 分别缓存

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { internalFetch, isVercel, readDataFile, externalFetch } from '@/lib/serverEnv'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const CACHE_DIR = path.join(process.cwd(), 'data', 'ai-project-cache')

function cachePath(symbol: string, suffix = ''): string {
  if (!isVercel && !fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  return path.join(CACHE_DIR, `${symbol.toLowerCase()}${suffix}.json`)
}

function readCache(path: string, ttlMs: number): any {
  try {
    if (!fs.existsSync(path)) return null
    const raw = JSON.parse(fs.readFileSync(path, 'utf-8'))
    if (Date.now() - raw.cachedAt < ttlMs) return raw
  } catch {}
  return null
}

function writeCache(p: string, data: any) {
  if (isVercel) return // Vercel 只读跳过
  try { fs.writeFileSync(p, JSON.stringify({ ...data, cachedAt: Date.now() })) } catch {}
}

async function getRealtimeData(symbol: string) {
  const r: any = { price: null, change24h: null, volume24h: null, tvl: null, tvlChange7d: null }
  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol}&tsyms=USD`, { signal: AbortSignal.timeout(4000) })
    if (res.ok) { const raw = (await res.json())?.RAW?.[symbol]?.USD; if (raw) { r.price = raw.PRICE ?? null; r.change24h = raw.CHANGEPCT24HOUR ?? null; r.volume24h = raw.VOLUME24HOURTO ?? raw.VOLUME24HOUR ?? null } }
  } catch {}
  try {
    const protocols = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'defillama-protocols.json'), 'utf-8'))
    for (const p of protocols) { if (p.symbol?.toUpperCase() === symbol || p.gecko_id?.toUpperCase() === symbol) { r.tvl = p.tvl || null; r.tvlChange7d = p.change_7d || null; break } }
  } catch {}
  return r
}

function getNews(symbol: string): string[] {
  try {
    const html = fs.readFileSync(path.join(process.cwd(), 'data', 'odaily-news.html'), 'utf-8')
    const regex = new RegExp('\\[([^\\]]*' + symbol.toLowerCase() + '[^\\]]*)\\]', 'gi')
    const m = html.match(regex)
    return m ? m.slice(0, 5).map(x => x.replace(/[[\]]/g, '')) : []
  } catch { return [] }
}

function buildContext(symbol: string, realtime: any, localDetail: any): string {
  const parts = [
    `【实时市场数据】`,
    `价格: ${realtime.price != null ? '$' + realtime.price.toLocaleString() : '暂无'}`,
    `24h涨跌: ${realtime.change24h != null ? realtime.change24h.toFixed(2) + '%' : '暂无'}`,
    `24h成交量: ${realtime.volume24h != null ? '$' + (realtime.volume24h / 1e6).toFixed(0) + 'M' : '暂无'}`,
    `TVL: ${realtime.tvl != null ? '$' + (realtime.tvl / 1e6).toFixed(0) + 'M' : '暂无'}`,
    ``,
  ]
  if (localDetail) {
    parts.push(`【项目基本信息】`, `名称: ${localDetail.name || symbol}`, `赛道: ${localDetail.sector || '未知'}`, `公链: ${localDetail.chain || '未知'}`, `代币状态: ${localDetail.tgeStatus || '未知'}`, `描述: ${localDetail.description || ''}`)
    if (localDetail.website) parts.push(`官网: ${localDetail.website}`)
    if (localDetail.twitter) parts.push(`Twitter: ${localDetail.twitter}`)
    parts.push(``)
    if (localDetail.team?.length) { parts.push(`【团队信息】`); localDetail.team.forEach((t: any) => parts.push(`- ${t.name} (${t.role})`)); parts.push(``) }
    if (localDetail.funding?.length) { parts.push(`【融资纪录】`); localDetail.funding.forEach((f: any) => { parts.push(`- ${f.round}: ${f.amount} (${f.date || ''})`); if (f.investors?.length) parts.push(`  投资方: ${f.investors.join(', ')}`) }); parts.push(``) }
  }
  return parts.join('\n')
}

// 快速概览 prompt（6维，轻量，5-10s）
function buildQuickPrompt(symbol: string, name: string, context: string): string {
  return `你是一名 Web3 投研分析师。请快速分析 ${symbol}（${name}），生成6维概览。

【已有数据】
${context}

基于你的知识，输出以下 JSON。不确定的用 null，不要编造。只需输出 JSON。
{
  "overview": {
    "oneLiner": "一句话定义",
    "sector": "赛道",
    "chain": "公链"
  },
  "problem": {
    "painPoint": "解决什么痛点",
    "advantage": "核心优势"
  },
  "product": {
    "tvl": "TVL或null",
    "volume24h": "24h成交量或null",
    "dailyActiveUsers": "日活或null",
    "description": "产品描述"
  },
  "token": {
    "utility": "Token功能",
    "supply": "供给结构",
    "fdv": "FDV或null",
    "unlockRisk": "解锁风险描述"
  },
  "people": {
    "team": [{"name":"姓名","role":"角色","background":"背景"}],
    "vcs": ["投资机构"]
  },
  "risk": {
    "tech": "技术风险",
    "regulatory": "监管风险",
    "competition": "竞争风险",
    "level": "低/中/高"
  }
}`
}

// 深度报告 prompt（8节，完整，15-20s）
function buildDeepPrompt(symbol: string, name: string, context: string): string {
  return `你是一名顶级的 Web3 一级+二级市场投研分析师。请对 ${symbol}（${name}）进行机构级研究。

目标：帮助投资人快速判断项目是否值得进一步研究或投资。

【已有数据】
${context}

输出 JSON，严格按以下字段（仅 JSON）：
{
  "summary": {
    "overview": { "oneLiner": "一句话定义", "problemSolved": "解决的问题", "coreProducts": ["产品"], "targetUsers": "用户", "sector": "赛道", "chain": "公链" },
    "basicInfo": { "name": "${name}", "symbol": "${symbol}", "price": ${context.match(/价格: \$?([\d.]+)/)?.[1] || 'null'}, "change24h": ${context.match(/24h涨跌: ([\d.-]+)/)?.[1] || 'null'}, "volume24h": ${context.match(/成交量: \$?([\d.]+)/)?.[1] || 'null'}, "tvl": ${context.match(/TVL: \$?([\d.]+)/)?.[1] || 'null'} }
  },
  "narrative": { "analysis": "核心叙事", "marketCycleFit": "市场周期适配", "whyNeeded": "市场需求", "differentiation": "差异化", "score": 7 },
  "product": { "architecture": "技术架构", "performance": "性能", "ux": "用户体验", "moat": "护城河", "pmfScore": 7, "techMoatScore": 6 },
  "tokenomics": { "tokenUtility": "Token功能", "supplyStructure": "供给结构", "unlockPressure": "解锁压力", "feeModel": "Fee模型", "valueCapture": "价值捕获", "score": 7 },
  "onchain": { "tvl": null, "volume24h": null, "dailyActiveUsers": null, "revenue": null, "fee": null, "growthTrend": "增长趋势", "dataAssessment": "数据真实性", "score": 7 },
  "team": { "members": [], "vcs": [], "resources": "资源", "reputation": "信誉", "score": 7 },
  "risk": { "techRisk": "技术风险", "liquidityRisk": "流动性风险", "regulatoryRisk": "监管风险", "unlockRisk": "解锁风险", "narrativeRisk": "叙事失效风险", "level": "中" },
  "conclusion": { "bullCase": "Bull Case", "bearCase": "Bear Case", "stage": "阶段", "strategy": "策略", "rating": "Strong Buy", "finalScore": 75 }
}`
}

// Web 搜索项目信息（团队、融资、新闻等）
// 使用 DuckDuckGo HTML 搜索，无需 API Key
async function webSearchProject(query: string): Promise<string> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    let html: string
    if (isVercel) {
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) return ''
      html = await res.text()
    } else {
      html = execSync(
        `curl -sL --max-time 10 --connect-timeout 5 --proxy http://127.0.0.1:7897 "${searchUrl}"`,
        { timeout: 15000, encoding: 'utf-8' }
      )
    }
    // 提取搜索结果摘要
    const snippets: string[] = []
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = resultRegex.exec(html)) !== null) {
      const title = m[2].replace(/<[^>]+>/g, '').trim()
      const snippet = m[3].replace(/<[^>]+>/g, '').trim()
      if (title && snippet) snippets.push(`${title}: ${snippet.slice(0, 300)}`)
      if (snippets.length >= 5) break
    }
    if (snippets.length === 0) {
      // Fallback: 尝试其他格式
      const results = html.match(/<a[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)
      if (results) {
        for (let r = 0; r < Math.min(results.length, 5); r++) {
          const clean = results[r].replace(/<[^>]+>/g, '').trim()
          if (clean) snippets.push(clean.slice(0, 300))
        }
      }
    }
    return snippets.length ? snippets.join('\n\n') : ''
  } catch (e) {
    console.error('[AI WebSearch] Error:', e)
    return ''
  }
}

async function callDeepSeek(messages: any[], timeoutMs: number): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages,
        temperature: 0.15,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || '{}'
  } finally { clearTimeout(timeoutId) }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') || '').toUpperCase()
  const depth = searchParams.get('depth') || 'quick' // 'quick' | 'deep'
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

  const suffix = depth === 'deep' ? '_deep' : '_quick'
  const cacheTtl = depth === 'deep' ? 12 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const cp = cachePath(symbol, suffix)
  const cached = readCache(cp, cacheTtl)
  if (cached) return NextResponse.json(cached)

  const [realtime, news, localData] = await Promise.all([
    getRealtimeData(symbol),
    Promise.resolve(getNews(symbol)),
    internalFetch(`/api/project-detail?symbol=${symbol}`),
  ])

  const name = localData?.name || symbol
  let context = buildContext(symbol, realtime, localData)

  // 如果本地数据中缺少团队或融资信息，自动用 Web 搜索补充
  const needTeamInfo = !localData?.team?.length
  const needFundingInfo = !localData?.funding?.length
  if (needTeamInfo || needFundingInfo) {
    const searchQueries: string[] = []
    if (needTeamInfo) searchQueries.push(`${name} ${symbol} team founders background crypto`)
    if (needFundingInfo) searchQueries.push(`${name} ${symbol} funding round investors venture capital`)
    try {
      const searchResults = await Promise.all(searchQueries.map(q => webSearchProject(q)))
      const searchText = searchResults.filter(Boolean).join('\n\n')
      if (searchText) {
        context += `\n\n【Web搜索结果补充】\n${searchText}\n`
      }
    } catch {}
  }

  let result: any = {}
  let ai: any = {}

  try {
    const prompt = depth === 'deep' ? buildDeepPrompt(symbol, name, context) : buildQuickPrompt(symbol, name, context)
    const systemMsg = depth === 'deep'
      ? '你是顶级 Web3 投研分析师。输出纯 JSON，严格按给定格式，不确定用 null，不编造。'
      : '你是 Web3 投研分析师。输出纯 JSON，精准简洁，不确定用 null。'
    const raw = await callDeepSeek([
      { role: 'system', content: systemMsg },
      { role: 'user', content: prompt },
    ], depth === 'deep' ? 60000 : 30000)
    ai = JSON.parse(raw)
  } catch (e: any) {
    console.error(`[AI ${depth}] Error for ${symbol}:`, e.message)
  }

  if (depth === 'quick') {
    const ov = ai.overview || {}
    const pb = ai.problem || {}
    const pd = ai.product || {}
    const tk = ai.token || {}
    const pp = ai.people || {}
    const rk = ai.risk || {}
    result = {
      depth: 'quick',
      symbol,
      realtime: { price: realtime.price, change24h: realtime.change24h, volume24h: realtime.volume24h, tvl: realtime.tvl },
      overview: {
        oneLiner: ov.oneLiner || `${name} 加密项目`,
        sector: ov.sector || localData?.sector || '其他',
        chain: ov.chain || localData?.chain || '—',
      },
      problem: {
        painPoint: pb.painPoint || null,
        advantage: pb.advantage || null,
      },
      product: {
        tvl: pd.tvl ?? realtime.tvl ?? null,
        volume24h: pd.volume24h ?? realtime.volume24h ?? null,
        dailyActiveUsers: pd.dailyActiveUsers ?? null,
        description: pd.description || null,
      },
      token: {
        utility: tk.utility || null,
        supply: tk.supply || null,
        fdv: tk.fdv ?? null,
        unlockRisk: tk.unlockRisk || null,
      },
      people: {
        team: pp.team?.length ? pp.team : (localData?.team || []),
        vcs: pp.vcs?.length ? pp.vcs : (localData?.funding ? [...new Set(localData.funding.flatMap((f: any) => f.investors || []))] : []),
      },
      risk: {
        tech: rk.tech || null,
        regulatory: rk.regulatory || null,
        competition: rk.competition || null,
        level: rk.level || '中',
      },
      sources: ['Cryptocompare', 'DeFiLlama', 'DeepSeek AI'].filter(Boolean),
      generatedAt: Date.now(),
    }
  } else {
    // deep = full report
    if (ai.summary?.overview?.oneLiner) {
      if (localData?.team?.length) ai.team.members = localData.team
      if (localData?.funding?.length) ai.team.vcs = [...new Set<string>(localData.funding.flatMap((f: any) => f.investors || []))]
    } else {
      ai = { summary: { overview: { oneLiner: '', problemSolved: '', coreProducts: [], targetUsers: '', sector: '', chain: '' }, basicInfo: {} }, narrative: { analysis: '', marketCycleFit: '', whyNeeded: '', differentiation: '', score: 5 }, product: { architecture: '', performance: '', ux: '', moat: '', pmfScore: 5, techMoatScore: 5 }, tokenomics: { tokenUtility: '', supplyStructure: '', unlockPressure: '', feeModel: '', valueCapture: '', score: 5 }, onchain: { tvl: realtime.tvl, volume24h: realtime.volume24h, dailyActiveUsers: null, revenue: null, fee: null, growthTrend: '', dataAssessment: '', score: 5 }, team: { members: localData?.team || [], vcs: localData?.funding ? [...new Set(localData.funding.flatMap((f: any) => f.investors || []))] : [], resources: '', reputation: '', score: localData?.team?.length ? 7 : 5 }, risk: { techRisk: '', liquidityRisk: '', regulatoryRisk: '', unlockRisk: '', narrativeRisk: '', level: '中' }, conclusion: { bullCase: '', bearCase: '', stage: '', strategy: '', rating: 'Neutral', finalScore: 50 } }
    }
    result = {
      depth: 'deep',
      symbol,
      report: ai,
      news,
      sources: ['Cryptocompare', 'DeFiLlama', localData?.team?.length ? 'knowledge base' : '', 'DeepSeek AI 投研报告'].filter(Boolean),
      generatedAt: Date.now(),
    }
  }

  writeCache(cp, result)
  return NextResponse.json(result)
}
