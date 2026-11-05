import { NextRequest, NextResponse } from 'next/server'
import { getVolatility } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(request: NextRequest) {
  return withClientKeys(request, async () => {
  const extra = (request.nextUrl.searchParams.get('symbols') || '').split(',').filter(Boolean)
  return NextResponse.json(await getVolatility(extra))
})
}
