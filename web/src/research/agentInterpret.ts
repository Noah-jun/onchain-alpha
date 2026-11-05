import { createHash } from 'crypto'
import { getCache } from '@vercel/functions'
import { AGENT_JSON_SUFFIX, FACT_TYPES, type AgentFact, type AgentReading } from '@/domain/agentPrompt'
import { envSet, secretValue } from '@/research/env'
import { fetchJson } from '@/research/http'

export function emptyReading(agent: string, model: string): AgentReading {
  return {
    configured: false,
    agent,
    model,
    conclusion: '',
    summary: '',
    facts: [],
    unconfirmed: [],
    impact: [],
    opinion: { view: '', reasoning: '', assumptions: [] },
    uncertainty: [],
    signals: [],
    markdown: null,
    error: null,
  }
}

export async function runAgent(options: {
  cacheKey: string
  bypass: boolean
  agent: string
  model: string | null
  prompt: string
  userContent: string
  allowedUrls: string[]
}): Promise<AgentReading> {
  const model = options.model?.trim() || secretValue('AI_MODEL') || 'gpt-4o-mini'
  if (!envSet('AI_API_KEY')) return emptyReading(options.agent, model)
  if (!options.bypass) {
    const cached = await readAgent(options.cacheKey)
    if (cached) return cached
  }
  try {
    const content = await callModel(`${options.prompt.trim()}\n\n${AGENT_JSON_SUFFIX}`, options.userContent, model)
    const reading = guardReading(content, options.userContent, new Set(options.allowedUrls), options.agent, model)
    if (!reading.error) await writeAgent(options.cacheKey, reading)
    return reading
  } catch (error) {
    return { ...emptyReading(options.agent, model), configured: true, error: agentError(error) }
  }
}

export function cacheKeyFor(material: string): string {
  return createHash('sha256').update(material).digest('hex')
}

async function callModel(system: string, user: string, model: string): Promise<string> {
  try {
    return await requestModel(system, user, model, true)
  } catch (error) {
    if (error instanceof Error && /HTTP 400/.test(error.message)) return requestModel(system, user, model, false)
    throw error
  }
}

async function requestModel(system: string, user: string, model: string, jsonMode: boolean): Promise<string> {
  const base = (secretValue('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '')
  const payload: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user.slice(0, 14000) },
    ],
  }
  if (jsonMode) payload.response_format = { type: 'json_object' }
  const body = await fetchJson<{ choices?: { message?: { content?: string } }[] }>(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secretValue('AI_API_KEY')}` },
    body: JSON.stringify(payload),
  }, 60000)
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('空响应')
  return content
}

export function guardReading(content: string, corpus: string, allowedUrls: Set<string>, agent: string, model: string): AgentReading {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(extractJson(content)) as Record<string, unknown>
  } catch {
    return { ...emptyReading(agent, model), configured: true, markdown: content }
  }
  const line = (value: unknown) => (typeof value === 'string' && numbersStay(value, corpus) ? value.trim() : '')
  const lines = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && numbersStay(item, corpus)).map((item) => item.trim()).slice(0, 8) : [])
  const facts = Array.isArray(parsed.facts) ? parsed.facts.flatMap((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : null
    const text = row && typeof row.text === 'string' ? row.text.trim() : ''
    if (!text || !numbersStay(text, corpus)) return []
    const type = factType(row?.type)
    const sourceUrl = typeof row?.sourceUrl === 'string' && linkAllowed(row.sourceUrl, corpus, allowedUrls) ? row.sourceUrl : undefined
    const fact: AgentFact = sourceUrl ? { text, type, sourceUrl } : { text, type }
    return [fact]
  }).slice(0, 8) : []
  const impact = Array.isArray(parsed.impact) ? parsed.impact.flatMap((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : null
    const text = row && typeof row.text === 'string' ? row.text.trim() : ''
    const aspect = row && typeof row.aspect === 'string' ? row.aspect.trim() : ''
    if (!text || !numbersStay(`${aspect} ${text}`, corpus)) return []
    return [{ aspect: aspect || '影响', text }]
  }).slice(0, 6) : []
  const opinionRaw = parsed.opinion && typeof parsed.opinion === 'object' ? parsed.opinion as Record<string, unknown> : {}
  return {
    configured: true,
    agent,
    model,
    conclusion: line(parsed.conclusion) || '无法核实',
    summary: line(parsed.summary) || '无法核实',
    facts,
    unconfirmed: lines(parsed.unconfirmed),
    impact,
    opinion: {
      view: line(opinionRaw.view),
      reasoning: line(opinionRaw.reasoning),
      assumptions: lines(opinionRaw.assumptions),
    },
    uncertainty: lines(parsed.uncertainty),
    signals: lines(parsed.signals),
    markdown: null,
    error: null,
  }
}

function factType(value: unknown): string {
  return typeof value === 'string' && (FACT_TYPES as readonly string[]).includes(value) ? value : '市场传闻'
}

function linkAllowed(url: string, corpus: string, allowedUrls: Set<string>): boolean {
  return allowedUrls.has(url) || corpus.includes(url)
}

function numbersStay(line: string, corpus: string): boolean {
  const numbers = line.match(/\d+(?:\.\d+)?/g) ?? []
  return numbers.every((item) => corpus.includes(item))
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (fenced ? fenced[1] : content).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) return raw.slice(start, end + 1)
  return raw
}

export function agentError(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : ''
  const blob = `${name} ${message}`
  if (/HTTP 401|HTTP 403/.test(blob)) return '401 key 无效'
  if (/HTTP 404/.test(blob)) return '404 模型不存在'
  if (/HTTP 429/.test(blob)) return '429 限流'
  if (/timeout|timed out|aborted|AbortError|TimeoutError/i.test(blob)) return '超时'
  if (/JSON|Unexpected|空响应/.test(blob)) return 'JSON 解析失败'
  const detail = message.replace(/\s+/g, ' ').trim().slice(0, 120)
  return detail || '未知错误'
}

const memory = new Map<string, AgentReading>()

function readable(value: unknown): AgentReading | null {
  if (value && typeof value === 'object' && (value as AgentReading).configured && !(value as AgentReading).error) return value as AgentReading
  return null
}

async function readAgent(key: string): Promise<AgentReading | null> {
  try {
    const stored = readable(await getCache({ namespace: 'research-agents' }).get(key))
    if (stored) {
      memory.set(key, stored)
      return stored
    }
  } catch {
    return memory.get(key) ?? null
  }
  return null
}

async function writeAgent(key: string, value: AgentReading) {
  memory.set(key, value)
  try {
    await getCache({ namespace: 'research-agents' }).set(key, value, { ttl: 6 * 60 * 60, tags: ['research-agents'], name: key.slice(0, 80) })
  } catch {
    // Runtime Cache is unavailable outside Vercel. This process still keeps the memory copy.
  }
}
