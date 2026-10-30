'use client'

import { useState } from 'react'
import type { AiAnswer } from '@/domain/types'
import { formatShanghai, modeLabel } from '@/domain/format'
import { Meta } from '@/components/terminal/ui'

interface ChatContext {
  type: string
  id?: string
  perp?: string
}

interface Message {
  role: 'user' | 'assistant'
  text?: string
  answer?: AiAnswer
}

export function ChatPanel({ context, prompts }: { context: ChatContext; prompts: string[] }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending) return
    setInput('')
    setError('')
    setPending(true)
    setMessages((current) => [...current, { role: 'user', text: message }])
    try {
      const response = await fetch('/api/research/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, context }),
      })
      const answer = await response.json()
      if (!response.ok) throw new Error(answer.error || '研判失败')
      setMessages((current) => [...current, { role: 'assistant', answer }])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '研判失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-lg border border-[#e7e7e4] bg-white p-4">
      <h2 className="text-sm font-semibold">围绕当前材料提问</h2>
      <p className="mt-2 text-xs leading-5 text-neutral-500">回答只使用本页已经加载的数据。事实、推断和未知会分开。这里不能下单，也不会承诺收益。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" className="rounded-full bg-[#f3f3f1] px-3 py-1 text-left text-xs text-neutral-800" onClick={() => void send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className="rounded bg-[#f7f7f5] p-3 text-sm">
            {message.role === 'user' ? <p>{message.text}</p> : message.answer ? <AnswerView answer={message.answer} /> : null}
          </article>
        ))}
        {pending ? <p className="text-xs text-neutral-500">正在根据当前引用整理…</p> : null}
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void send(input) }}>
        <label className="sr-only" htmlFor={`chat-${context.type}-${context.id || 'root'}`}>问题</label>
        <input
          id={`chat-${context.type}-${context.id || 'root'}`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="问一个当前材料能回答的问题"
          className="flex-1 rounded border border-[#e7e7e4] bg-white px-3 py-2 text-sm outline-none"
        />
        <button type="submit" disabled={pending} className="rounded bg-neutral-950 text-white px-4 py-2 text-sm text-white disabled:opacity-60">发送</button>
      </form>
    </section>
  )
}

function AnswerView({ answer }: { answer: AiAnswer }) {
  return (
    <div className="space-y-3">
      <Section title="事实" items={answer.facts.map((item) => item.text)} empty="没有可引用的事实。" />
      <Section title="推断" items={answer.inferences.map((item) => item.text)} empty="没有单独的推断。" />
      <Section title="未知" items={answer.unknowns} empty="没有额外的未知项。" />
      <Section title="风险" items={answer.risks} />
      <div>
        <h3 className="text-xs text-neutral-500">引用</h3>
        {answer.citations.length ? (
          <ul className="mt-1 space-y-1 text-xs text-neutral-600">
            {answer.citations.map((citation) => (
              <li key={citation.id}>
                {citation.title} · {citation.source} · {modeLabel(citation.mode)} · {formatShanghai(citation.updatedAt)}
                {citation.url ? <a className="ml-2 underline" href={citation.url} target="_blank" rel="noreferrer">链接</a> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-xs text-neutral-500">这条回答没有新的引用。</p>}
      </div>
      <p className="text-xs leading-5 text-neutral-500">{answer.disclaimer}</p>
      <Meta provenance={answer.provenance} />
    </div>
  )
}

function Section({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div>
      <h3 className="text-xs text-neutral-500">{title}</h3>
      {items.length ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 leading-6">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : <p className="mt-1 text-neutral-500">{empty}</p>}
    </div>
  )
}
