import { NextResponse } from 'next/server'
import { interpretTopic } from '@/research/topicInterpret'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function POST(request: Request) {
  return withClientKeys(request, async () => {
    const body = await request.json().catch(() => null) as { topicId?: unknown; prompt?: unknown; model?: unknown; bypass?: unknown } | null
    const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
    if (!topicId) return NextResponse.json({ error: '缺少话题 id' }, { status: 400 })
    const result = await interpretTopic({
      topicId,
      prompt: typeof body?.prompt === 'string' ? body.prompt : null,
      model: typeof body?.model === 'string' ? body.model : null,
      bypass: body?.bypass === true,
    })
    return NextResponse.json(result.body, { status: result.status })
  })
}
