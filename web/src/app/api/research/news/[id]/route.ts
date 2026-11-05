import { NextResponse } from 'next/server'
import { getNewsById } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(_request: Request, context: { params: { id: string } }) {
  return withClientKeys(_request, async () => {
      const article = await getNewsById(context.params.id)
      if (!article) return NextResponse.json({ error: '未找到该新闻' }, { status: 404 })
      return NextResponse.json(article)
  })
}
