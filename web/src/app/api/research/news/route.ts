import { NextResponse } from 'next/server'
import { getNewsPage, getNewsSection } from '@/research/service'
import { withClientKeys } from '@/research/requestSecrets'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'hkg1'

export async function GET(request: Request) {
  return withClientKeys(request, async () => {
    const subcategory = new URL(request.url).searchParams.get('subcategory')?.trim() || ''
    if (subcategory) return NextResponse.json(await getNewsSection(subcategory))
    return NextResponse.json(await getNewsPage())
  })
}
