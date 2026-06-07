import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  // 没有 DATABASE_URL 时返回空数据（Vercel 等无本地 PG 的环境）
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: true,
      count: 0,
      positions: [],
      message: '未配置 DATABASE_URL，持仓数据不可用',
    });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
  });

  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.token_id,
        s.token0, s.token1,
        s.token0_symbol, s.token1_symbol,
        s.fee, s.tick_lower, s.tick_upper,
        s.amount, s.amount0, s.amount1, s.amount_usd, s.position_name,
        s.is_open,
        s.first_seen, s.last_seen, s.snapshot_at,
        c.name AS chain,
        c.chain_id,
        w.address AS wallet
      FROM position_snapshots s
      JOIN chains c ON c.id = s.chain_id
      JOIN wallets w ON w.id = s.wallet_id
      WHERE s.is_open = true AND s.token0 != ''
      ORDER BY s.amount::numeric DESC
    `);

    return NextResponse.json({
      ok: true,
      count: result.rows.length,
      positions: result.rows,
    });
  } catch (err: any) {
    console.error('[v4-positions]', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
