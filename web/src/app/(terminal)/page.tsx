'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { MarketBoard, Quote } from '@/domain/types'
import { formatShanghai, formatUsd } from '@/domain/format'
import { readSettings, type ClientSettings } from '@/components/terminal/settings'
import { Assets, ChangeText, DataNotice, EmptyBlock, ErrorBlock, FundingText, HeatTags, LoadingBlock, PageIntro, Panel, Pills, useResearch } from '@/components/terminal/ui'

export default function MarketPage() {
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  useEffect(() => setSettings(readSettings()), [])
  const url = settings
    ? `/api/research/market?perp=${encodeURIComponent(settings.perpSymbol)}&watch=${encodeURIComponent(settings.watchlist.join(','))}`
    : null
  const { data, loading, error, reload } = useResearch<MarketBoard>(url, settings?.refreshSeconds || 0)

  return (
    <div>
      <PageIntro kicker="首页" title="市场看板">
        加密资产、传统市场和可配置永续放在一起看。每条价格都带来源、更新时间和数据模式。点击卡片查看路径和历史点。
      </PageIntro>
      {!settings || (loading && !data) ? <LoadingBlock /> : null}
      {error && !data ? <ErrorBlock message={error} onRetry={reload} /> : null}
      {data && settings ? <Board data={data} settings={settings} error={error} /> : null}
    </div>
  )
}

function Board({ data, settings, error }: { data: MarketBoard; settings: ClientSettings; error: string }) {
  const crypto = data.quotes.filter((quote) => quote.assetClass === 'crypto')
  const traditional = data.quotes.filter((quote) => quote.assetClass === 'traditional')
  const perp = data.quotes.filter((quote) => quote.symbol === settings.perpSymbol)
  const used = new Set([...crypto, ...traditional, ...perp].map((quote) => quote.symbol))
  const extra = data.quotes.filter((quote) => settings.watchlist.includes(quote.symbol) && !used.has(quote.symbol))
  return (
    <div className="space-y-6">
      <DataNotice provenance={data.provenance} error={error || data.error} />
      <QuoteGroup title="加密资产" quotes={crypto} watchlist={settings.watchlist} />
      <QuoteGroup title="传统市场" quotes={traditional} watchlist={settings.watchlist} />
      <QuoteGroup title={`永续合约 · ${settings.perpSymbol}`} quotes={perp} watchlist={settings.watchlist} empty="设置里的永续代码没有返回报价。" />
      {extra.length ? <QuoteGroup title="自选中的其他代码" quotes={extra} watchlist={settings.watchlist} /> : null}
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

function QuoteGroup({ title, quotes, watchlist, empty }: { title: string; quotes: Quote[]; watchlist: string[]; empty?: string }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h2>
      {quotes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quotes.map((quote) => (
            <Link key={`${title}-${quote.symbol}`} href={`/market/${quote.symbol}`} className="rounded-lg border border-[#e7e7e4] bg-white p-4 hover:border-neutral-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-neutral-500">{quote.symbol}{watchlist.includes(quote.symbol) ? ' · 自选' : ''}</p>
                  <h3 className="mt-1 font-medium">{quote.name}</h3>
                </div>
                <Pills provenance={quote.provenance} />
              </div>
              <p className="num mt-4 text-2xl">{formatUsd(quote.price)}</p>
              <div className="mt-2"><ChangeText value={quote.change24h} /></div>
              <p className="mt-3 text-[11px] leading-5 text-neutral-500">
                {quote.provenance.source} · 更新 {formatShanghai(quote.provenance.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      ) : <EmptyBlock title={empty || '暂无数据'} />}
    </section>
  )
}
