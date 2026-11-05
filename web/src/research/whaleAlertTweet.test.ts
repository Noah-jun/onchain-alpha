import { flowDirection, parseWhaleAlertTweet } from './whaleAlertTweet'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const deposit = parseWhaleAlertTweet('🚨 🚨 1,000 #BTC (68,000,000 USD) transferred from unknown wallet to #Coinbase\nhttps://whale-alert.io/transaction/bitcoin/abc123')
assert(deposit?.amount === 1000, 'btc amount')
assert(deposit?.symbol === 'BTC', 'btc symbol')
assert(deposit?.amountUsd === 68000000, 'btc usd')
assert(deposit?.from === 'unknown wallet' && deposit?.to === 'Coinbase', 'btc parties')
assert(deposit?.kind === 'transfer', 'btc kind')
assert(deposit?.whaleUrl === 'https://whale-alert.io/transaction/bitcoin/abc123', 'whale link kept')
assert(deposit?.chain === 'bitcoin' && deposit?.txHash === 'abc123', 'chain and hash from the whale-alert link')
assert(flowDirection('transfer', deposit?.from ?? null, deposit?.to ?? null) === 'deposit', 'wallet to exchange is inflow')

const withdraw = parseWhaleAlertTweet('🚨 1,500,000 #USDT (1,500,000 USD) transferred from #Binance to unknown wallet')
assert(withdraw?.from === 'Binance' && withdraw?.to === 'unknown wallet', 'exchange to wallet')
assert(flowDirection('transfer', withdraw?.from ?? null, withdraw?.to ?? null) === 'withdraw', 'exchange to wallet is outflow')

const wallets = parseWhaleAlertTweet('250 #ETH (500,000 USD) transferred from unknown wallet to unknown wallet')
assert(wallets?.from === 'unknown wallet' && wallets?.to === 'unknown wallet', 'wallet to wallet parties')
assert(flowDirection('transfer', wallets?.from ?? null, wallets?.to ?? null) === 'transfer', 'unknown to unknown stays wallet-to-wallet')

const institutional = parseWhaleAlertTweet('4,000 #ETH (8,000,000 USD) transferred from unknown wallet to Coinbase Institutional')
assert(institutional?.to === 'Coinbase Institutional', 'institutional name kept')
assert(flowDirection('transfer', institutional?.from ?? null, institutional?.to ?? null) === 'deposit', 'coinbase institutional is an exchange')

const mint = parseWhaleAlertTweet('💵 💵 10,000,000 #USDC (10,000,000 USD) minted at USDC Treasury')
assert(mint?.kind === 'mint' && mint?.symbol === 'USDC' && mint?.from === 'USDC Treasury' && mint?.to === null, 'mint')
assert(flowDirection('mint', mint?.from ?? null, mint?.to ?? null) === 'mint', 'mint direction')

const burn = parseWhaleAlertTweet('🔥 29,999,985 #USDC (29,991,000 USD) burned at Tether Treasury')
assert(burn?.kind === 'burn' && burn?.amount === 29999985 && burn?.amountUsd === 29991000 && burn?.from === 'Tether Treasury', 'burn')
assert(flowDirection('burn', burn?.from ?? null, burn?.to ?? null) === 'burn', 'burn direction')

const locked = parseWhaleAlertTweet('🔒 500 #ETH (1,000,000 USD) locked at #Binance https://whale-alert.io/transaction/ethereum/0xabc')
assert(locked?.kind === 'lock' && locked?.from === 'Binance' && locked?.chain === 'ethereum', 'lock')
assert(flowDirection('lock', locked?.from ?? null, locked?.to ?? null) === 'lock', 'lock direction')

const unlocked = parseWhaleAlertTweet('1,200 #BTC (80,000,000 USD) unlocked from unknown wallet')
assert(unlocked?.kind === 'unlock' && unlocked?.from === 'unknown wallet', 'unlock')
assert(flowDirection('unlock', unlocked?.from ?? null, unlocked?.to ?? null) === 'unlock', 'unlock direction')

assert(parseWhaleAlertTweet('Just a market comment about bitcoin flows') === null, 'unparseable text is skipped')
assert(parseWhaleAlertTweet('🚨 1,000 #BTC transferred from unknown wallet to #Coinbase') === null, 'missing usd is not guessed')
assert(parseWhaleAlertTweet('🚨 1,000 #BTC (68,000,000 USD) moved somewhere') === null, 'unknown verb is skipped')

const samples = [
  ['🚓 🚓 🚓 🚓  120,000,000 $TRX (39,210,232 USD) of stolen funds transferred from Binance Hack 2026 to unknown wallet\n\nhttps://t.co/lMHq0rvW7L', {
    amount: 120000000, symbol: 'TRX', amountUsd: 39210232, from: 'Binance Hack 2026', to: 'unknown wallet', stolen: true, link: 'https://t.co/lMHq0rvW7L', direction: 'withdraw' as const,
  }],
  ['🚨 🚨 🚨  609,699 $SOL (58,512,315 USD) transferred from unknown wallet to Coinbase Institutional\n\nhttps://t.co/zAxmmUG9Wj', {
    amount: 609699, symbol: 'SOL', amountUsd: 58512315, from: 'unknown wallet', to: 'Coinbase Institutional', stolen: false, link: 'https://t.co/zAxmmUG9Wj', direction: 'deposit' as const,
  }],
  ['🚨 🚨 🚨 🚨  1,199 $BTC (92,582,830 USD) transferred from #OKX to unknown wallet\n\nhttps://t.co/4CGI3jfZLo', {
    amount: 1199, symbol: 'BTC', amountUsd: 92582830, from: 'OKX', to: 'unknown wallet', stolen: false, link: 'https://t.co/4CGI3jfZLo', direction: 'withdraw' as const,
  }],
  ['🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨  195,900,100 $USDT (195,690,976 USD) transferred from #Bitfinex to Tether Treasury\n\nhttps://t.co/5VgFAri3L8', {
    amount: 195900100, symbol: 'USDT', amountUsd: 195690976, from: 'Bitfinex', to: 'Tether Treasury', stolen: false, link: 'https://t.co/5VgFAri3L8', direction: 'withdraw' as const,
  }],
  ['🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨  261,739,220 $USDC (261,868,912 USD) transferred from unknown wallet to #Coinbase\n\nhttps://t.co/ilmnaPDVnV', {
    amount: 261739220, symbol: 'USDC', amountUsd: 261868912, from: 'unknown wallet', to: 'Coinbase', stolen: false, link: 'https://t.co/ilmnaPDVnV', direction: 'deposit' as const,
  }],
  ['🚨 🚨 🚨 🚨 🚨  115,000,000 $USDC (115,042,032 USD) transferred from #Aave to unknown wallet\n\nhttps://t.co/rKbSwNdp6a', {
    amount: 115000000, symbol: 'USDC', amountUsd: 115042032, from: 'Aave', to: 'unknown wallet', stolen: false, link: 'https://t.co/rKbSwNdp6a', direction: 'transfer' as const,
  }],
  ['🚨 🚨 🚨  699 $BTC (53,736,700 USD) transferred from #Paxos to unknown wallet\n\nhttps://t.co/x2gX41ywHo', {
    amount: 699, symbol: 'BTC', amountUsd: 53736700, from: 'Paxos', to: 'unknown wallet', stolen: false, link: 'https://t.co/x2gX41ywHo', direction: 'withdraw' as const,
  }],
] as const

for (const [text, expected] of samples) {
  const parsed = parseWhaleAlertTweet(text)
  assert(parsed?.amount === expected.amount, `${expected.symbol} amount`)
  assert(parsed?.symbol === expected.symbol, `${expected.symbol} symbol`)
  assert(parsed?.amountUsd === expected.amountUsd, `${expected.symbol} usd`)
  assert(parsed?.from === expected.from && parsed?.to === expected.to, `${expected.symbol} parties`)
  assert(parsed?.kind === 'transfer', `${expected.symbol} kind`)
  assert(parsed?.stolen === expected.stolen, `${expected.symbol} stolen`)
  assert(parsed?.whaleUrl === null, `${expected.symbol} has no whale-alert.io url`)
  assert(parsed?.link === expected.link, `${expected.symbol} keeps the t.co link`)
  assert(parsed != null && parsed.amountUsd >= 500000, `${expected.symbol} stays above the default 500000 filter`)
  assert(parsed != null && flowDirection(parsed.kind, parsed.from, parsed.to) === expected.direction, `${expected.symbol} direction`)
}

console.log('whale alert tweets ok')
