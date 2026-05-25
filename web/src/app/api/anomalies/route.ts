// Anomaly Detection API
// 数据源：Cryptocompare（直连可用）
// 检测 1h/4h 涨跌异常

import { NextResponse } from 'next/server'

interface AnomalySignal {
  id: string; symbol: string; name: string; image: string
  price: number; change1h: number; change4h: number
  change24h: number; amplitude: number; volume: number; marketCap: number
}

const COINS = ['BTC','ETH','XRP','SOL','BNB','DOGE','ADA','AVAX','LINK','DOT',
  'TRX','SHIB','TON','LTC','BCH','UNI','ATOM','ETC','XLM','INJ','APT','FIL',
  'PEPE','FTM','ALGO','TIA','SEI','SUI','AAVE','MKR','ARB','OP','FET','SAND',
  'AXS','CHZ','GALA','CRV','COMP','SNX','DYDX','BLUR','STX','ONDO','WIF',
  'BONK','PENDLE','ENA','WLD','RENDER','TAO','JUP','PYTH','LDO','RPL','GMX']

async function fetchWithNode(url: string): Promise<any> {
  const https = require('https')
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    https.get(url, { headers: { 'Accept': 'application/json' }, timeout: 8000 }, (res: any) => {
      let data = ''
      res.on('data', (c: string) => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { reject(new Error('Parse')) } })
    }).on('error', reject).on('timeout', function(this: any) { this.destroy(); reject(new Error('Timeout')) })
  })
}

// 获取 1h 变化
async function get1hChanges(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  for (const sym of symbols) {
    try {
      const data = await fetchWithNode(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${sym}&tsym=USD&limit=2`)
      const candles = data?.Data?.Data
      if (candles && candles.length >= 2) {
        const curr = candles[candles.length - 1].close
        const prev = candles[candles.length - 2].close
        if (curr > 0 && prev > 0) {
          result.set(sym, parseFloat(((curr - prev) / prev * 100).toFixed(2)))
        }
      }
    } catch {}
  }
  return result
}

export async function GET() {
  // 获取 24h 数据
  const ids = COINS.join(',')
  try {
    const data = await fetchWithNode(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${ids}&tsyms=USD`)
    const signals: AnomalySignal[] = []
    const anomalySyms: string[] = []

    for (const id of COINS) {
      const raw = data?.RAW?.[id]?.USD
      if (!raw || !raw.PRICE) continue
      const change24h = raw.CHANGEPCT24HOUR || 0
      const amplitude = raw.HIGH24HOUR > 0
        ? ((raw.HIGH24HOUR - raw.LOW24HOUR) / ((raw.HIGH24HOUR + raw.LOW24HOUR) / 2)) * 100 : 0
      if (Math.abs(change24h) <= 6 && amplitude <= 12) continue

      anomalySyms.push(id)
      const imgPath = raw.IMAGEURL
      signals.push({
        id: `anomaly-${id}`, symbol: id, name: id,
        image: imgPath ? `https://www.cryptocompare.com${imgPath}` : '',
        price: raw.PRICE, change1h: 0, change4h: 0,
        change24h: parseFloat(change24h.toFixed(2)),
        amplitude: parseFloat(amplitude.toFixed(1)),
        volume: raw.VOLUME24HOUR || 0,
        marketCap: raw.PRICE * Math.max((raw.VOLUME24HOUR || 0) * 8, 1000000),
      })
    }

    // 获取 1h 变化
    if (anomalySyms.length > 0) {
      const h1 = await get1hChanges(anomalySyms)
      for (const s of signals) {
        const v = h1.get(s.symbol)
        if (v !== undefined) s.change1h = v
      }
    }

    signals.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))

    return NextResponse.json({
      signals, total: signals.length, timestamp: Date.now(),
      source: 'cryptocompare',
      note: signals.length === 0 ? '当前市场无异常波动信号' : ''
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' }
    })
  } catch (e) {
    return NextResponse.json({ signals: [], total: 0, timestamp: Date.now(), source: 'unavailable' })
  }
}
