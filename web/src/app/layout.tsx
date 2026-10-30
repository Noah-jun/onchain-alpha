import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '链上研究终端',
  description: '加密与传统市场研究辅助工具。不提供自动交易，不构成投资建议。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
