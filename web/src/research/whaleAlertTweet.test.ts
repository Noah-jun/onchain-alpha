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

console.log('whale alert tweets ok')
