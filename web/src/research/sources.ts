import type { SourceStatus } from '@/domain/types'
import { envSet, resolveProvider } from '@/research/env'

export function listSources(): SourceStatus[] {
  const market = resolveProvider('RESEARCH_MARKET_PROVIDER', ['coingecko'])
  const news = resolveProvider('NEWS_PROVIDER', ['cryptopanic'], 'NEWS_API_KEY')
  const social = resolveProvider('SOCIAL_PROVIDER', ['x'], 'X_BEARER_TOKEN')
  const funding = resolveProvider('FUNDING_PROVIDER', ['hyperliquid'])
  const onchain = resolveProvider('ONCHAIN_PROVIDER', ['whalealert'], 'WHALE_ALERT_API_KEY')
  const volatility = resolveProvider('VOLATILITY_PROVIDER', ['binance'])
  const aiConfigured = envSet('AI_API_KEY')

  return [
    source('market', '行情', market, '演示快照或 CoinGecko / Yahoo / Binance', '页面轮询，默认 60 秒', [
      ['RESEARCH_MARKET_PROVIDER', 'demo 或 coingecko', true],
      ['COINGECKO_API_KEY', '可选，公开接口不强制', envSet('COINGECKO_API_KEY')],
    ]),
    source('news', '新闻', news, news.kind === 'demo' ? '演示新闻适配器' : 'CryptoPanic', '建议 5 分钟', [
      ['NEWS_PROVIDER', 'demo 或 cryptopanic', true],
      ['NEWS_API_KEY', 'CryptoPanic token', envSet('NEWS_API_KEY')],
    ]),
    source('social', 'X 讨论', social, social.kind === 'demo' ? '演示讨论适配器（可替换）' : 'X recent search', '建议 5 分钟', [
      ['SOCIAL_PROVIDER', 'demo 或 x', true],
      ['X_BEARER_TOKEN', 'X API Bearer', envSet('X_BEARER_TOKEN')],
    ]),
    source('funding', '资金费率', funding, funding.kind === 'demo' ? '演示费率表' : 'Hyperliquid predictedFundings', '建议 60 秒', [
      ['FUNDING_PROVIDER', 'demo 或 hyperliquid', true],
    ]),
    source('onchain', '链上大额转账', onchain, onchain.kind === 'demo' ? '演示链上样本' : 'Whale Alert', '建议 2 分钟', [
      ['ONCHAIN_PROVIDER', 'demo 或 whalealert', true],
      ['WHALE_ALERT_API_KEY', 'Whale Alert key', envSet('WHALE_ALERT_API_KEY')],
    ]),
    source('volatility', '5 分钟波动', volatility, volatility.kind === 'demo' ? '演示波动样本' : 'Binance 5 分钟 K 线', '建议 60 秒', [
      ['VOLATILITY_PROVIDER', 'demo 或 binance', true],
    ]),
    {
      id: 'ai',
      name: '外部模型',
      liveState: aiConfigured ? 'configured' : 'unconfigured',
      displayMode: aiConfigured ? 'live' : 'demo',
      adapter: aiConfigured ? 'OpenAI 兼容接口' : '应用内规则研判',
      refreshHint: '随提问调用',
      note: aiConfigured
        ? '已配置密钥。模型只能在应用内引用上改写，新增数字会被丢弃。'
        : '未配置 AI_API_KEY。页面仍可使用规则研判，它不会把演示写成实时。',
      envVars: [
        { name: 'AI_API_KEY', purpose: '外部模型密钥，只放在服务端', set: aiConfigured },
        { name: 'AI_BASE_URL', purpose: '兼容 /chat/completions 的地址', set: envSet('AI_BASE_URL') },
        { name: 'AI_MODEL', purpose: '模型名', set: envSet('AI_MODEL') },
      ],
    },
  ]
}

function source(
  id: string,
  name: string,
  choice: ReturnType<typeof resolveProvider>,
  adapter: string,
  refreshHint: string,
  envVars: [string, string, boolean][]
): SourceStatus {
  const unconfigured = choice.kind === 'unconfigured'
  return {
    id,
    name,
    liveState: choice.kind === 'live' ? 'configured' : 'unconfigured',
    displayMode: unconfigured ? 'unconfigured' : choice.kind === 'live' ? 'live' : 'demo',
    adapter,
    refreshHint,
    note: unconfigured ? choice.reason : choice.kind === 'demo' ? '未切换到实时源，展示带标签的演示数据。' : '已选择实时适配器。失败时留空，不用演示数据填补。',
    envVars: envVars.map(([envName, purpose, set]) => ({ name: envName, purpose, set })),
  }
}
