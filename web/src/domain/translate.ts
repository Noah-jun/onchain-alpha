/** Shared, side-effect-free helpers for deciding what to translate and what to leave untouched. */

const PROTECT = /https?:\/\/[^\s<>]+|www\.[^\s<>]+|\$[A-Za-z][A-Za-z0-9]{1,15}|@[A-Za-z0-9_]{1,30}|\$?\d[\d,]*(?:\.\d+)?%?/g

export function needsTranslation(text: string): boolean {
  const stripped = text
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
  const masked = text.replace(PROTECT, (match) => {
    const id = tokens.length
    tokens.push(match)
    return `<x>⟦${id}⟧</x>`
  })
  return { masked, tokens }
}

export function restoreText(translated: string, tokens: string[]): string | null {
  const stripped = translated.replace(/<\/?x>/g, '')
  const restored = stripped.replace(/⟦(\d+)⟧/g, (all, index) => tokens[Number(index)] ?? all)
  if (/⟦\d+⟧/.test(restored)) return null
  const expected = new Map<string, number>()
  for (const token of tokens) expected.set(token, (expected.get(token) ?? 0) + 1)
  for (const [token, count] of expected) {
    if (occurrences(restored, token) < count) return null
  }
  return restored
}

function occurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let index = 0
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1
    index += needle.length
  }
  return count
}
