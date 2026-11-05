import { NextRequest, NextResponse } from 'next/server'
import { getMarket } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(request: NextRequest) {
  return withClientKeys(request, async () => {
  const watch = (request.nextUrl.searchParams.get('watch') || '').split(',').filter(Boolean)
  const board = await getMarket(watch)
  return NextResponse.json(board)
})
}
