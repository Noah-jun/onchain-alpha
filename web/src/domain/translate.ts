/** Shared, side-effect-free helpers for deciding what to translate and what to leave untouched. */

const PROTECT = /https?:\/\/[^\s<>]+|www\.[^\s<>]+|\$[A-Za-z][A-Za-z0-9]{1,15}|@[A-Za-z0-9_]{1,30}/g
const MAGNITUDE = /\$?\d[\d,]*(?:\.\d+)?\s*(?:trillion|billion|million|thousand|bn|mn|[kmb])\b/gi
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

export function decodeHtmlEntities(text: string): string {
  let current = text
  for (let pass = 0; pass < 2; pass += 1) {
    const next = current.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (all, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        const code = Number.parseInt(body.slice(2), 16)
        return codePoint(code) ?? all
      }
      if (body.startsWith('#')) {
        const code = Number.parseInt(body.slice(1), 10)
        return codePoint(code) ?? all
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? all
    })
    if (next === current) break
    current = next
  }
  return current
}

export function needsTranslation(text: string): boolean {
  const stripped = decodeHtmlEntities(text)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/www\.\S+/g, ' ')
    .replace(/\$[A-Za-z][A-Za-z0-9]{1,15}/g, ' ')
    .replace(/@[A-Za-z0-9_]{1,30}/g, ' ')
    .replace(/\$?\d[\d,]*(?:\.\d+)?%?/g, ' ')
  const han = stripped.match(/\p{Script=Han}/gu)?.length ?? 0
  const latin = stripped.match(/[A-Za-z]/g)?.length ?? 0
  if (latin < 3) return false
  if (han === 0) return true
  return latin > han
}

export function protectText(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = []
  const masked = decodeHtmlEntities(text).replace(PROTECT, (match) => {
    const id = tokens.length
    tokens.push(match)
    return `<x>⟦${id}⟧</x>`
  })
  return { masked, tokens }
}

/** Escape text nodes for DeepL tag_handling=xml. Placeholders stay inside <x> tags. */
export function toDeeplXml(text: string): { payload: string; tokens: string[] } {
  const { masked, tokens } = protectText(text)
  const payload = masked.split(/(<x>⟦\d+⟧<\/x>)/).map((part) => (part.startsWith('<x>') ? part : escapeXml(part))).join('')
  return { payload, tokens }
}

export function restoreText(translated: string, tokens: string[]): { text: string | null; error: string | null } {
  const normalized = normalizePlaceholderMarks(decodeHtmlEntities(translated)).replace(/<\s*\/?\s*x\s*>/gi, '')
  if (!tokens.length) return { text: normalized, error: null }
  const seen = new Set<number>()
  const text = normalized.replace(/[⟦\[【〖〔［]\s*([0-9０-９]+)\s*[⟧\]】〗〕］]/g, (all, raw: string) => {
    const index = Number(raw.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xFF10 + 0x30)))
    const token = tokens[index]
    if (token == null) return all
    seen.add(index)
    return token
  })
  if (tokens.some((_, index) => !seen.has(index))) return { text: null, error: '占位符不匹配' }
  return { text, error: null }
}

/** True when a source amount with a magnitude word is missing its converted value. */
export function magnitudeMismatch(source: string, translated: string): boolean {
  const amounts = decodeHtmlEntities(source).match(MAGNITUDE) ?? []
  if (!amounts.length) return false
  const normalized = normalizeDigits(translated).replace(/[,，\s]/g, '')
  return amounts.some((amount) => !acceptedForms(amount).some((form) => normalized.includes(form.replace(/[,，\s]/g, ''))))
}

export function describeTranslateError(provider: 'DeepL' | 'AI', error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : ''
  const blob = `${name} ${message}`
  if (/HTTP 403/.test(blob)) return `${provider} 403 key 无效`
  if (/HTTP 456/.test(blob)) return `${provider} 456 额度用尽`
  if (/HTTP 429/.test(blob)) return `${provider} 429 限流`
  if (/timeout|timed out|aborted|AbortError|TimeoutError/i.test(blob)) return `${provider} 超时`
  if (/占位符不匹配/.test(blob)) return '占位符不匹配'
  const detail = message.replace(/\s+/g, ' ').trim().slice(0, 120)
  return detail ? `${provider} 翻译失败：${detail}` : `${provider} 翻译失败`
}

function acceptedForms(amount: string): string[] {
  const match = amount.match(/\$?(\d[\d,]*(?:\.\d+)?)\s*(trillion|billion|million|thousand|bn|mn|[kmb])/i)
  if (!match) return []
  const value = Number(match[1].replace(/,/g, '')) * magnitudeFactor(match[2])
  if (!Number.isFinite(value)) return []
  const forms = new Set<string>([trimNumber(value)])
  if (value >= 1e12) forms.add(`${trimNumber(value / 1e12)}万亿`)
  if (value >= 1e8) forms.add(`${trimNumber(value / 1e8)}亿`)
  if (value >= 1e4) forms.add(`${trimNumber(value / 1e4)}万`)
  if (value >= 1e6 && value < 1e8) forms.add(`${trimNumber(value / 1e6)}百万`)
  return [...forms]
}

function magnitudeFactor(unit: string): number {
  const name = unit.toLowerCase()
  if (name === 'trillion') return 1e12
  if (name === 'billion' || name === 'bn' || name === 'b') return 1e9
  if (name === 'million' || name === 'mn' || name === 'm') return 1e6
  return 1e3
}

function trimNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6
  return String(rounded)
}

function normalizeDigits(text: string): string {
  return text.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xFF10 + 0x30))
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function normalizePlaceholderMarks(text: string): string {
  return text.replace(/［/g, '[').replace(/］/g, ']')
}

function codePoint(code: number): string | null {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return null
  try {
    return String.fromCodePoint(code)
  } catch {
    return null
  }
}
