import { isPromoText, newsMentionsSubject, topicsFromPosts } from './topicBoard'

const ca = '0x1111111111111111111111111111111111111111'
const spotPosts = [
  {
    id: 'spot-1',
    author: 'caller_one',
    text: `Massive 2x Profit up on my call $SPOT\nCA: ${ca}\n#memecoin1000x #fomo`,
    postedAt: '2026-10-30T15:04:20.000Z',
    likes: 4,
    reposts: 1,
    replies: 0,
    followers: 80,
  },
  {
    id: 'spot-2',
    author: 'caller_two',
    text: `Watch your entry $SPOT\nCA: ${ca}\n#memecoin1000x #fomo`,
    postedAt: '2026-10-30T15:04:25.000Z',
    likes: 3,
    reposts: 0,
    replies: 1,
    followers: 40,
  },
]

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

assert(isPromoText(spotPosts[0].text), '2x profit call should be promo')
assert(isPromoText(spotPosts[1].text), 'watch your entry should be promo')
assert(topicsFromPosts(spotPosts).length === 0, '$SPOT shill posts must not become a topic')

assert(newsMentionsSubject('Spot Gold Extends Losses', 'SPOT', null) === false, 'plain English Spot is not $SPOT')
assert(newsMentionsSubject('Traders sold $SPOT after the pool opened', 'SPOT', null) === true, '$SPOT should match')
assert(newsMentionsSubject(`Pool ${ca} is live`, 'SPOT', ca) === true, 'contract address should match')

const quietMeme = topicsFromPosts([
  { id: 'm1', author: 'a', text: 'Looking at $PEPE artwork from the last cycle and the old liquidity pool.', postedAt: '2026-10-30T10:00:00.000Z', likes: 0, reposts: 0, replies: 0, followers: 12 },
  { id: 'm2', author: 'b', text: 'Another note on $PEPE artwork with no replies in this sample.', postedAt: '2026-10-30T11:00:00.000Z', likes: 0, reposts: 0, replies: 0, followers: 9 },
])
assert(quietMeme.length === 0, 'meme posts without engagement must be dropped')

const etf = topicsFromPosts([
  { id: 'e1', author: 'desk', text: 'The $BTC ETF flow print was the main event in the sample, with the issuer filing linked.', postedAt: '2026-10-30T08:00:00.000Z', likes: 40, reposts: 6, replies: 3, followers: 12000, url: 'https://x.com/desk/status/1' },
  { id: 'e2', author: 'wire', text: 'Second desk also tracked the $BTC ETF flow print against the prior filing.', postedAt: '2026-10-30T12:00:00.000Z', likes: 22, reposts: 2, replies: 1, followers: 8000, url: 'https://x.com/wire/status/2' },
])
assert(etf.length === 1, 'two engaged accounts on a specific ETF event should remain')
assert(etf[0].credibility === '待确认', 'no exact source yet, so credibility stays unconfirmed')
assert(etf[0].kind === '事件', 'ETF wording should classify as an event')

console.log('topic rules ok')
