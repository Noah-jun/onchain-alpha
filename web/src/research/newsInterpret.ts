import { createHash } from 'crypto'
import { getCache } from '@vercel/functions'
import { articleText } from '@/domain/newsText'
import { envSet, secretValue } from '@/research/env'
import { fetchJson } from '@/research/http'
import { getNewsById } from '@/research/service'

export interface NewsInterpretation {
  configured: boolean
  summary: string
  points: string[]
  assets: string[]
  impact: string
  caveats: string[]
  error: string | null
}

const EMPTY: NewsInterpretation = {
  configured: false,
  summary: '',
  points: [],
  assets: [],
  impact: '',
  caveats: [],
  error: null,
}

export async function interpretNews(id: string, fallbackText: string | null): Promise<{ status: number; body: NewsInterpretation }> {
  if (!envSet('AI_API_KEY')) return { status: 200, body: EMPTY }
  const article = await getNewsById(id)
  const text = article ? articleText(article.title, article.summary, article.body) : (fallbackText || '').trim()
  if (!text) return { status: 404, body: { ...EMPTY, configured: true, error: '未找到该新闻' } }
  const key = `news-ai:${id}:${createHash('sha256').update(text).digest('hex').slice(0, 16)}`
  const cached = await readCache(key)
  if (cached) return { status: 200, body: cached }
  try {
    const result = await ask(text)
    await writeCache(key, result)
    return { status: 200, body: result }
  } catch (error) {
    return { status: 200, body: { ...EMPTY, configured: true, error: aiError(error) } }
  }
}

async function ask(text: string): Promise<NewsInterpretation> {
  const base = (secretValue('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '')
  const body = await fetchJson<{ choices?: { message?: { content?: string } }[] }>(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secretValue('AI_API_KEY')}`,
    },
    body: JSON.stringify({
      model: secretValue('AI_MODEL') || 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: '只根据用户给出的新闻正文，用简体中文返回 JSON。不要编造正文里没有的数字、名称或事件。不确定就写待确认。日报里每个子故事对应关键要点的一条。impact 必须是「偏多」「偏空」「中性」或「待确认」之一，并带原因。只返回 {"summary":"","points":[],"assets":[],"impact":"","caveats":[]}',
        },
        { role: 'user', content: text.slice(0, 12000) },
      ],
    }),
  }, 25000)
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('空响应')
  const parsed = JSON.parse(extractJson(content)) as Partial<NewsInterpretation>
  const summary = keepLine(parsed.summary, text) || '待确认'
  const points = keepLines(parsed.points, text)
  const assets = keepLines(parsed.assets, text)
  const impact = keepLine(parsed.impact, text) || '待确认'
  const caveats = keepLines(parsed.caveats, text)
  return {
    configured: true,
    summary,
    points: points.length ? points : ['待确认'],
    assets: assets.length ? assets : ['待确认'],
    impact,
    caveats: caveats.length ? caveats : ['待确认'],
    error: null,
  }
}

function keepLines(value: unknown, corpus: string): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && numbersStay(item, corpus)).map((item) => item.trim()).slice(0, 8)
}

function keepLine(value: unknown, corpus: string): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  return numbersStay(value, corpus) ? value.trim() : '待确认'
}

function numbersStay(line: string, corpus: string): boolean {
  const numbers = line.match(/\d+(?:\.\d+)?/g) ?? []
  return numbers.every((item) => corpus.includes(item))
}

function aiError(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : ''
  const blob = `${name} ${message}`
  if (/HTTP 401|HTTP 403/.test(blob)) return 'AI 401/403 key 无效'
  if (/HTTP 429/.test(blob)) return 'AI 429 限流'
  if (/timeout|aborted|TimeoutError/i.test(blob)) return 'AI 超时'
  if (/JSON|Unexpected token|空响应|数量/.test(blob)) return 'AI 返回无法解析'
  return `AI 解读失败：${message.replace(/\s+/g, ' ').trim().slice(0, 120) || '未知错误'}`
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1] : content
}

async function readCache(key: string): Promise<NewsInterpretation | null> {
  try {
    const stored = await getCache({ namespace: 'research-news' }).get(key)
    if (stored && typeof stored === 'object' && (stored as NewsInterpretation).configured === true && !(stored as NewsInterpretation).error) {
      return stored as NewsInterpretation
    }
  } catch {
    return null
  }
  return null
}

async function writeCache(key: string, value: NewsInterpretation) {
  try {
    await getCache({ namespace: 'research-news' }).set(key, value, { ttl: 6 * 60 * 60, tags: ['research-news'], name: key.slice(0, 80) })
  } catch {
    // Runtime Cache is unavailable outside Vercel.
  }
}
