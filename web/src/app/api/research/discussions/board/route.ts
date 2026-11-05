import { NextResponse } from 'next/server'
import { buildTopicBoard } from '@/research/topicBoard'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(request: Request) {
  return withClientKeys(request, async () => NextResponse.json(await buildTopicBoard()))
}
