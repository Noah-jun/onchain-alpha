import { NextResponse } from 'next/server'
import { getFundingBoard } from '@/research/service'
import { FUNDING_THRESHOLD } from '@/domain/fundingLogic'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET() {
  const board = await getFundingBoard()
  return NextResponse.json({
    ...board,
    thresholdPct: FUNDING_THRESHOLD,
    counts: {
      below: board.rates.filter((rate) => rate.ratePct < -FUNDING_THRESHOLD).length,
      above: board.rates.filter((rate) => rate.ratePct > FUNDING_THRESHOLD).length,
    },
  })
}
