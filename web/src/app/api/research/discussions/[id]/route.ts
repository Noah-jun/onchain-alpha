import { NextResponse } from 'next/server'
import { getDiscussion } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(_request: Request, context: { params: { id: string } }) {
  return withClientKeys(_request, async () => {
      const topic = await getDiscussion(context.params.id)
      if (!topic) return NextResponse.json({ error: '未找到该讨论' }, { status: 404 })
      return NextResponse.json(topic)
  })
}
