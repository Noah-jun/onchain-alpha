import { NextRequest, NextResponse } from 'next/server'
import { getVolatility } from '@/research/service'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(request: NextRequest) {
  const extra = (request.nextUrl.searchParams.get('symbols') || '').split(',').filter(Boolean)
  return NextResponse.json(await getVolatility(extra))
}
