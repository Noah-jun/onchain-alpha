import { NextResponse } from 'next/server'
import { interpretNews } from '@/research/newsInterpret'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function POST(request: Request, context: { params: { id: string } }) {
  return withClientKeys(request, async () => {
    const body = await request.json().catch(() => null) as { text?: unknown } | null
    const fallback = typeof body?.text === 'string' ? body.text : null
    const result = await interpretNews(context.params.id, fallback)
    return NextResponse.json(result.body, { status: result.status })
  })
}
