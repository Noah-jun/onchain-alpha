import { NextResponse } from 'next/server'
import { getFlows } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getFlows())
}
