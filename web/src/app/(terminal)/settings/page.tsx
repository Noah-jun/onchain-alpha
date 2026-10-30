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
        行情、资金费率和 5 分钟波动默认使用免密钥公开接口。需要密钥的模块没配时会写明要在 Vercel 设置哪个变量，不会显示伪造数据。演示快照只有 RESEARCH_ALLOW_DEMO=1 才会出现。
      </PageIntro>
      <section className="rounded-lg border border-[#e7e7e4] bg-white p-4">
        <h2 className="text-sm font-semibold">看板上的永续代码</h2>
        <p className="mt-2 text-xs leading-5 text-neutral-500">默认 CLUSDT。改成目录里没有的代码时，卡片显示暂无数据，不会编一个价格。</p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); save({ ...settings, perpSymbol: draftPerp(settings.perpSymbol) }) }}>
          <input
            aria-label="永续代码"
            value={settings.perpSymbol}
            onChange={(event) => setSettings({ ...settings, perpSymbol: event.target.value.toUpperCase() })}
            className="rounded border border-[#e7e7e4] bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-neutral-950 text-white px-4 py-2 text-sm text-white">保存永续代码</button>
        </form>
      </section>
      <section className="mt-4 rounded-lg border border-[#e7e7e4] bg-white p-4">
        <h2 className="text-sm font-semibold">自选</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.watchlist.map((symbol) => (
            <button key={symbol} type="button" className="rounded-full bg-[#f3f3f1] px-3 py-1 text-xs" onClick={() => save({ ...settings, watchlist: settings.watchlist.filter((item) => item !== symbol) })}>
              {symbol} · 移除
            </button>
          ))}
        </div>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); addSymbol() }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="添加自选代码" placeholder="例如 SOL" className="rounded border border-[#e7e7e4] bg-white px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-[#f3f3f1] px-4 py-2 text-sm">添加</button>
        </form>
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

function draftPerp(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'CLUSDT'
}
