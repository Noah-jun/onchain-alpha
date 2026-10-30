import type { SourceStatus } from '@/domain/types'
import { demoAllowed, envSet, missingKey } from '@/research/env'

export function listSources(): SourceStatus[] {
  const demo = demoAllowed()
  return [
    liveSource('market', '行情', 'CoinGecko、Yahoo Finance、OKX、Bitget、Gate，Binance/Bybit 不可达时自动跳过', '约 45 秒缓存', [
      ['COINGECKO_API_KEY', '可选。CoinGecko 免费接口不强制', envSet('COINGECKO_API_KEY')],
    ], '默认使用免密钥公开接口。'),
    keyedSource('news', '新闻', 'NEWS_API_KEY', 'CryptoPanic', '在 cryptopanic.com 的开发者页面创建 auth token。'),
    keyedSource('social', 'X 讨论', 'X_BEARER_TOKEN', 'X API v2 recent search', '在 developer.x.com 创建应用并生成 Bearer Token。'),
    liveSource('funding', '资金费率', 'Binance、Bybit、OKX、Gate、Bitget 公开资金费率', '约 45 秒缓存', [], '默认免密钥。Binance 返回 451 或 Bybit 返回 403 时，其余交易所仍会展示。'),
    keyedSource('onchain', '链上大额转账', 'WHALE_ALERT_API_KEY', 'Whale Alert', '在 whale-alert.io 申请 API key。未配置时仍可看 OKX 公开成交。'),
    liveSource('volatility', '5 分钟波动', 'OKX、Gate、Bitget、Binance、Bybit 的 5 分钟 K 线', '约 20 秒缓存', [], '绝对变化超过 10% 才记为异常，并由实际返回的交易所做核对。'),
    {
      id: 'ai',
      name: 'AI 对话',
      liveState: envSet('AI_API_KEY') ? 'configured' : 'unconfigured',
      displayMode: demo ? 'demo' : envSet('AI_API_KEY') ? 'live' : 'unconfigured',
      adapter: envSet('AI_API_KEY') ? 'OpenAI 兼容接口' : '未连接',
      refreshHint: '随提问调用',
      note: envSet('AI_API_KEY')
        ? '已配置。模型只能在已拉取的数据上回答，新增数字会被丢掉。'
        : demo
          ? 'RESEARCH_ALLOW_DEMO=1，当前是演示研判。'
          : missingKey('AI_API_KEY'),
      envVars: [
        { name: 'AI_API_KEY', purpose: '模型密钥，只放在 Vercel 服务端', set: envSet('AI_API_KEY') },
        { name: 'AI_BASE_URL', purpose: '默认 https://api.openai.com/v1，兼容 /chat/completions', set: envSet('AI_BASE_URL') },
        { name: 'AI_MODEL', purpose: '默认 gpt-4o-mini', set: envSet('AI_MODEL') },
      ],
    },
  ]
}

function liveSource(id: string, name: string, adapter: string, refreshHint: string, envVars: [string, string, boolean][], note: string): SourceStatus {
  const demo = demoAllowed()
  return {
    id,
    name,
    liveState: demo ? 'unconfigured' : 'configured',
    displayMode: demo ? 'demo' : 'live',
    adapter,
    refreshHint,
    note: demo ? 'RESEARCH_ALLOW_DEMO=1，当前展示带标签的演示快照。' : note,
    envVars: [
      { name: 'RESEARCH_ALLOW_DEMO', purpose: '设为 1 才启用演示快照，默认关闭', set: demo },
      ...envVars.map(([envName, purpose, set]) => ({ name: envName, purpose, set })),
    ],
  }
}

function keyedSource(id: string, name: string, secret: string, adapter: string, how: string): SourceStatus {
  const demo = demoAllowed()
  const set = envSet(secret)
  return {
    id,
    name,
    liveState: set ? 'configured' : 'unconfigured',
    displayMode: demo ? 'demo' : set ? 'live' : 'unconfigured',
    adapter: set ? adapter : '未连接',
    refreshHint: '随页面请求',
    note: demo ? 'RESEARCH_ALLOW_DEMO=1，当前是演示数据。' : set ? `已配置 ${secret}。${how}` : missingKey(secret),
    envVars: [
      { name: secret, purpose: how, set },
      { name: 'RESEARCH_ALLOW_DEMO', purpose: '设为 1 才启用演示快照，默认关闭', set: demo },
    ],
  }
}
