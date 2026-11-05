import { NextResponse } from 'next/server'
import { askResearch } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function POST(request: Request) {
  return withClientKeys(request, async () => {
  const body = await request.json().catch(() => null) as { message?: string; context?: { type?: string; id?: string; perp?: string } } | null
  const message = String(body?.message || '').slice(0, 2000)
  if (!message.trim()) {
    return NextResponse.json({ error: '请输入问题' }, { status: 400 })
  }
  const answer = await askResearch(message, body?.context || { type: 'digest' })
  return NextResponse.json(answer)
})
}
