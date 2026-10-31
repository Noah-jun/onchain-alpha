import { AGENT_JSON_SUFFIX, agentCacheMaterial } from '../domain/agentPrompt'
import { cacheKeyFor, guardReading, runAgent } from './agentInterpret'
import { withClientKeys } from './requestSecrets'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const corpus = JSON.stringify({
  title: '示例',
  likes: 12,
  url: 'https://x.com/i/web/status/1',
})
const allowed = new Set(['https://x.com/i/web/status/1'])
const reading = guardReading(JSON.stringify({
  conclusion: '一句话',
  summary: '样本有 12 个赞',
  facts: [
    { text: '帖子有 12 个赞', type: '已确认事实', sourceUrl: 'https://x.com/i/web/status/1' },
    { text: '帖子有 12 个赞', type: '已确认事实', sourceUrl: 'https://evil.example/leak' },
    { text: '凭空的 999 万美元', type: '媒体报道' },
    { text: '来源写在正文里', type: '不存在的类型', sourceUrl: 'https://x.com/i/web/status/1' },
  ],
  unconfirmed: ['另有 77 个账号'],
  impact: [{ aspect: '情绪', text: '样本有限' }, { aspect: '价格', text: '会到 5000' }],
  opinion: { view: '先看核实结果', reasoning: '依据不足', assumptions: ['没有 88 的数据', '样本不完整'] },
  uncertainty: ['可能不是同一事件'],
  signals: ['后续官方说明'],
}), corpus, allowed, '话题解读 Agent', 'grok-test')

assert(reading.facts.length === 3, 'drops a fact whose number is absent from the input')
assert(reading.facts[0]?.sourceUrl === 'https://x.com/i/web/status/1', 'keeps a sourceUrl present in the input')
assert(reading.facts[1]?.sourceUrl === undefined, 'drops a sourceUrl that is not in the input')
assert(reading.facts.every((fact) => fact.sourceUrl !== 'https://evil.example/leak'), 'no fact keeps a foreign sourceUrl')
assert(reading.facts[2]?.type === '市场传闻', 'unknown fact type falls back')
assert(reading.unconfirmed.length === 0, 'drops an unconfirmed line with a number absent from the input')
assert(reading.impact.length === 1 && reading.impact[0]?.text === '样本有限', 'drops an impact line with a number absent from the input')
assert(reading.opinion.assumptions.length === 1 && reading.opinion.assumptions[0] === '样本不完整', 'drops an assumption with a number absent from the input')
assert(reading.conclusion === '一句话', 'keeps a grounded conclusion')
assert(reading.error === null && reading.markdown === null, 'json reading has no markdown fallback')

const markdown = guardReading('这不是 JSON\n\n- 一条', corpus, allowed, '新闻解读 Agent', 'grok-test')
assert(markdown.markdown === '这不是 JSON\n\n- 一条', 'non-json model text is kept as markdown')
assert(markdown.configured === true && markdown.error === null, 'non-json output does not fail the reading')

const prompt = '自定义话题提示'
const material = agentCacheMaterial({ scope: 'topic', id: 'topic-1', sample: 'sample', prompt, model: 'grok-test' })
assert(cacheKeyFor(material) === cacheKeyFor(material), 'cache key is stable')
assert(cacheKeyFor(material) !== cacheKeyFor(material.replace(prompt, '另一条提示')), 'prompt change changes the cache key')

const original = globalThis.fetch
let calls = 0
globalThis.fetch = (async (_url: string, init?: RequestInit) => {
  calls += 1
  const headers = new Headers(init?.headers)
  const body = JSON.parse(String(init?.body)) as { response_format?: unknown; messages?: { role: string; content: string }[] }
  assert(![...headers.keys()].some((name) => name.startsWith('x-ai-')), 'prompt is not sent as an AI header')
  assert(!headers.get('authorization')?.includes(prompt), 'prompt is not placed in the authorization header')
  const system = body.messages?.find((item) => item.role === 'system')?.content || ''
  assert(system.startsWith(prompt), 'configured prompt is the system prompt')
  assert(system.includes(AGENT_JSON_SUFFIX), 'technical json suffix is appended')
  if (body.response_format) {
    return new Response(JSON.stringify({ error: { message: 'unsupported' } }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ conclusion: '缓存结论', summary: '摘要', facts: [], unconfirmed: [], impact: [], opinion: { view: '观望', reasoning: '', assumptions: [] }, uncertainty: [], signals: [] }) } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}) as typeof fetch

delete process.env.AI_API_KEY
delete process.env.AI_BASE_URL
delete process.env.AI_MODEL
const request = new Request('http://localhost/api/research/discussions/interpret', {
  headers: {
    'x-ai-api-key': 'header-key',
    'x-ai-base-url': 'https://api.x.ai/v1',
    'x-ai-model': 'grok-test',
  },
})

void withClientKeys(request, async () => {
  const first = await runAgent({
    cacheKey: cacheKeyFor(material),
    bypass: false,
    agent: '话题解读 Agent',
    model: 'grok-test',
    prompt,
    userContent: corpus,
    allowedUrls: [...allowed],
  })
  assert(first.conclusion === '缓存结论', 'model json is parsed')
  assert(calls === 2, '400 on json mode falls back once')
  const cached = await runAgent({
    cacheKey: cacheKeyFor(material),
    bypass: false,
    agent: '话题解读 Agent',
    model: 'grok-test',
    prompt,
    userContent: corpus,
    allowedUrls: [...allowed],
  })
  assert(cached.conclusion === '缓存结论' && calls === 2, 'second read uses cache')
  const again = await runAgent({
    cacheKey: cacheKeyFor(material),
    bypass: true,
    agent: '话题解读 Agent',
    model: 'grok-test',
    prompt,
    userContent: corpus,
    allowedUrls: [...allowed],
  })
  assert(again.conclusion === '缓存结论' && calls === 4, 'bypass skips cache and retries json mode')
  globalThis.fetch = original
  console.log('agent interpret ok')
})
