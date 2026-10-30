'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { needsTranslation } from '@/domain/translate'
import { researchHeaders } from '@/components/terminal/settings'

const STORAGE_KEY = 'onchain-alpha.research.translate.v1'
const CACHE_KEY = 'onchain-alpha.research.translate.cache.v1'
export const UNCONFIGURED_TRANSLATION = '未配置翻译，请在设置页填写 AI 或翻译 key'

interface Hit {
  text: string
  translated: string | null
  provider: 'ai' | 'deepl' | 'newsliquid' | null
  status: 'translated' | 'original' | 'unconfigured' | 'error'
  message: string | null
}

interface TranslatePrefs {
  preferZh: boolean
  setPreferZh: (on: boolean) => void
  notice: string
}

const Prefs = createContext<TranslatePrefs>({ preferZh: false, setPreferZh: () => undefined, notice: '' })

export function TranslateProvider({ children }: { children: React.ReactNode }) {
  const [preferZh, setPrefer] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => setPrefer(window.localStorage.getItem(STORAGE_KEY) === 'zh'), [])

  function setPreferZh(on: boolean) {
    setPrefer(on)
    window.localStorage.setItem(STORAGE_KEY, on ? 'zh' : 'original')
    if (!on) setNotice('')
    else void probe().then((message) => setNotice(message))
  }

  return <Prefs.Provider value={{ preferZh, setPreferZh, notice }}>{children}</Prefs.Provider>
}

export function TranslateAllToggle() {
  const { preferZh, setPreferZh, notice } = useContext(Prefs)
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={preferZh}
        onClick={() => setPreferZh(!preferZh)}
        className={`rounded-full px-3 py-1 text-xs ${preferZh ? 'bg-neutral-950 text-white' : 'bg-[#f3f3f1] text-neutral-800'}`}
      >
        全部翻译为中文
      </button>
      {notice ? <p className="text-xs text-red-700">{notice}</p> : null}
    </div>
  )
}

export interface CopyPart {
  text: string
  zh?: string | null
}

export function useTranslatedCopy(parts: CopyPart[]) {
  const { preferZh } = useContext(Prefs)
  const [override, setOverride] = useState<boolean | null>(null)
  const [hits, setHits] = useState<Record<string, Hit>>({})
  const showing = override ?? preferZh
  const key = parts.map((part) => `${part.text}\n${part.zh || ''}`).join('\u0001')
  const stableParts = useMemo(() => parts, [key])
  const needs = stableParts.some((part) => needsTranslation(part.text))

  useEffect(() => setOverride(null), [preferZh])

  useEffect(() => {
    if (!showing) return
    const jobs = stableParts.filter((part) => needsTranslation(part.text))
    if (!jobs.length) return
    let cancelled = false
    const local: Record<string, Hit> = {}
    for (const job of jobs) {
      if (job.zh && !needsTranslation(job.zh)) {
        local[job.text] = { text: job.text, translated: job.zh, provider: 'newsliquid', status: 'translated', message: null }
      }
    }
    const missing = jobs.filter((job) => !local[job.text]).map((job) => job.text)
    if (!missing.length) {
      setHits(local)
      return
    }
    void translateClient(missing).then((result) => {
      if (cancelled) return
      const next = { ...local }
      for (const hit of result) next[hit.text] = hit
      setHits(next)
    })
    return () => { cancelled = true }
  }, [showing, stableParts])

  const anyTranslated = Object.values(hits).some((hit) => hit.status === 'translated')
  const own = override === true
  const inlineMessage = own
    ? Object.values(hits).find((hit) => hit.status === 'unconfigured' || hit.status === 'error')?.message || ''
    : ''

  return {
    needs,
    showing: showing && needs,
    anyTranslated,
    inlineMessage,
    toggle: () => setOverride(!(override ?? preferZh)),
    view: (text: string) => {
      if (!showing || !needsTranslation(text)) return text
      return hits[text]?.translated || text
    },
  }
}

export function CopySwitch({ copy }: { copy: ReturnType<typeof useTranslatedCopy> }) {
  if (!copy.needs) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" className="rounded-full bg-[#f3f3f1] px-3 py-1 text-xs text-neutral-800" onClick={copy.toggle}>
        {copy.showing ? '显示原文' : '翻译'}
      </button>
      {copy.showing && copy.anyTranslated ? <span className="text-[11px] text-neutral-500">机器翻译</span> : null}
      {copy.inlineMessage ? <span className="text-xs text-red-700">{copy.inlineMessage}</span> : null}
    </div>
  )
}

const memory = new Map<string, Hit>()
const waiters: { text: string; resolve: (hit: Hit) => void }[] = []
let scheduled = false

function translateClient(texts: string[]): Promise<Hit[]> {
  return Promise.all(texts.map((text) => one(text)))
}

function one(text: string): Promise<Hit> {
  const cached = memory.get(text) || readSession(text)
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve) => {
    waiters.push({ text, resolve })
    if (!scheduled) {
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        void flush()
      })
    }
  })
}

async function flush() {
  const batch = waiters.splice(0, 40)
  if (!batch.length) return
  const unique = [...new Set(batch.map((job) => job.text))]
  let byText = new Map<string, Hit>()
  try {
    const response = await fetch('/api/research/translate', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...researchHeaders() },
      body: JSON.stringify({ texts: unique }),
    })
    const json = await response.json() as { items?: Hit[] }
    byText = new Map((json.items ?? []).map((item) => [item.text, item]))
  } catch {
    byText = new Map()
  }
  for (const job of batch) {
    const hit = byText.get(job.text) ?? { text: job.text, translated: null, provider: null, status: 'error' as const, message: '翻译失败，原文仍保留。' }
    if (hit.status === 'translated' && hit.translated) remember(hit)
    job.resolve(hit)
  }
  if (waiters.length) void flush()
}

async function probe(): Promise<string> {
  try {
    const response = await fetch('/api/research/translate', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...researchHeaders() },
      body: JSON.stringify({ texts: [] }),
    })
    const json = await response.json() as { configured?: boolean }
    return json.configured ? '' : UNCONFIGURED_TRANSLATION
  } catch {
    return '翻译失败，原文仍保留。'
  }
}

function remember(hit: Hit) {
  memory.set(hit.text, hit)
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    const stored = raw ? JSON.parse(raw) as Hit[] : []
    const next = [hit, ...stored.filter((item) => item.text !== hit.text)].slice(0, 100)
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next))
  } catch {
    // Session storage can be full or blocked. Memory cache still works.
  }
}

function readSession(text: string): Hit | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    const stored = raw ? JSON.parse(raw) as Hit[] : []
    const hit = stored.find((item) => item.text === text && item.status === 'translated' && item.translated)
    if (hit) memory.set(text, hit)
    return hit ?? null
  } catch {
    return null
  }
}
