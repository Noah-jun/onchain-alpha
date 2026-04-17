import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OnChain Alpha - 市场信号聚合平台',
  description: '面向专业交易者的实时市场信号聚合平台',
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
