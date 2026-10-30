import { NextResponse } from 'next/server'
import { getFundingPair } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: { pair: string } }) {
  const detail = await getFundingPair(context.params.pair)
  if (!detail.rates.length) return NextResponse.json(detail, { status: 404 })
  return NextResponse.json(detail)
}
