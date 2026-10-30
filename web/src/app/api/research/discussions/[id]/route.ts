import { NextResponse } from 'next/server'
import { getDiscussion } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: { id: string } }) {
  const topic = await getDiscussion(context.params.id)
  if (!topic) return NextResponse.json({ error: '未找到该讨论' }, { status: 404 })
  return NextResponse.json(topic)
}
