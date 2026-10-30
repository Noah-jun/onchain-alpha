import { NextResponse } from 'next/server'
import { getNewsById } from '@/research/service'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(_request: Request, context: { params: { id: string } }) {
  const article = await getNewsById(context.params.id)
  if (!article) return NextResponse.json({ error: '未找到该新闻' }, { status: 404 })
  return NextResponse.json(article)
}
