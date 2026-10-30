import { NextResponse } from 'next/server'
import { getSources } from '@/research/service'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET() {
  return NextResponse.json(getSources())
}
