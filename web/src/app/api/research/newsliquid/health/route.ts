import { NextResponse } from 'next/server'
import { newsliquidHealth } from '@/research/newsliquid/health'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(request: Request) {
  return withClientKeys(request, async () => {
  return NextResponse.json(await newsliquidHealth())
})
}
