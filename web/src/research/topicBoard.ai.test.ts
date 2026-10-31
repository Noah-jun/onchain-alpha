import { askBatch, matchTopicRows, topicAiReason } from './topicBoard'
import { requestSecret, withClientKeys } from './requestSecrets'
import type { TopicCard } from './topicBoard'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const card = {
  id: 'topic-hype',
  title: '$HYPE',
  kind: '项目',
  heat: 10,
  postCount: 2,
  authorCount: 2,
  credibility: '待确认',
  credibilityNote: '待确认',
  contractNote: null,
  anomaly: [],
  verification: [],
  posts: [],
  interpretation: { configured: false, facts: [], community: [], whyHot: [], impact: [], unconfirmed: [], watch: [], inferences: [], marketing: [], sources: [] },
} as unknown as TopicCard

assert(topicAiReason(new Error('HTTP 401')) === '401 key 无效', '401')
assert(topicAiReason(new Error('HTTP 404')) === '404 模型不存在', '404')
assert(topicAiReason(new Error('HTTP 429')) === '429 限流', '429')
assert(topicAiReason(new DOMException('The operation was aborted due to timeout', 'TimeoutError')) === '超时', 'timeout')
assert(topicAiReason(new Error('JSON 解析失败')) === 'JSON 解析失败', 'json')
assert(topicAiReason(new Error('返回条数不符')) === '返回条数不符', 'count')

const matched = matchTopicRows([card], JSON.stringify({ topics: [{ id: 'topic-hype', whyHot: ['互动上升'], impact: ['待确认'] }] }))
assert(matched.get('topic-hype')?.whyHot?.[0] === '互动上升', 'match by id')
let countError = ''
try {
  matchTopicRows([card, { id: 'other' }], '{"topics":[{"whyHot":["只有一条"]}]}')
} catch (error) {
  countError = error instanceof Error ? error.message : ''
}
assert(countError === '返回条数不符', 'length mismatch without ids')

const original = globalThis.fetch
let calls = 0
globalThis.fetch = (async (_url: string, init?: RequestInit) => {
  calls += 1
  const body = JSON.parse(String(init?.body)) as { response_format?: unknown; model?: string }
  const auth = new Headers(init?.headers).get('authorization') || ''
  assert(auth === 'Bearer header-key', 'AI key header reaches the model call')
  assert(body.model === 'grok-4.20-0309-non-reasoning', 'model header reaches the model call')
  if (body.response_format) {
    return new Response(JSON.stringify({ error: { message: 'response_format unsupported' } }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ topics: [{ id: 'topic-hype', facts: ['已核实事实'], whyHot: ['样本互动上升'], impact: ['中性，待确认'] }] }) } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}) as typeof fetch

delete process.env.AI_API_KEY
delete process.env.AI_BASE_URL
delete process.env.AI_MODEL
const request = new Request('http://localhost/api/research/discussions/board', {
  headers: {
    'x-ai-api-key': 'header-key',
    'x-ai-base-url': 'https://api.x.ai/v1',
    'x-ai-model': 'grok-4.20-0309-non-reasoning',
  },
})
void withClientKeys(request, async () => {
  assert(requestSecret('AI_API_KEY') === 'header-key', 'secret stored')
  assert(requestSecret('AI_BASE_URL') === 'https://api.x.ai/v1', 'base url stored')
  assert(requestSecret('AI_MODEL') === 'grok-4.20-0309-non-reasoning', 'model stored')
  const result = await askBatch([card])
  assert(result.error === null, result.error || 'batch should succeed')
  assert(result.rows.get('topic-hype')?.facts?.[0] === '已核实事实', 'openai-compatible body parsed')
  assert(calls === 2, '400 on json mode falls back to a plain request')
  globalThis.fetch = original
  console.log('topic ai ok')
})
