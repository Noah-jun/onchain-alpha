'use client'

import { useEffect, useState } from 'react'
import type { SourceStatus } from '@/domain/types'
import { modeLabel } from '@/domain/format'
import { DEFAULT_AGENT_PROMPT } from '@/domain/agentPrompt'
import { DEFAULT_SETTINGS, KEY_FIELDS, readAgents, readKeys, readSettings, writeAgents, writeKeys, writeSettings, type AgentDraft, type ClientSettings, type KeyName } from '@/components/terminal/settings'
import { DataNotice, ErrorBlock, LoadingBlock, PageIntro, useResearch } from '@/components/terminal/ui'

interface SourceResponse {
  items: SourceStatus[]
  error: string | null
}

export default function SettingsPage() {
  const sourceState = useResearch<SourceResponse>('/api/research/sources')
  const [settings, setSettings] = useState<ClientSettings>(DEFAULT_SETTINGS)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState('')
  useEffect(() => setSettings(readSettings()), [])

  function save(next: ClientSettings) {
    setSettings(next)
    writeSettings(next)
    setSaved('已保存在这台浏览器')
  }

  return (
    <div>
      <PageIntro kicker="设置" title="数据源与自选">
        行情、资金费率和 5 分钟波动默认使用免密钥公开接口。密钥保存在这台浏览器，请求时通过请求头交给服务端，页面和接口响应都不会回显密钥。演示快照只有 RESEARCH_ALLOW_DEMO=1 才会出现。
      </PageIntro>
      <KeyVault onChanged={() => void sourceState.reload()} />
      <AgentPrompts />
      <section className="rounded-lg border border-[#e7e7e4] bg-white p-4">
        <h2 className="text-sm font-semibold">资金异动最低金额</h2>
        <p className="mt-2 text-xs leading-5 text-neutral-500">单笔美元名义价值低于这个数的不显示。没有美元金额的记录也无法确认，同样不显示。默认 500000。</p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); const value = Number(draft || settings.flowMinUsd); save({ ...settings, flowMinUsd: Number.isFinite(value) && value >= 0 ? value : 500000 }); setDraft('') }}>
          <input
            aria-label="资金异动最低美元金额"
            inputMode="numeric"
            value={draft}
            placeholder={String(settings.flowMinUsd)}
            onChange={(event) => setDraft(event.target.value.replace(/[^\d.]/g, ''))}
            className="rounded border border-[#e7e7e4] bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-full bg-neutral-950 px-4 py-2 text-sm text-white">保存阈值</button>
        </form>
      </section>
      <section className="mt-4 rounded-lg border border-[#e7e7e4] bg-white p-4">
        <h2 className="text-sm font-semibold">自选</h2>
        <p className="mt-2 text-xs text-neutral-500">在市场看板上用 + 添加。这里可以移除。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.watchlist.length ? settings.watchlist.map((symbol) => (
            <button key={symbol} type="button" className="rounded-full bg-[#f3f3f1] px-3 py-1 text-xs" onClick={() => save({ ...settings, watchlist: settings.watchlist.filter((item) => item !== symbol) })}>
              {symbol} · 移除
            </button>
          )) : <p className="text-sm text-neutral-500">自选为空</p>}
        </div>
      </section>
      <section className="mt-4 rounded-lg border border-[#e7e7e4] bg-white p-4">
        <h2 className="text-sm font-semibold">刷新间隔</h2>
        <p className="mt-2 text-xs text-neutral-500">这只改变浏览器重新拉取的频率。服务端仍按公开接口的缓存时间返回。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[30, 60, 120, 300].map((seconds) => (
            <button key={seconds} type="button" aria-pressed={settings.refreshSeconds === seconds} className={`rounded-full px-3 py-1 text-xs ${settings.refreshSeconds === seconds ? 'bg-neutral-950 text-white' : 'bg-[#f3f3f1]'}`} onClick={() => save({ ...settings, refreshSeconds: seconds })}>
              {seconds} 秒
            </button>
          ))}
        </div>
        {saved ? <p className="mt-3 text-xs text-emerald-700">{saved}</p> : null}
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">数据源状态</h2>
        {sourceState.loading && !sourceState.data ? <LoadingBlock /> : null}
        {sourceState.error && !sourceState.data ? <ErrorBlock message={sourceState.error} onRetry={sourceState.reload} /> : null}
        {sourceState.data ? (
          <div className="space-y-3">
            <DataNotice provenance={null} error={sourceState.data.error} />
            {sourceState.data.items.map((item) => (
              <article key={item.id} className="rounded-lg border border-[#e7e7e4] bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{item.name}</h3>
                  <span className="text-xs text-neutral-800">{item.liveState === 'configured' ? '实时源已配置' : '未配置'} · 当前展示 {modeLabel(item.displayMode)}</span>
                </div>
                <p className="mt-2 text-neutral-700">适配器：{item.adapter}</p>
                <p className="mt-1 text-xs text-neutral-500">建议刷新：{item.refreshHint}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">{item.note}</p>
                <ul className="mt-3 space-y-1 text-xs">
                  {item.envVars.map((env) => (
                    <li key={env.name} className="num">{env.name} · {env.purpose} · {env.set ? '已设置' : '未设置'}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </section>
      <section className="mt-6 text-sm leading-6 text-neutral-700">
        <h2 className="font-semibold">接入真实 API</h2>
        <p className="mt-2">在 Vercel 或 <span className="num">web/.env</span> 里填写上表里的密钥。没填的模块保持未配置。公开行情失败时留空，不会换回演示价格。</p>
        <p className="mt-2">复制 <span className="num">web/.env.example</span> 即可看到全部变量。旧版信号页仍在 /legacy。</p>
      </section>
    </div>
  )
}

function AgentPrompts() {
  const [topic, setTopic] = useState<AgentDraft>({ prompt: DEFAULT_AGENT_PROMPT, model: '' })
  const [news, setNews] = useState<AgentDraft>({ prompt: DEFAULT_AGENT_PROMPT, model: '' })
  const [note, setNote] = useState('')
  useEffect(() => {
    const stored = readAgents()
    setTopic({ prompt: stored.topic.prompt || DEFAULT_AGENT_PROMPT, model: stored.topic.model })
    setNews({ prompt: stored.news.prompt || DEFAULT_AGENT_PROMPT, model: stored.news.model })
  }, [])
  function persist(nextTopic: AgentDraft, nextNews: AgentDraft, label: string) {
    setTopic(nextTopic)
    setNews(nextNews)
    writeAgents({ topic: nextTopic, news: nextNews })
    setNote(`${label}已保存在这台浏览器`)
  }
  return (
    <section className="mb-6 rounded-lg border border-[#e7e7e4] bg-white p-4">
      <h2 className="text-sm font-semibold">AI 解读 Agent</h2>
      <p className="mt-2 text-xs leading-5 text-neutral-500">系统提示词保存在这台浏览器，随解读请求的 JSON 正文发送，不放进请求头。模型留空则使用上面的 AI Model。</p>
      <AgentEditor name="话题解读 Agent" value={topic} onSave={(next) => persist(next, news, '话题解读 Agent')} />
      <AgentEditor name="新闻解读 Agent" value={news} onSave={(next) => persist(topic, next, '新闻解读 Agent')} />
      {note ? <p className="mt-3 text-xs text-emerald-700">{note}</p> : null}
    </section>
  )
}

function AgentEditor({ name, value, onSave }: { name: string; value: AgentDraft; onSave: (next: AgentDraft) => void }) {
  return (
    <div className="mt-4 border-t border-[#e7e7e4] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{name}</h3>
        <button type="button" className="rounded-full bg-[#f3f3f1] px-3 py-1 text-xs" onClick={() => onSave({ prompt: DEFAULT_AGENT_PROMPT, model: value.model })}>恢复默认</button>
      </div>
      <textarea aria-label={`${name}系统提示词`} value={value.prompt} onChange={(event) => onSave({ ...value, prompt: event.target.value })} className="mt-2 min-h-40 w-full px-3 py-2 text-sm" />
      <label className="mt-2 block text-xs text-neutral-500">
        模型覆盖
        <input aria-label={`${name}模型`} value={value.model} placeholder="留空使用全局 AI Model" onChange={(event) => onSave({ ...value, model: event.target.value })} className="mt-1 w-full px-3 py-2 text-sm" />
      </label>
    </div>
  )
}

function KeyVault({ onChanged }: { onChanged: () => void }) {
  const [saved, setSaved] = useState<Partial<Record<KeyName, boolean>>>({})
  const [drafts, setDrafts] = useState<Partial<Record<KeyName, string>>>({})
  const [note, setNote] = useState('')

  useEffect(() => {
    const keys = readKeys()
    setSaved(Object.fromEntries(KEY_FIELDS.map((field) => [field.name, Boolean(keys[field.name])])))
  }, [])

  function persist(name: KeyName, value: string) {
    const next = { ...readKeys() }
    if (value.trim()) next[name] = value.trim()
    else delete next[name]
    writeKeys(next)
    setDrafts((current) => ({ ...current, [name]: '' }))
    setSaved((current) => ({ ...current, [name]: Boolean(value.trim()) }))
    setNote(value.trim() ? '已保存在这台浏览器。输入框已清空，不会显示密钥原文。' : '已从这台浏览器清除。')
    onChanged()
  }

  return (
    <section className="mb-6 rounded-lg border border-[#e7e7e4] bg-white p-4">
      <h2 className="text-sm font-semibold">本机密钥</h2>
      <p className="mt-2 text-xs leading-6 text-neutral-500">只写入浏览器 localStorage。服务端优先使用请求头里的值，没有再用 Vercel 环境变量。不要把密钥发到聊天或截图里。</p>
      <div className="mt-4 space-y-4">
        {KEY_FIELDS.map((field) => (
          <form key={field.name} className="grid gap-2 border-t border-[#e7e7e4] pt-4 first:border-t-0 first:pt-0" onSubmit={(event) => { event.preventDefault(); persist(field.name, drafts[field.name] || '') }}>
            <div>
              <label htmlFor={`key-${field.name}`} className="text-sm font-medium">{field.label}</label>
              <p className="text-xs leading-5 text-neutral-500">{field.detail}</p>
              <p className="mt-1 font-mono text-[11px] text-neutral-400">{field.name} · {saved[field.name] ? '此浏览器已保存' : '此浏览器未保存'}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={`key-${field.name}`}
                type="password"
                autoComplete="off"
                value={drafts[field.name] || ''}
                placeholder={saved[field.name] ? '已保存，输入新值可替换' : '输入后保存'}
                onChange={(event) => setDrafts((current) => ({ ...current, [field.name]: event.target.value }))}
                className="flex-1 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-full bg-neutral-950 px-4 py-2 text-sm text-white">保存</button>
              <button type="button" className="rounded-full bg-[#f3f3f1] px-4 py-2 text-sm" onClick={() => persist(field.name, '')}>清除</button>
            </div>
          </form>
        ))}
      </div>
      {note ? <p className="mt-3 text-xs text-emerald-700">{note}</p> : null}
    </section>
  )
}

