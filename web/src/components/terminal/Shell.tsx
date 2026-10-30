'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RESEARCH_DISCLAIMER } from '@/domain/format'

const NAV = [
  { href: '/', label: '市场看板' },
  { href: '/news', label: '热点新闻' },
  { href: '/discussions', label: '热门讨论' },
  { href: '/funding', label: '资金费率' },
  { href: '/flows', label: '资金异动' },
  { href: '/volatility', label: '异常波动' },
  { href: '/assistant', label: 'AI 研究助手' },
  { href: '/settings', label: '设置' },
]

function active(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="terminal min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#e7e7e4] bg-[#f6f6f4] px-4 py-5 lg:flex">
        <Link href="/" className="px-2">
          <p className="text-xs tracking-[0.18em] text-neutral-900">ONCHAIN ALPHA</p>
          <h1 className="mt-1 text-lg font-semibold">链上研究终端</h1>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm ${active(pathname, item.href) ? 'bg-[#f3f3f1] text-white' : 'text-neutral-600 hover:bg-[#f3f3f1]'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="px-2 text-[11px] leading-5 text-[#8ea0b5]">{RESEARCH_DISCLAIMER}</p>
        <Link href="/legacy" className="mt-3 px-2 text-[11px] text-[#8ea0b5] underline">
          旧版信号台
        </Link>
      </aside>
      <div className="lg:pl-60">
        <div className="sticky top-0 z-20 border-b border-[#e7e7e4] bg-[#f6f6f4]/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-semibold">链上研究终端</Link>
            <Link href="/settings" className="text-xs text-neutral-900">设置</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${active(pathname, item.href) ? 'bg-neutral-950 text-white' : 'bg-[#f3f3f1] text-neutral-800'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
