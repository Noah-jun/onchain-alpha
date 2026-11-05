import { LISTING_EXCHANGE_FALLBACK, classifyListing, parseListingTypes } from './listingNews'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

assert(classifyListing('Binance will delist FOO') === '下架', 'will delist is not a listing')
assert(classifyListing('Delisting of BAR') === '下架', 'delist before list')
assert(classifyListing('Token removal from spot') === '下架', 'removal')
assert(classifyListing('终止交易：ABC') === '下架', '终止交易')
assert(classifyListing('Trading halt for XYZ') === '下架', 'trading halt')
assert(classifyListing('Binance Will List FOO') === '上新', 'will list')
assert(classifyListing('New listing: BAR') === '上新', 'new listing')
assert(classifyListing('Perpetual launch on Hyperliquid') === '上新', 'perpetual launch')
assert(classifyListing('某某代币上线') === '上新', '上线')
assert(classifyListing('上币公告') === '上新', '上币')
assert(classifyListing('Market remains quiet') === '未分类', 'otherwise unclassified')
assert(classifyListing('Will List FOO', 'Binance Delist', ['Binance Delist']) === '下架', 'delisting source code wins')

const parsed = parseListingTypes({
  success: true,
  data: [
    { engineType: 'news', children: [{ code: 'Bloomberg' }] },
    { engineType: 'listing', children: [{ code: 'Binance' }, { code: 'Upbit' }, { code: 'Binance Delist', name: '下架' }] },
  ],
})
assert(parsed?.exchanges.join(',') === 'Binance,Upbit,Binance Delist', 'listing codes only')
assert(parsed?.delistCodes.join(',') === 'Binance Delist', 'delisting-specific code is kept')
assert(parseListingTypes({ data: [{ engineType: 'news', children: ['Bloomberg'] }] }) === null, 'no listing node')
assert(LISTING_EXCHANGE_FALLBACK.length === 9, 'nine fallback exchanges')

console.log('listing news ok')
