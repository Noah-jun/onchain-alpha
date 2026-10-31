import { DAILY_SECTION_FALLBACK } from '../domain/dailySections'
import { shortTitle } from '../domain/newsText'
import { parseDailyHot, parseDailySections } from './newsliquid/content'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const sections = parseDailySections({
  success: true,
  categories: [
    {
      key: 'web3',
      name_zh: 'Web3与加密货币',
      subcategories: [
        { key: 'defi', name_zh: 'DeFi与基础设施' },
        { key: 'meme', name_zh: 'Meme与热门代币' },
        { key: 'nft_gamefi', name_zh: 'NFT与链游' },
        { key: 'regulation', name_zh: '监管与政策' },
      ],
    },
    { key: 'ai', subcategories: [{ key: 'models', name_zh: 'AI模型与应用' }] },
  ],
})
assert(sections?.length === 4, 'web3 subcategories only')
assert(sections?.[0]?.nameZh === 'DeFi与基础设施', 'label is name_zh')
assert(sections?.every((item) => item.key !== 'models'), 'other categories stay out')
assert(parseDailySections({ categories: [] }) === null, 'missing web3 falls through to the caller fallback')
assert(DAILY_SECTION_FALLBACK.map((item) => item.key).join() === 'defi,meme,nft_gamefi,regulation', 'fallback keys')

const hot = parseDailyHot({
  success: true,
  news: {
    updated_at: '2026-10-31T00:00:02Z',
    items: [
      {
        id: 4657962,
        title: 'Crypto News - 30 October 2026\n\nOn October 30, Binance suffered an estimated $6.3 billion hack.',
        summary_zh: '币安被盗',
        summary_en: 'Binance hack',
        coins: ['ETH'],
        grade: 'A',
        score: 88,
        signal: 'short',
        link: 'https://x.com/WuBlockchain/status/2116243747969085507#',
        source: '6551News',
        published_at: '2026-10-31T03:00:02+08:00',
      },
      {
        id: 2,
        title: 'No rating',
        signal: 'long',
        link: 'https://example.com/no-rating',
        published_at: '2026-10-31T01:00:00Z',
      },
    ],
  },
  tweets: {
    items: [
      { author: 'Vitalik Buterin', handle: 'VitalikButerin', content: 'A note about the hack that is long enough to clamp.', url: 'https://x.com/VitalikButerin/status/99' },
      { handle: 'binance', content: 'Status only', id: '2116243747969085507' },
      { content: '', author: 'empty' },
      { author: 'No link', content: 'Plain text', url: 'https://example.com/not-x' },
    ],
  },
})

assert(hot.items.length === 2, 'both news rows map')
assert(hot.items[0]?.id === 'daily-4657962', 'detail id stays daily- prefixed')
assert(hot.items[0]?.daily?.grade === 'A' && hot.items[0]?.daily?.score === 88, 'grade and score are kept')
assert(hot.items[0]?.analysis.sentiment === '偏空', 'short maps to 偏空')
assert(hot.items[1]?.analysis.sentiment === '偏多', 'long maps to 偏多')
assert(hot.items[1]?.daily === undefined, 'missing grade and score do not invent a tag')
assert(shortTitle(hot.items[0]?.title || '', hot.items[0]?.summary || '', hot.items[0]?.body || '').includes('October 2026'), 'short title still comes from the joined title')
assert(hot.tweets.length === 3, 'empty tweet text is dropped')
assert(hot.tweets[0]?.url === 'https://x.com/VitalikButerin/status/99', 'x.com url is kept')
assert(hot.tweets[0]?.author === 'Vitalik Buterin', 'author is kept')
assert(hot.tweets[1]?.url === 'https://x.com/binance/status/2116243747969085507', 'numeric id becomes an x.com status link')
assert(hot.tweets[2]?.url === null, 'non-x url is not shown as the tweet link')
assert(parseDailyHot({ news: { items: [] }, tweets: { items: [] } }).tweets.length === 0, 'empty tweets stay empty')
assert(hot.updatedAt === '2026-10-31T00:00:02Z', 'updated_at is kept')

const neutral = parseDailyHot({ news: { items: [{ id: 3, title: 'Wait', signal: 'neutral', grade: 'B' }] } })
assert(neutral.items[0]?.analysis.sentiment === '中性', 'neutral maps to 中性')
assert(neutral.items[0]?.daily?.grade === 'B' && neutral.items[0]?.daily?.score === null, 'grade alone is kept')

console.log('daily hot ok')
