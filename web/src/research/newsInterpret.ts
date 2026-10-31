import { DEFAULT_AGENT_PROMPT, agentCacheMaterial } from '@/domain/agentPrompt'
import { articleText, shortTitle } from '@/domain/newsText'
import { cacheKeyFor, emptyReading, runAgent } from '@/research/agentInterpret'
import { secretValue } from '@/research/env'
import { getNewsById } from '@/research/service'
import { asArray, asRecord, newsliquidRequest, newsliquidToken, unwrapData } from '@/research/newsliquid/client'

export async function interpretNews(id: string, input: { text?: string | null; prompt?: string | null; model?: string | null; bypass?: boolean }) {
  const article = await getNewsById(id)
  const text = article ? articleText(article.title, article.summary, article.body) : (input.text || '').trim()
  const title = article ? shortTitle(article.title, article.summary, article.body) : text.slice(0, 80)
  if (!text) return { status: 404, body: { ...emptyReading('新闻解读 Agent', input.model || ''), configured: true, error: '未找到该新闻' } }
  const related = await relatedNews(article?.analysis.relatedAssets?.[0] || title)
  const prompt = input.prompt?.trim() || DEFAULT_AGENT_PROMPT
  const model = input.model?.trim() || secretValue('AI_MODEL') || 'gpt-4o-mini'
  const allowed = unique([article?.url || null, ...related.map((item) => item.link)])
  const reading = await runAgent({
    cacheKey: cacheKeyFor(agentCacheMaterial({ scope: 'news', id, sample: text, prompt, model })),
    bypass: Boolean(input.bypass),
    agent: '新闻解读 Agent',
    model: input.model ?? null,
    prompt,
    userContent: JSON.stringify({
      title,
      body: text,
      source: article?.provenance.source || '',
      publisher: article?.publisher || '',
      time: article?.publishedAt || '',
      url: article?.url || null,
      assets: article?.analysis.relatedAssets || [],
      related,
    }),
    allowedUrls: allowed,
  })
  return { status: 200, body: reading }
}

async function relatedNews(query: string): Promise<Array<{ title: string; time: string; link: string | null }>> {
  if (!newsliquidToken() || !query.trim()) return []
  try {
    const { body } = await newsliquidRequest('/open/news_search', { method: 'POST', body: { q: query.slice(0, 80), limit: 5, page: 1 } })
    return asArray(unwrapData(body)).slice(0, 5).flatMap((item) => {
      const row = asRecord(item)
      const title = stringOf(row?.text) || stringOf(row?.title)
      if (!title) return []
      return [{ title: title.slice(0, 180), time: stringOf(row?.ts) || stringOf(row?.published_at) || '', link: stringOf(row?.link) }]
    })
  } catch {
    return []
  }
}

function unique(urls: Array<string | null>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))]
}

function stringOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
