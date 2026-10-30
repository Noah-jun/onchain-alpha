import { NextResponse } from 'next/server'
import { getNews } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getNews())
}
