/** Display helpers for news cards. Markup is removed; the words stay. */

export function plainNews(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const PLACEHOLDER = /^(每日热点没有返回摘要。|OpenNews 没有返回摘要。|实时条目只有标题。|CryptoPanic 适配器不转载全文。请使用原始链接核对。)$/

export function articleText(title: string, summary: string, body: string): string {
  const options = [body, summary, title].map(plainNews).filter((item) => item && !PLACEHOLDER.test(item))
  return options.sort((a, b) => b.length - a.length)[0] || plainNews(title)
}

export function shortTitle(title: string, summary = '', body = ''): string {
  const cleanTitle = plainNews(title)
  const text = articleText(title, summary, body)
  const embedded = !cleanTitle || cleanTitle.length > 100 || cleanTitle.includes('\n') || cleanTitle === text
  if (!embedded) return cleanTitle
  const firstLine = text.split('\n').map((line) => line.trim()).find(Boolean) || text
  if (firstLine.length <= 80 && firstLine.length < text.length) return firstLine
  const dated = text.match(/^(.{0,60}?\d{1,2}\s+[A-Za-z]+\s+\d{4})(?=\s+\S)/)
  if (dated && dated[1].trim().length <= 80) return dated[1].trim()
  const sentence = (text.split(/(?<=[.!?。！？])\s+/)[0] || text).trim()
  if (sentence.length <= 80) return sentence
  return `${sentence.slice(0, 80).trimEnd()}…`
}

export function newsParagraphs(text: string): string[] {
  const plain = plainNews(text)
  if (!plain) return []
  const lined = plain.includes('\n')
    ? plain
    : plain.replace(/(?<=[.!?。！？])\s+(?=(?:\d+\.\s|【|[A-Z][A-Za-z0-9.&'’-]{1,40}:))/g, '\n')
  if (lined.includes('\n')) return lined.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const sentences = plain.split(/(?<=[.!?。！？])\s+/).filter(Boolean)
  if (sentences.length <= 2) return [plain]
  const groups: string[] = []
  for (let index = 0; index < sentences.length; index += 2) groups.push(sentences.slice(index, index + 2).join(' '))
  return groups
}
