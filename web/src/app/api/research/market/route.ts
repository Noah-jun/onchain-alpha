import { NextRequest, NextResponse } from 'next/server'
import { getMarket } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const perp = request.nextUrl.searchParams.get('perp') || 'CLUSDT'
  const watch = (request.nextUrl.searchParams.get('watch') || '').split(',').filter(Boolean)
  const board = await getMarket(perp, watch)
  return NextResponse.json(board)
}
