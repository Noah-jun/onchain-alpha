import { NextResponse } from 'next/server'
import { getFlowById } from '@/research/service'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(_request: Request, context: { params: { id: string } }) {
  const flow = await getFlowById(context.params.id)
  if (!flow) return NextResponse.json({ error: '未找到该转账' }, { status: 404 })
  return NextResponse.json(flow)
}
