import { DEFAULT_AGENT_PROMPT, agentCacheMaterial, topicSampleSignature } from '@/domain/agentPrompt'
import { cacheKeyFor, emptyReading, runAgent } from '@/research/agentInterpret'
import { secretValue } from '@/research/env'
import { buildTopicBoard, type TopicCard } from '@/research/topicBoard'

export async function interpretTopic(input: { topicId: string; prompt?: string | null; model?: string | null; bypass?: boolean }) {
  const board = await buildTopicBoard()
  const topic = board.items.find((item) => item.id === input.topicId)
  if (!topic) return { status: 404, body: { ...emptyReading('话题解读 Agent', input.model || ''), configured: true, error: '未找到该话题' } }
  const prompt = input.prompt?.trim() || DEFAULT_AGENT_PROMPT
  const model = input.model?.trim() || secretValue('AI_MODEL') || 'gpt-4o-mini'
  const sample = topicSampleSignature(topic)
  const allowed = uniqueUrls([
    ...topic.posts.map((post) => post.url),
    ...topic.verification.map((item) => item.url),
    ...topic.interpretation.sources.map((item) => item.url),
  ])
  const reading = await runAgent({
    cacheKey: cacheKeyFor(agentCacheMaterial({ scope: 'topic', id: topic.id, sample, prompt, model })),
    bypass: Boolean(input.bypass),
    agent: '话题解读 Agent',
    model: input.model ?? null,
    prompt,
    userContent: JSON.stringify(topicContext(topic)),
    allowedUrls: allowed,
  })
  return { status: 200, body: reading }
}

function topicContext(topic: TopicCard) {
  return {
    title: topic.title,
    kind: topic.kind,
    heat: topic.heat,
    postCount: topic.postCount,
    authorCount: topic.authorCount,
    credibility: topic.credibility,
    credibilityNote: topic.credibilityNote,
    contract: topic.contractNote,
    verification: topic.verification.map((item) => ({ source: item.source, url: item.url, note: item.note, verified: item.verified })),
    posts: topic.posts.map((post) => ({ author: post.author, text: post.text, url: post.url, likes: post.likes, time: post.postedAt })),
  }
}

function uniqueUrls(urls: Array<string | null>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))]
}
