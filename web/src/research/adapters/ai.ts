import type { AiAnswer, Citation, DataMode, Provenance } from '@/domain/types'
import { RESEARCH_DISCLAIMER } from '@/domain/format'
import { demoAllowed, envSet, missingKey } from '@/research/env'
import { fetchJson } from '@/research/http'
import { demoProvenance, liveProvenance, unconfiguredProvenance } from '@/research/provenance'

export interface BundlePoint {
  text: string
  citationIds: string[]
  keywords: string[]
}

export interface GroundingBundle {
  title: string
  facts: BundlePoint[]
  inferences: BundlePoint[]
  unknowns: string[]
  risks: string[]
  citations: Citation[]
  dataMode: DataMode
}

const TRADE_REQUEST = /无风险|稳赚|保证|必涨|一定涨|下单|开多|开空|梭哈|翻倍|帮我买|帮我卖|获利/
const BROAD = /总结|概况|梳理|分析|解读|怎么样|有哪些|列出|概述|帮我看|说明|什么情况|详情|解读一下|看一下/

export async function answerQuestion(message: string, bundle: GroundingBundle): Promise<AiAnswer> {
  if (!envSet('AI_API_KEY') && !demoAllowed()) {
    const reason = missingKey('AI_API_KEY')
    return {
      facts: [],
      inferences: [],
      unknowns: [reason],
      risks: ['没有配置模型时不会生成研判，也不会用演示问答填空。'],
      disclaimer: RESEARCH_DISCLAIMER,
      citations: [],
      provenance: unconfiguredProvenance('外部模型', reason),
    }
  }
  const ruled = ruleAnswer(message, bundle)
  if (!envSet('AI_API_KEY') || TRADE_REQUEST.test(message)) {
    return { ...ruled, provenance: analystProvenance(bundle.dataMode, false) }
  }
  try {
    const polished = await polish(message, bundle, ruled)
    if (!polished || !sameShape(ruled, polished, bundle)) {
      return { ...ruled, provenance: analystProvenance(bundle.dataMode, false) }
    }
    return { ...polished, provenance: analystProvenance(bundle.dataMode, true), disclaimer: RESEARCH_DISCLAIMER }
  } catch {
    return { ...ruled, provenance: analystProvenance(bundle.dataMode, false) }
  }
}

function ruleAnswer(message: string, bundle: GroundingBundle): Omit<AiAnswer, 'provenance'> {
  const text = message.trim()
  const risks = unique([...bundle.risks, '不构成投资建议，也不提供下单或自动交易。'])
  if (!text) {
    return empty(bundle, ['请输入一个基于当前页面数据的问题。'], risks)
  }
  if (TRADE_REQUEST.test(text)) {
    return empty(bundle, ['不能回答收益承诺或下单请求。可以改问已引用数据里的事实、缺失项和不确定的地方。'], risks)
  }
  const broad = BROAD.test(text)
  const facts = (broad ? bundle.facts : bundle.facts.filter((item) => matches(text, item))).slice(0, 8)
  const inferences = (broad ? bundle.inferences : bundle.inferences.filter((item) => matches(text, item))).slice(0, 5)
  if (!facts.length) {
    return empty(bundle, ['当前上下文没有可引用的事实来回答这个问题。不会编造新闻、帖文、地址或价格。'], risks)
  }
  const citationIds = new Set(facts.flatMap((item) => item.citationIds).concat(inferences.flatMap((item) => item.citationIds)))
  return {
    facts: facts.map(strip),
    inferences: inferences.map(strip),
    unknowns: bundle.unknowns.slice(0, 6),
    risks,
    disclaimer: RESEARCH_DISCLAIMER,
    citations: bundle.citations.filter((citation) => citationIds.has(citation.id)),
  }
}

function empty(bundle: GroundingBundle, unknowns: string[], risks: string[]): Omit<AiAnswer, 'provenance'> {
  return {
    facts: [],
    inferences: [],
    unknowns,
    risks,
    disclaimer: RESEARCH_DISCLAIMER,
    citations: bundle.citations.slice(0, 3),
  }
}

function matches(message: string, item: BundlePoint): boolean {
  const haystack = message.toLowerCase()
  return item.keywords.some((keyword) => keyword && haystack.includes(keyword.toLowerCase()))
}

function strip(item: BundlePoint) {
  return { text: item.text, citationIds: item.citationIds }
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function analystProvenance(dataMode: DataMode, external: boolean): Provenance {
  if (external) {
    return liveProvenance('外部模型', new Date().toISOString(), '措辞经过外部模型整理，事实仍限制在应用内引用中。', null, 5 * 60 * 1000)
  }
  if (dataMode === 'unconfigured') {
    return unconfiguredProvenance('应用内规则研判', '上下文数据源未配置，没有可引用的新事实。')
  }
  if (dataMode === 'live') {
    return liveProvenance('应用内规则研判', new Date().toISOString(), '未配置外部模型。只重组已经拉取的数据。', null, 5 * 60 * 1000)
  }
  return demoProvenance('应用内规则研判', '未配置外部模型。回答只引用当前演示上下文。')
}

async function polish(message: string, bundle: GroundingBundle, ruled: Omit<AiAnswer, 'provenance'>): Promise<Omit<AiAnswer, 'provenance'> | null> {
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AI_MODEL || 'gpt-4o-mini'
  const body = await fetchJson<{ choices?: { message?: { content?: string } }[] }>(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.AI_API_KEY!.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            '你是研究助手。只能重写用户给出的 JSON，不能新增事实、数字、地址、新闻或帖文。保持 facts、unknowns、citationIds 的信息量。不确定就留在 unknowns。不要承诺收益，不要给下单指令。只返回 JSON。',
        },
        {
          role: 'user',
          content: JSON.stringify({ question: message, title: bundle.title, answer: ruled }),
        },
      ],
    }),
  })
  const content = body.choices?.[0]?.message?.content
  if (!content) return null
  const parsed = JSON.parse(extractJson(content)) as Omit<AiAnswer, 'provenance'>
  return parsed
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1] : content
}

function sameShape(ruled: Omit<AiAnswer, 'provenance'>, next: Omit<AiAnswer, 'provenance'>, bundle: GroundingBundle): boolean {
  if (!next || !Array.isArray(next.facts) || !Array.isArray(next.unknowns)) return false
  const corpus = JSON.stringify({ ruled, bundle })
  const blob = JSON.stringify(next)
  const numbers = blob.match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.some((value) => !corpus.includes(value))) return false
  const allowed = new Set(bundle.citations.map((citation) => citation.id))
  const cited = [...(next.facts ?? []), ...(next.inferences ?? [])].flatMap((item) => item.citationIds ?? [])
  return cited.every((id) => allowed.has(id))
}
