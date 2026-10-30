import { NextResponse } from 'next/server'
import { getQuote } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: { symbol: string } }) {
  const quote = await getQuote(context.params.symbol)
  if (!quote) return NextResponse.json({ error: '未找到该代码' }, { status: 404 })
  return NextResponse.json(quote)
}
