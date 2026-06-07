import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/serverEnv'

export async function GET() {
  try {
    const data = readDataFile('v4-position-events.json')
    
    if (!data) {
      return NextResponse.json({
        ok: true,
        count: 0,
        events: [],
        message: '暂无事件数据，请先运行同步脚本',
      })
    }
    
    return NextResponse.json({
      ok: true,
      count: data.events?.length || 0,
      lastUpdated: data.lastUpdated,
      events: data.events || [],
    })
  } catch (err: any) {
    console.error('[v4-events]', err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
