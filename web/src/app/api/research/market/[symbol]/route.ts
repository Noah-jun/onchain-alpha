import { NextResponse } from 'next/server'
import { getQuote } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(_request: Request, context: { params: { symbol: string } }) {
  return withClientKeys(_request, async () => {
      const quote = await getQuote(context.params.symbol)
      if (!quote) return NextResponse.json({ error: '未找到该代码' }, { status: 404 })
      return NextResponse.json(quote)
  })
}
