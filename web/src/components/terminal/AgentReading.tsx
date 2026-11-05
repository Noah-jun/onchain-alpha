'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AGENT_DISCLAIMER, DEFAULT_AGENT_PROMPT, agentCacheMaterial, type AgentReading } from '@/domain/agentPrompt'
import { readAgents, readKeys, researchHeaders } from '@/components/terminal/settings'

export function AgentReadingPanel({ agent, endpoint, scope, id, sample }: { agent: string; endpoint: string; scope: string; id: string; sample: string }) {
  const [reading, setReading] = useState<AgentReading | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const [bypass, setBypass] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [modelLabel, setModelLabel] = useState('')

  useEffect(() => {
    const keys = readKeys()
    const hasKey = Boolean(keys.AI_API_KEY)
    setConfigured(hasKey)
    if (!hasKey) {
      setReading(null)
      setModelLabel('')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const agents = readAgents()
    const draft = scope === 'topic' ? agents.topic : agents.news
    const prompt = draft.prompt.trim() || DEFAULT_AGENT_PROMPT
    const override = draft.model.trim()
    const model = override || keys.AI_MODEL?.trim() || 'gpt-4o-mini'
    setModelLabel(model)
    const payload: Record<string, unknown> = { prompt, model: override, bypass }
    if (scope === 'topic') payload.topicId = id
    if (scope === 'news') payload.text = sample
    void sha256(agentCacheMaterial({ scope, id, sample, prompt, model })).then(async (cacheKey) => {
      if (!bypass) {
        const saved = readSession(cacheKey)
        if (saved) {
          if (!cancelled) {
            setReading(saved)
            setLoading(false)
          }
          return
        }
      }
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'content-type': 'application/json', ...researchHeaders() },
          body: JSON.stringify(payload),
        })
        const json = await response.json() as AgentReading
        if (!response.ok) throw new Error(json.error || '未找到材料')
        if (cancelled) return
        setReading(json)
        if (!json.configured && !json.error) {
          setConfigured(false)
          return
        }
        if (json.configured && !json.error) writeSession(cacheKey, json)
      } catch (caught) {
        if (!cancelled) setReading({ configured: true, agent, model, conclusion: '', summary: '', facts: [], unconfirmed: [], impact: [], opinion: { view: '', reasoning: '', assumptions: [] }, uncertainty: [], signals: [], markdown: null, error: caught instanceof Error ? caught.message : '未知错误' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [agent, bypass, endpoint, id, nonce, sample, scope])

  return (
    <section className="mt-4 border-t border-[#e7e7e4] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">AI 解读</h2>
        {configured && (reading?.model || modelLabel) ? <span className="text-[11px] text-neutral-500">{reading?.agent || agent} · {reading?.model || modelLabel}</span> : null}
      </div>
      {loading ? <p className="mt-3 text-sm text-neutral-500">正在生成 AI 解读…</p> : null}
      {!loading && !configured ? <p className="mt-3 text-sm">未配置 AI Key，请到<Link className="underline" href="/settings">设置页</Link>配置</p> : null}
      {!loading && reading?.error ? (
        <div className="mt-3">
          <p className="text-sm text-red-700">AI 解读失败：{reading.error}</p>
          <button type="button" className="mt-2 rounded-full bg-[#f3f3f1] px-3 py-1 text-xs" onClick={() => { setBypass(true); setNonce((value) => value + 1) }}>重试</button>
        </div>
      ) : null}
      {!loading && reading?.configured && !reading.error ? (
        <div className="mt-3 space-y-3 text-sm leading-6">
          {reading.markdown ? <Markdown text={reading.markdown} /> : (
            <>
              <p><span className="text-neutral-500">一句话结论</span> {reading.conclusion}</p>
              <p><span className="text-neutral-500">事件摘要</span> {reading.summary}</p>
              <div>
                <h3 className="text-xs text-neutral-500">已知事实与尚未确认的信息</h3>
                <ul className="mt-1 space-y-2">
                  {reading.facts.map((fact) => (
                    <li key={`${fact.type}-${fact.text}`}>
                      <span className="mr-2 rounded bg-[#f3f3f1] px-1.5 py-0.5 text-[11px]">{fact.type}</span>
                      {fact.text}
                      {fact.sourceUrl ? <a className="ml-2 text-xs underline" href={fact.sourceUrl} target="_blank" rel="noreferrer">来源</a> : null}
                    </li>
                  ))}
                  {reading.unconfirmed.map((item) => <li key={item}><span className="mr-2 rounded bg-[#f3f3f1] px-1.5 py-0.5 text-[11px]">尚未确认</span>{item}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-xs text-neutral-500">影响分析</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {reading.impact.map((item) => <li key={`${item.aspect}-${item.text}`}><span className="text-neutral-500">{item.aspect}</span> {item.text}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-xs text-neutral-500">我的观点及依据</h3>
                <p>{reading.opinion.view}</p>
                {reading.opinion.reasoning ? <p className="text-neutral-600">{reading.opinion.reasoning}</p> : null}
                {reading.opinion.assumptions.length ? <ul className="list-disc pl-5">{reading.opinion.assumptions.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              </div>
              <Bullet title="主要不确定性或反方观点" items={reading.uncertainty} />
              <Bullet title="后续值得关注的信号" items={reading.signals} />
            </>
          )}
          <p className="text-[11px] leading-5 text-neutral-400">{AGENT_DISCLAIMER}</p>
          <button type="button" className="rounded-full bg-[#f3f3f1] px-3 py-1 text-xs" onClick={() => { setBypass(true); setNonce((value) => value + 1) }}>重新生成</button>
        </div>
      ) : null}
    </section>
  )
}

function Bullet({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="text-xs text-neutral-500">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((block) => {
        const lines = block.split('\n').filter(Boolean)
        if (lines.length && lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
          return <ul key={block} className="list-disc pl-5">{lines.map((line) => <li key={line}>{line.replace(/^[-*]\s+/, '')}</li>)}</ul>
        }
        return <p key={block}>{block}</p>
      })}
    </div>
  )
}

const SESSION_KEY = 'onchain-alpha.research.agent-reading.v1'

function readSession(key: string): AgentReading | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || '{}') as Record<string, AgentReading>
    return parsed[key]?.configured && !parsed[key].error ? parsed[key] : null
  } catch {
    return null
  }
}

function writeSession(key: string, value: AgentReading) {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || '{}') as Record<string, AgentReading>
    parsed[key] = value
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(Object.fromEntries(Object.entries(parsed).slice(-30))))
  } catch {
    // The server cache still applies.
  }
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, '0')).join('')
}
