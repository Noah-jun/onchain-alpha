import { createHash } from 'crypto'
import { needsTranslation, protectText, restoreText } from '@/domain/translate'
import { secretValue } from '@/research/env'
import { fetchJson } from '@/research/http'

export const UNCONFIGURED_TRANSLATION = '未配置翻译，请在设置页填写 AI 或翻译 key'

export type TranslateProvider = 'ai' | 'deepl'

export interface TranslationItem {
  hash: string
  text: string
  translated: string | null
  provider: TranslateProvider | null
  status: 'translated' | 'original' | 'unconfigured' | 'error'
  message: string | null
}

export interface TranslationBatch {
  configured: boolean
  provider: TranslateProvider | null
  items: TranslationItem[]
}

const CACHE_TTL = 6 * 60 * 60 * 1000
const cache = new Map<string, { exp: number; item: TranslationItem }>()

export async function translateBatch(texts: string[]): Promise<TranslationBatch> {
  const limited = texts.slice(0, 40).map((text) => text.slice(0, 4000))
  const provider = activeProvider()
  const resolved = new Map<string, TranslationItem>()
  const pending: string[] = []
  for (const text of limited) {
    if (resolved.has(text) || pending.includes(text)) continue
    if (!needsTranslation(text)) {
      resolved.set(text, { hash: hashText(text), text, translated: text, provider: null, status: 'original', message: null })
      continue
    }
    const hit = cache.get(hashText(text))
    if (hit && hit.exp > Date.now()) {
      resolved.set(text, hit.item)
      continue
    }
    pending.push(text)
  }
  if (pending.length) {
    const translated = provider ? await translatePending(pending, provider) : pending.map(unconfiguredItem)
    for (const item of translated) {
      resolved.set(item.text, item)
      if (item.status === 'translated' && item.translated) cache.set(item.hash, { exp: Date.now() + CACHE_TTL, item })
    }
  }
  return {
    configured: Boolean(provider),
    provider,
    items: limited.map((text) => resolved.get(text) ?? unconfiguredItem(text)),
  }
}

function activeProvider(): TranslateProvider | null {
  if (secretValue('AI_API_KEY')) return 'ai'
  if (secretValue('DEEPL_API_KEY')) return 'deepl'
  return null
}

async function translatePending(texts: string[], provider: TranslateProvider): Promise<TranslationItem[]> {
  const unique = [...new Set(texts)]
  const done = new Map<string, TranslationItem>()
  let remaining = unique
  if (provider === 'ai') {
    const ai = await runAi(remaining)
    remaining = []
    for (const text of unique) {
      const value = ai.get(text)
      if (value) done.set(text, success(text, value, 'ai'))
      else remaining.push(text)
    }
  }
  if (remaining.length && secretValue('DEEPL_API_KEY')) {
    const deepl = await runDeepl(remaining)
    const still: string[] = []
    for (const text of remaining) {
      const value = deepl.get(text)
      if (value) done.set(text, success(text, value, 'deepl'))
      else still.push(text)
    }
    remaining = still
  }
  for (const text of remaining) {
    done.set(text, {
      hash: hashText(text),
      text,
      translated: null,
      provider: null,
      status: 'error',
      message: '翻译失败，原文仍保留。',
    })
  }
  return texts.map((text) => done.get(text) || unconfiguredItem(text))
}

function success(text: string, translated: string, provider: TranslateProvider): TranslationItem {
  return { hash: hashText(text), text, translated, provider, status: 'translated', message: null }
}

function unconfiguredItem(text: string): TranslationItem {
  return { hash: hashText(text), text, translated: null, provider: null, status: 'unconfigured', message: UNCONFIGURED_TRANSLATION }
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

async function runAi(texts: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (let offset = 0; offset < texts.length; offset += 20) {
    const chunk = texts.slice(offset, offset + 20)
    try {
      const translated = await aiChunk(chunk)
      chunk.forEach((text, index) => {
        const value = translated[index]
        if (value) out.set(text, value)
      })
    } catch {
      // Leave this chunk for DeepL or the error status.
    }
  }
  return out
}

async function aiChunk(texts: string[]): Promise<(string | null)[]> {
  const masked = texts.map((text) => protectText(text))
  const base = (secretValue('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = secretValue('AI_MODEL') || 'gpt-4o-mini'
  const body = await fetchJson<{ choices?: { message?: { content?: string } }[] }>(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secretValue('AI_API_KEY')}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: '把用户给出的 JSON 字符串数组翻译成简体中文。只返回 JSON：{"translations":["..."]}，条数和顺序必须与输入一致。保留 ⟦数字⟧ 占位符和 <x> 标签，不要翻译、改写或删除它们。不要添加解释。',
        },
        { role: 'user', content: JSON.stringify(masked.map((item) => item.masked)) },
      ],
    }),
  }, 20000)
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('空响应')
  const parsed = JSON.parse(extractJson(content)) as { translations?: unknown }
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length) throw new Error('数量不一致')
  return parsed.translations.map((item, index) => {
    if (typeof item !== 'string') return null
    return restoreText(item, masked[index].tokens)
  })
}

async function runDeepl(texts: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const key = secretValue('DEEPL_API_KEY')
  if (!key) return out
  const endpoint = key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'
  for (let offset = 0; offset < texts.length; offset += 20) {
    const chunk = texts.slice(offset, offset + 20)
    const masked = chunk.map((text) => protectText(text))
    try {
      const body = await fetchJson<{ translations?: { text?: string }[] }>(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `DeepL-Auth-Key ${key}`,
        },
        body: JSON.stringify({
          text: masked.map((item) => item.masked),
          target_lang: 'ZH',
          tag_handling: 'xml',
          ignore_tags: ['x'],
        }),
      }, 20000)
      const rows = body.translations ?? []
      chunk.forEach((text, index) => {
        const value = rows[index]?.text
        if (typeof value !== 'string') return
        const restored = restoreText(value, masked[index].tokens)
        if (restored) out.set(text, restored)
      })
    } catch {
      // This chunk stays untranslated.
    }
  }
  return out
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1] : content
}
