'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { MarketBoard, Quote } from '@/domain/types'
import { formatShanghai, formatUsd } from '@/domain/format'
import { readSettings, researchHeaders, writeSettings, type ClientSettings } from '@/components/terminal/settings'
import { Assets, ChangeText, DataNotice, EmptyBlock, ErrorBlock, FundingText, HeatTags, LoadingBlock, PageIntro, Panel, Pills, useResearch } from '@/components/terminal/ui'

const SUGGESTIONS = ['BTC', 'ETH', 'SOL', 'SOLUSDT', 'QQQ', 'SPX', 'CL']

export default function MarketPage() {
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  useEffect(() => setSettings(readSettings()), [])
  const url = settings
    ? `/api/research/market?watch=${encodeURIComponent(settings.watchlist.join(','))}`
    : null
  const { data, loading, error, reload } = useResearch<MarketBoard>(url, settings?.refreshSeconds || 0)

  function update(next: ClientSettings) {
    setSettings(next)
    writeSettings(next)
  }

  return (
    <div>
      <PageIntro kicker="首页" title="市场看板">
        只显示你添加的自选。可以是加密现货、永续合约或美股/指数。没有公开报价的代码不会加入。
      </PageIntro>
      {settings ? <WatchlistBar settings={settings} onChange={update} /> : null}
      {!settings || (settings.watchlist.length > 0 && loading && !data) ? <LoadingBlock /> : null}
      {error && !data && settings?.watchlist.length ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data && settings ? <Board data={data} settings={settings} error={error} onChange={update} /> : null}
    </div>
  )
}

function WatchlistBar({ settings, onChange }: { settings: ClientSettings; onChange: (next: ClientSettings) => void }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [checking, setChecking] = useState(false)

  async function addSymbol(raw: string) {
    const symbol = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    if (!symbol) {
      setMessage('请输入代码')
      return
    }
    if (settings.watchlist.includes(symbol)) {
      setMessage(`${symbol} 已在自选中`)
      return
    }
    setChecking(true)
    setMessage('')
    try {
      const response = await fetch(`/api/research/market/${symbol}`, { cache: 'no-store', headers: researchHeaders() })
      const quote = await response.json()
      if (!response.ok || quote.price == null) {
        setMessage(quote.provenance?.note || quote.error || `${symbol} 没有公开报价，未加入自选`)
        return
      }
      onChange({ ...settings, watchlist: [...settings.watchlist, symbol] })
      setInput('')
      setOpen(false)
    } catch {
      setMessage('校验报价失败，未加入自选')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="mb-6">
      <button type="button" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setOpen(true); setMessage('') }}>
        + 添加自选
      </button>
      {open ? (
        <form className="mt-3 rounded-lg border border-[#e7e7e4] bg-white p-4" onSubmit={(event) => { event.preventDefault(); void addSymbol(input) }}>
          <label className="text-sm font-medium" htmlFor="watch-symbol">搜索或输入代码</label>
          <p className="mt-1 text-xs text-neutral-500">例如 BTC、SOLUSDT、QQQ。会先向公开行情确认有价格，再加入。</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input id="watch-symbol" value={input} onChange={(event) => setInput(event.target.value)} className="flex-1 px-3 py-2 text-sm" placeholder="输入代码" />
            <button type="submit" disabled={checking} className="rounded-full bg-neutral-950 px-4 py-2 text-sm text-white disabled:opacity-50">{checking ? '校验中' : '添加'}</button>
            <button type="button" className="rounded-full bg-[#f3f3f1] px-4 py-2 text-sm" onClick={() => setOpen(false)}>取消</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((symbol) => (
              <button key={symbol} type="button" className="rounded-full border border-[#e7e7e4] px-3 py-1 text-xs" onClick={() => void addSymbol(symbol)}>{symbol}</button>
            ))}
          </div>
          {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
        </form>
      ) : null}
    </div>
  )
}

function Board({ data, settings, error, onChange }: { data: MarketBoard; settings: ClientSettings; error: string; onChange: (next: ClientSettings) => void }) {
  function move(index: number, direction: -1 | 1) {
    const next = [...settings.watchlist]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange({ ...settings, watchlist: next })
  }
  function remove(symbol: string) {
    onChange({ ...settings, watchlist: settings.watchlist.filter((item) => item !== symbol) })
  }
  return (
    <div className="space-y-6">
      {settings.watchlist.length ? <DataNotice provenance={data.provenance} error={error || data.error} /> : null}
      {settings.watchlist.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {settings.watchlist.map((symbol, index) => {
            const quote = data.quotes.find((item) => item.symbol === symbol)
            return (
              <article key={symbol} className="rounded-lg border border-[#e7e7e4] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/market/${symbol}`}>
                    <p className="text-xs text-neutral-500">{quote ? classLabel(quote.assetClass) : '自选'}</p>
                    <h3 className="mt-1 font-medium">{quote?.name || symbol}</h3>
                  </Link>
                  <div className="flex gap-1">
                    <button type="button" aria-label={`上移 ${symbol}`} className="rounded-full bg-[#f3f3f1] px-2 py-1 text-xs" onClick={() => move(index, -1)}>↑</button>
                    <button type="button" aria-label={`下移 ${symbol}`} className="rounded-full bg-[#f3f3f1] px-2 py-1 text-xs" onClick={() => move(index, 1)}>↓</button>
                    <button type="button" aria-label={`移除 ${symbol}`} className="rounded-full bg-[#f3f3f1] px-2 py-1 text-xs" onClick={() => remove(symbol)}>移除</button>
                  </div>
                </div>
                {quote ? (
                  <>
                    <div className="mt-3"><Pills provenance={quote.provenance} /></div>
                    <p className="num mt-4 text-2xl">{formatUsd(quote.price)}</p>
                    <div className="mt-2"><ChangeText value={quote.change24h} /></div>
                    <p className="mt-3 text-[11px] leading-5 text-neutral-500">{quote.provenance.source} · 更新 {formatShanghai(quote.provenance.updatedAt)}</p>
                  </>
                ) : <p className="mt-4 text-sm text-neutral-500">暂无数据</p>}
              </article>
            )
          })}
        </div>
      ) : <EmptyBlock title="自选为空" detail="点上方的 + 添加标的。未添加时不会展示默认的指数或永续合约。" />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="异常波动" extra={<Link className="text-xs underline" href="/volatility">全部</Link>}>
          {data.anomalies.length ? (
            <ul className="space-y-3 text-sm">
              {data.anomalies.slice(0, 4).map((alert) => (
                <li key={alert.id}>
                  <Link href={`/volatility/${alert.id}`} className="flex items-center justify-between gap-3">
                    <span>{alert.symbol} <ChangeText value={alert.change5m} /></span>
                    <span className="text-xs text-neutral-500">{alert.status === 'verified' ? '三项核对通过' : '待确认异常'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : data.scans.length ? (
            <div>
              <p className="mb-3 text-xs text-neutral-500">已用公开 K 线计算。下面是绝对值最大的 5 分钟变化，都没有超过 10%，所以不是异常警报。</p>
              <ul className="space-y-3 text-sm">
                {data.scans.slice(0, 4).map((scan) => (
                  <li key={scan.symbol} className="flex items-center justify-between gap-3">
                    <span>{scan.symbol} · {scan.exchange}</span>
                    <ChangeText value={scan.change5m} />
                  </li>
                ))}
              </ul>
            </div>
          ) : <EmptyBlock title="暂无 K 线" />}
        </Panel>
        <Panel title="资金费率" extra={<Link className="text-xs underline" href="/funding">全部</Link>}>
          {data.fundingExtremes.length ? (
            <ul className="space-y-3 text-sm">
              {data.fundingExtremes.map((rate) => (
                <li key={rate.id}>
                  <Link href={`/funding/${rate.pair}`} className="flex items-center justify-between gap-3">
                    <span>{rate.exchange} {rate.pair}</span>
                    <FundingText value={rate.ratePct} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyBlock title="暂无资金费率" />}
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="最新新闻" extra={<Link className="text-xs underline" href="/news">全部</Link>}>
          {data.headlines.length ? <ul className="space-y-3 text-sm">
            {data.headlines.map((article) => (
              <li key={article.id}>
                <Link href={`/news/${article.id}`}>
                  <span className="block">{article.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span>{formatShanghai(article.publishedAt)}</span>
                    <Assets assets={article.analysis.relatedAssets} />
                    <HeatTags tags={article.analysis.heatTags} />
                  </span>
                </Link>
              </li>
            ))}
          </ul> : <EmptyBlock title={data.notices.find((item) => item.id === 'news')?.message || '暂无新闻'} />}
        </Panel>
        <Panel title="最新讨论" extra={<Link className="text-xs underline" href="/discussions">全部</Link>}>
          {data.topics.length ? <ul className="space-y-3 text-sm">
            {data.topics.map((topic) => (
              <li key={topic.id}>
                <Link href={`/discussions/${topic.id}`} className="flex items-center justify-between gap-3">
                  <span>{topic.topic}</span>
                  <span className="num text-xs text-neutral-500">热度 {topic.heat}</span>
                </Link>
              </li>
            ))}
          </ul> : <EmptyBlock title={data.notices.find((item) => item.id === 'topics')?.message || '暂无讨论'} />}
        </Panel>
      </div>
    </div>
  )
}

function classLabel(assetClass: Quote['assetClass']) {
  if (assetClass === 'perp') return '永续合约'
  if (assetClass === 'traditional') return '传统市场'
  return '加密现货'
}
