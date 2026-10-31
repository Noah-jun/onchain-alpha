import { decodeHtmlEntities, describeTranslateError, magnitudeMismatch, restoreText, toDeeplXml } from './translate'

const hype = '$HYPE &gt;3 on the book. See https://www.grayscale.com/crypto-products/hyperliquid and https://www.grayscale.com/funds @HyperliquidX 12.5% 🚀'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

assert(decodeHtmlEntities('&gt;3 &amp; &lt;tag&gt;') === '>3 & <tag>', 'named entities decode, including double-encoded amp')
assert(decodeHtmlEntities('&amp;gt;3') === '>3', 'double-encoded gt decodes')

const prepared = toDeeplXml(hype)
assert(prepared.tokens[0] === '$HYPE', '$HYPE stays a token')
assert(prepared.tokens.includes('https://www.grayscale.com/crypto-products/hyperliquid'), 'first grayscale url is protected')
assert(prepared.tokens.includes('https://www.grayscale.com/funds'), 'second grayscale url is protected')
assert(prepared.tokens.includes('@HyperliquidX'), 'mention is protected')
assert(!prepared.tokens.includes('12.5%'), 'percents stay in the sentence')
assert(prepared.payload.includes('12.5%'), 'percent is visible to the translator')
assert(prepared.payload.includes('<x>⟦0⟧</x>'), 'placeholder tag is intact')
assert(!prepared.payload.includes('$HYPE'), 'ticker is not sent in clear text')
assert(prepared.payload.includes('&gt;3'), 'amount digits stay next to the escaped sign')
assert(!/&(?!amp;|gt;|lt;)/.test(prepared.payload), 'no raw ampersand in the DeepL payload')

const research = toDeeplXml('Research & Development <note> $HYPE @desk 10 🚀')
assert(research.payload.includes('&amp;'), 'raw ampersand is escaped')
assert(research.payload.includes('&lt;note&gt;'), 'angle brackets are escaped')
assert(research.payload.includes('<x>⟦0⟧</x>'), 'tag is not escaped')

const deepl = {
  translations: [
    {
      detected_source_language: 'EN',
      text: '大规模波动 <x>⟦ 0 ⟧</x> &gt;3。参见 <x>⟦1⟧</x> 和 【2】 <x>⟦3⟧</x> 12.5% 🚀',
    },
  ],
}
const restored = restoreText(deepl.translations[0].text, prepared.tokens)
assert(restored.error === null, restored.error || 'restore should succeed')
assert(restored.text?.includes('$HYPE'), 'ticker restored')
assert(restored.text?.includes('https://www.grayscale.com/crypto-products/hyperliquid'), 'first url restored')
assert(restored.text?.includes('https://www.grayscale.com/funds'), 'second url restored')
assert(restored.text?.includes('@HyperliquidX'), 'mention restored')
assert(restored.text?.includes('12.5%'), 'number restored')
assert(restored.text?.includes('>3'), 'greater-than and the protected digit are joined again')
assert(!restored.text?.includes('&gt;'), 'entity is not left on screen')
assert(restored.text?.includes('🚀'), 'emoji kept')

assert(restoreText('只有 <x>⟦0⟧</x>', prepared.tokens).error === '占位符不匹配', 'missing placeholders fail the item')
assert(describeTranslateError('DeepL', new Error('HTTP 403')) === 'DeepL 403 key 无效', '403')
assert(describeTranslateError('DeepL', new Error('HTTP 456')) === 'DeepL 456 额度用尽', '456')
assert(describeTranslateError('DeepL', new Error('HTTP 429')) === 'DeepL 429 限流', '429')
assert(describeTranslateError('DeepL', new DOMException('The operation was aborted due to timeout', 'TimeoutError')) === 'DeepL 超时', 'timeout')

for (const sample of ['$6 billion', 'over $6.3 billion', '$110.3 million', '$500k', '12%']) {
  const xml = toDeeplXml(`Hackers steal ${sample} from Binance`)
  assert(xml.payload.includes(sample), `${sample} is sent in context`)
  assert(!xml.tokens.some((token) => /\d/.test(token)), `${sample} is not masked as a number`)
}
assert(magnitudeMismatch('NPR: Hackers steal over $6 billion', '黑客从加密货币交易所币安窃取超过60亿美元') === false, '6 billion is 60亿')
assert(magnitudeMismatch('NPR: Hackers steal over $6 billion', '黑客从加密货币交易所币安窃取超过6亿美元') === true, '6亿 is the wrong conversion')
assert(magnitudeMismatch('over $6.3 billion', '超过63亿美元') === false, '6.3 billion is 63亿')
assert(magnitudeMismatch('$110.3 million', '1.103亿美元') === false, '110.3 million is 1.103亿')
assert(magnitudeMismatch('$500k', '约50万美元') === false, '500k is 50万')
assert(magnitudeMismatch('up 12%', '上涨12%') === false, 'a percent has no magnitude to convert')

console.log('translate rules ok')
