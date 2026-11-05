import { NextResponse } from 'next/server'
import { getFundingPair } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(_request: Request, context: { params: { pair: string } }) {
  return withClientKeys(_request, async () => {
      const detail = await getFundingPair(context.params.pair)
      if (!detail.rates.length) return NextResponse.json(detail, { status: 404 })
      return NextResponse.json(detail)
  })
}
