import { NextResponse } from 'next/server'
import { getVolatilityById } from '@/research/service'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: { id: string } }) {
  const alert = await getVolatilityById(context.params.id)
  if (!alert) return NextResponse.json({ error: '未找到该波动' }, { status: 404 })
  return NextResponse.json(alert)
}
