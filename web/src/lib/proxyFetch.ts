// Proxy-aware HTTP request via child_process + curl
// This bypasses Next.js's patched fetch which doesn't respect proxy env vars

import { execSync } from 'child_process'

export function curlGet(url: string): string {
  try {
    return execSync(
      `curl -s --max-time 8 --connect-timeout 5 ` +
      `-H "Accept: application/json" ` +
      `-H "User-Agent: OnChainAlpha/1.0" ` +
      `--proxy http://127.0.0.1:7897 ` +
      `"${url}"`,
      { timeout: 10000, encoding: 'utf-8' }
    )
  } catch (e: any) {
    throw new Error(`curl failed: ${e.stderr?.substring(0, 200) || e.message}`)
  }
}

export function curlGetJSON(url: string): any {
  const text = curlGet(url)
  return JSON.parse(text)
}
