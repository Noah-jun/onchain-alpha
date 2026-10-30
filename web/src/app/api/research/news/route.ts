import { NextResponse } from 'next/server'
import { getNews } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(request: Request) {
  return withClientKeys(request, async () => {
  return NextResponse.json(await getNews())
})
}
