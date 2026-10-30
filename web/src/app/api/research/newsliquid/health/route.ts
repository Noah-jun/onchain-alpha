import { NextResponse } from 'next/server'
import { newsliquidHealth } from '@/research/newsliquid/health'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET() {
  return NextResponse.json(await newsliquidHealth())
}
