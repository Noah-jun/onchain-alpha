import { articleText, newsParagraphs, shortTitle } from './newsText'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const digest = 'Crypto News - 30 October 2026 Binance reported a security breach. Markets moved after the halt. A second desk said withdrawals stayed paused.'
assert(shortTitle(digest, '', digest) === 'Crypto News - 30 October 2026', 'dated digest heading')

const headline = 'BLOOMBERG: Binance targeted by historic hack, $6.3 billion stolen'
assert(shortTitle(headline, '每日热点没有返回摘要。', '每日热点没有返回摘要。') === headline, 'short titles stay intact')

const br = 'BITCOIN BREAKS BELOW $80,000 SUPPORT AFTER BINANCE HACK<br/><br/>Bitcoin fell 2.1% to $77,182.'
assert(shortTitle(br, '', br) === 'BITCOIN BREAKS BELOW $80,000 SUPPORT AFTER BINANCE HACK', 'html break becomes the heading')

const long = 'CROWDFUNDINSIDER: Binance Hack, Linked to North Korea backed TraderTraitor and Lazarus Group, Crashes Bitcoin and Crypto Markets, as Hacker Holdings Exceed a Treasury'
assert(shortTitle(long).endsWith('…') && shortTitle(long).length === 81, 'long single sentence is clamped to 80 plus ellipsis')

const paragraphs = newsParagraphs(br)
assert(paragraphs.length === 2, 'br splits into paragraphs')
assert(paragraphs[1] === 'Bitcoin fell 2.1% to $77,182.', 'paragraph text is unchanged')
assert(articleText(br, '每日热点没有返回摘要。', '每日热点没有返回摘要。').includes('Bitcoin fell'), 'body falls back to the long title')

console.log('news text ok')
