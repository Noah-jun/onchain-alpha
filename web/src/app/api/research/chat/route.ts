import { NextResponse } from 'next/server'
import { askResearch } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { message?: string; context?: { type?: string; id?: string; perp?: string } } | null
  const message = String(body?.message || '').slice(0, 2000)
  if (!message.trim()) {
    return NextResponse.json({ error: '请输入问题' }, { status: 400 })
  }
  const answer = await askResearch(message, body?.context || { type: 'digest' })
  return NextResponse.json(answer)
}
