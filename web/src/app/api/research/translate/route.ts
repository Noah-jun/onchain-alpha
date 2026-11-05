import { NextResponse } from 'next/server'
import { translateBatch } from '@/research/translate'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function POST(request: Request) {
  return withClientKeys(request, async () => {
    const body = await request.json().catch(() => null) as { texts?: unknown } | null
    const texts = Array.isArray(body?.texts) ? body.texts.filter((item): item is string => typeof item === 'string') : []
    return NextResponse.json(await translateBatch(texts))
  })
}
