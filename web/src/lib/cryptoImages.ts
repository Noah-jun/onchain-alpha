// Cryptocompare 代币图片获取（服务端使用）
// 在 Next.js API 路由中调用，使用 https 模块直连（绕过 Next.js fetch 限制）

const https = require('https')

export function fetchImages(symbols: string[]): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    if (symbols.length === 0) return resolve({})
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols.slice(0, 30).join(',')}&tsyms=USD`
    https.get(url, { headers: { 'Accept': 'application/json' }, timeout: 8000 }, (res: any) => {
      let data = ''
      res.on('data', (c: string) => data += c)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          const result: Record<string, string> = {}
          for (const sym of symbols) {
            const imgPath = parsed?.RAW?.[sym]?.USD?.IMAGEURL
            if (imgPath) result[sym] = `https://www.cryptocompare.com${imgPath}`
          }
          resolve(result)
        } catch { resolve({}) }
      })
    }).on('error', () => resolve({}))
      .on('timeout', function(this: any) { this.destroy(); resolve({}) })
  })
}
