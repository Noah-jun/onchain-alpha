'use client'

import { useEffect, useState } from 'react'
import type { SourceStatus } from '@/domain/types'
import { modeLabel } from '@/domain/format'
import { DEFAULT_SETTINGS, readSettings, writeSettings, type ClientSettings } from '@/components/terminal/settings'
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

  function addSymbol() {
    const symbol = draft.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    if (!symbol || settings.watchlist.includes(symbol)) return
    save({ ...settings, watchlist: [...settings.watchlist, symbol] })
    setDraft('')
  }

  return (
    <div>
      <PageIntro kicker="设置" title="数据源与自选">
        密钥只放在服务端环境变量里，这个页面不接收密钥。未填写的实时源显示未配置。默认演示快照会一直带上演示标签。
      </PageIntro>
      <section className="rounded-lg border border-[#2a3848] bg-[#141c26] p-4">
        <h2 className="text-sm font-semibold">看板上的永续代码</h2>
        <p className="mt-2 text-xs leading-5 text-[#9aabbd]">默认 CLUSDT。改成目录里没有的代码时，卡片显示暂无数据，不会编一个价格。</p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); save({ ...settings, perpSymbol: draftPerp(settings.perpSymbol) }) }}>
          <input
            aria-label="永续代码"
            value={settings.perpSymbol}
            onChange={(event) => setSettings({ ...settings, perpSymbol: event.target.value.toUpperCase() })}
            className="rounded border border-[#2a3848] bg-[#0e141b] px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-[#d6b27a] px-4 py-2 text-sm text-[#1b1408]">保存永续代码</button>
        </form>
      </section>
      <section className="mt-4 rounded-lg border border-[#2a3848] bg-[#141c26] p-4">
        <h2 className="text-sm font-semibold">自选</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.watchlist.map((symbol) => (
            <button key={symbol} type="button" className="rounded-full bg-[#1c2733] px-3 py-1 text-xs" onClick={() => save({ ...settings, watchlist: settings.watchlist.filter((item) => item !== symbol) })}>
              {symbol} · 移除
            </button>
          ))}
        </div>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); addSymbol() }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="添加自选代码" placeholder="例如 SOL" className="rounded border border-[#2a3848] bg-[#0e141b] px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-[#243140] px-4 py-2 text-sm">添加</button>
        </form>
      </section>
      <section className="mt-4 rounded-lg border border-[#2a3848] bg-[#141c26] p-4">
        <h2 className="text-sm font-semibold">刷新间隔</h2>
        <p className="mt-2 text-xs text-[#9aabbd]">这只改变浏览器重新拉取的频率。演示快照的更新时间不会因此变成现在。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[30, 60, 120, 300].map((seconds) => (
            <button key={seconds} type="button" aria-pressed={settings.refreshSeconds === seconds} className={`rounded-full px-3 py-1 text-xs ${settings.refreshSeconds === seconds ? 'bg-[#d6b27a] text-[#1b1408]' : 'bg-[#1c2733]'}`} onClick={() => save({ ...settings, refreshSeconds: seconds })}>
              {seconds} 秒
            </button>
          ))}
        </div>
        {saved ? <p className="mt-3 text-xs text-[#b7e0c8]">{saved}</p> : null}
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">数据源状态</h2>
        {sourceState.loading && !sourceState.data ? <LoadingBlock /> : null}
        {sourceState.error && !sourceState.data ? <ErrorBlock message={sourceState.error} onRetry={sourceState.reload} /> : null}
        {sourceState.data ? (
          <div className="space-y-3">
            <DataNotice provenance={null} error={sourceState.data.error} />
            {sourceState.data.items.map((item) => (
              <article key={item.id} className="rounded-lg border border-[#2a3848] bg-[#141c26] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{item.name}</h3>
                  <span className="text-xs text-[#f0d7a2]">{item.liveState === 'configured' ? '实时源已配置' : '未配置'} · 当前展示 {modeLabel(item.displayMode)}</span>
                </div>
                <p className="mt-2 text-[#c5d0dc]">适配器：{item.adapter}</p>
                <p className="mt-1 text-xs text-[#9aabbd]">建议刷新：{item.refreshHint}</p>
                <p className="mt-2 text-xs leading-5 text-[#9aabbd]">{item.note}</p>
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
      <section className="mt-6 text-sm leading-6 text-[#c5d0dc]">
        <h2 className="font-semibold">接入真实 API</h2>
        <p className="mt-2">在 <span className="num">web/.env</span> 里把对应的 <span className="num">*_PROVIDER</span> 从 demo 改成文档中的实时值，并只在服务端填写密钥。实时请求失败时该条保持暂无数据，不会偷偷换回演示价格。</p>
        <p className="mt-2">复制 <span className="num">web/.env.example</span> 即可看到全部变量。旧版信号页仍在 /legacy。</p>
      </section>
    </div>
  )
}

function draftPerp(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'CLUSDT'
}
