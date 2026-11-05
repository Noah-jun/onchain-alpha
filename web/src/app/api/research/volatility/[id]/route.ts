import { NextResponse } from 'next/server'
import { getVolatilityById } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(_request: Request, context: { params: { id: string } }) {
  return withClientKeys(_request, async () => {
      const alert = await getVolatilityById(context.params.id)
      if (!alert) return NextResponse.json({ error: '未找到该波动' }, { status: 404 })
      return NextResponse.json(alert)
  })
}
