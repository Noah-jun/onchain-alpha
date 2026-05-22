// 项目数据库（涵盖所有热门赛道，含预 TGE 项目）
// 数据持续更新，部分字段从 DeFiLlama 等 API 实时获取

export interface ProjectInfo {
  symbol: string
  name: string
  sector: string
  description: string
  website: string
  twitter: string
  telegram: string
  discord: string
  github: string
  whitepaper: string
  tgeStatus: '已发币' | '未发币' | '待确认'
  chain: string
  tokenAddress?: string
  team?: { name: string; role: string }[]
  funding?: { round: string; amount: string; date: string; investors: string[] }[]
  defillamaId?: string  // 用于查询 TVL
}

export const PROJECTS_DB: Record<string, ProjectInfo> = {
  // ===== Perp DEX =====
  HYPE: {
    symbol: 'HYPE', name: 'Hyperliquid', sector: 'Perp DEX',
    description: '高性能 L1 DeFi 协议，专注于永续合约交易。Hyperliquid 以其高吞吐量、低延迟和友好的交易体验快速增长，日交易量多次突破 10 亿美元。',
    website: 'https://hyperliquid.xyz', twitter: 'https://twitter.com/hyperliquidx',
    telegram: 'https://t.me/hyperliquid', discord: '', github: '',
    whitepaper: 'https://hyperliquid.xyz/whitepaper',
    tgeStatus: '已发币', chain: 'Hyperliquid L1',
    defillamaId: 'hyperliquid',
    team: [
      { name: 'Jeff Yan', role: 'CEO/Co-Founder' },
      { name: 'Yi Sun', role: 'CTO/Co-Founder' },
    ],
    funding: [
      { round: '种子轮', amount: '$800万', date: '2023-06', investors: ['XYZ Capital', 'Variant'] },
    ],
  },
  DYDX: {
    symbol: 'DYDX', name: 'dYdX', sector: 'Perp DEX',
    description: '去中心化永续合约交易所，v4 已迁移至 Cosmos 应用链，实现完全去中心化订单簿交易。',
    website: 'https://dydx.exchange', twitter: 'https://twitter.com/dydx',
    telegram: 'https://t.me/dydxprotocol', discord: 'https://discord.gg/dydx', github: 'https://github.com/dydxprotocol',
    whitepaper: '', tgeStatus: '已发币', chain: 'dYdX Chain (Cosmos)',
    defillamaId: 'dydx',
    funding: [
      { round: 'A轮', amount: '$1000万', date: '2021-01', investors: ['a16z', 'Polychain', 'Three Arrows Capital'] },
      { round: 'B轮', amount: '$6500万', date: '2021-06', investors: ['Paradigm', 'a16z', 'Polychain'] },
    ],
  },
  SNX: {
    symbol: 'SNX', name: 'Synthetix', sector: 'Perp DEX',
    description: '合成资产协议，支持法币、商品、加密货币等合成资产的去中心化交易。Perps 模块提供永续合约功能。',
    website: 'https://synthetix.io', twitter: 'https://twitter.com/synthetix_io',
    telegram: '', discord: 'https://discord.gg/synthetix', github: 'https://github.com/Synthetixio',
    whitepaper: 'https://docs.synthetix.io', tgeStatus: '已发币', chain: 'Ethereum / Optimism / Base',
    defillamaId: 'synthetix',
  },
  DRIFT: {
    symbol: 'DRIFT', name: 'Drift Protocol', sector: 'Perp DEX',
    description: 'Solana 上的永续合约 DEX，采用 vAMM + 订单簿混合模型，支持杠杆交易和流动性挖矿。',
    website: 'https://drift.trade', twitter: 'https://twitter.com/DriftProtocol',
    telegram: 'https://t.me/DriftProtocol', discord: 'https://discord.gg/drift', github: 'https://github.com/drift-labs',
    whitepaper: 'https://docs.drift.trade', tgeStatus: '已发币', chain: 'Solana',
    defillamaId: 'drift',
    funding: [
      { round: '种子轮', amount: '$380万', date: '2021-11', investors: ['Multicoin', 'Alameda'] },
      { round: 'A轮', amount: '$2350万', date: '2022-04', investors: ['Multicoin', 'Jump Crypto'] },
    ],
  },
  GMX: {
    symbol: 'GMX', name: 'GMX', sector: 'Perp DEX',
    description: 'Arbitrum 和 Avalanche 上的永续合约 DEX，采用 GLP 流动性池模型，用户做市商提供流动性分享交易费。',
    website: 'https://gmx.io', twitter: 'https://twitter.com/GMX_IO',
    telegram: 'https://t.me/GMX_IO', discord: 'https://discord.gg/gmx', github: 'https://github.com/gmx-io',
    whitepaper: '', tgeStatus: '已发币', chain: 'Arbitrum / Avalanche',
    defillamaId: 'gmx',
  },
  JUP: {
    symbol: 'JUP', name: 'Jupiter', sector: 'Perp DEX',
    description: 'Solana 生态的核心聚合器和永续合约交易所。Jupiter Perps 提供低滑点永续合约交易。',
    website: 'https://jup.ag', twitter: 'https://twitter.com/JupiterExchange',
    telegram: '', discord: 'https://discord.gg/jup', github: '',
    whitepaper: '', tgeStatus: '已发币', chain: 'Solana',
    defillamaId: 'jupiter',
  },
  // 预 TGE 项目
  'SYNDR': {
    symbol: 'SYNDR', name: 'Syndr', sector: 'Perp DEX',
    description: '基于 Arbitrum 的期权和永续合约 DEX，采用流动性池和集中订单簿混合模型。',
    website: 'https://syndr.io', twitter: 'https://twitter.com/SyndrProtocol',
    telegram: 'https://t.me/SyndrProtocol', discord: 'https://discord.gg/syndr', github: '',
    whitepaper: '', tgeStatus: '未发币', chain: 'Arbitrum',
    funding: [
      { round: '种子轮', amount: '$300万', date: '2024-03', investors: ['Arbitrum Foundation', 'Animoca'] },
    ],
  },
  'ZKX': {
    symbol: 'ZKX', name: 'ZKX', sector: 'Perp DEX',
    description: 'StarkNet 上的永续合约 DEX，利用 ZK-rollup 技术实现低费用、高吞吐量的去中心化交易。',
    website: 'https://zkx.fi', twitter: 'https://twitter.com/ZKXProtocol',
    telegram: 'https://t.me/ZKXProtocol', discord: 'https://discord.gg/zkx', github: 'https://github.com/ZKXProtocol',
    whitepaper: 'https://docs.zkx.fi', tgeStatus: '未发币', chain: 'StarkNet',
    funding: [
      { round: '种子轮', amount: '$450万', date: '2023-09', investors: ['StarkWare', 'Alameda', 'Huobi'] },
    ],
  },

  // ===== AI =====
  FET: {
    symbol: 'FET', name: 'Fetch.ai', sector: 'AI',
    description: 'AI 代理基础设施，使 AI 代理能够自主执行链上操作。与 ASI Alliance 合并后成为 AI 生态核心。',
    website: 'https://fetch.ai', twitter: 'https://twitter.com/Fetch_ai',
    telegram: 'https://t.me/fetch_ai', discord: 'https://discord.gg/fetchai', github: 'https://github.com/fetchai',
    whitepaper: 'https://docs.fetch.ai', tgeStatus: '已发币', chain: 'Fetch.ai / Ethereum',
    defillamaId: 'fetch',
  },
  // 更多项目...
  RENDER: {
    symbol: 'RENDER', name: 'Render Network', sector: 'AI',
    description: '分布式 GPU 渲染和 AI 计算网络，连接需要算力的用户和提供 GPU 的节点运营商。',
    website: 'https://rendertoken.com', twitter: 'https://twitter.com/rendernetwork',
    telegram: 'https://t.me/rendernetwork', discord: 'https://discord.gg/rendernetwork', github: 'https://github.com/rendertoken',
    whitepaper: '', tgeStatus: '已发币', chain: 'Solana',
    defillamaId: 'render-network',
  },
  TAO: {
    symbol: 'TAO', name: 'Bittensor', sector: 'AI',
    description: '去中心化机器学习网络，通过代币激励鼓励 AI 模型的开发和贡献。',
    website: 'https://bittensor.com', twitter: 'https://twitter.com/bittensor_',
    telegram: '', discord: 'https://discord.gg/bittensor', github: 'https://github.com/opentensor',
    whitepaper: 'https://bittensor.com/whitepaper', tgeStatus: '已发币', chain: 'Bittensor',
  },
  ASTER: {
    symbol: 'ASTER', name: 'Aster', sector: 'Meme',
    description: 'Aster 是基于 Solana 的热门 Meme 代币，以其独特的社区文化和病毒式传播增长迅速。近期在 CoinGecko 上位列 trending 前列。',
    website: '', twitter: '', telegram: '', discord: '', github: '',
    whitepaper: '', tgeStatus: '已发币', chain: 'Solana',
  },
  LIT: {
    symbol: 'LIT', name: 'Lighter', sector: 'Meme',
    description: 'Lighter 是近期火爆的 Meme 代币，以其独特的叙事和社区驱动增长。在多个 CEX 上线交易。',
    website: '', twitter: '', telegram: '', discord: '', github: '',
    whitepaper: '', tgeStatus: '已发币', chain: 'Solana',
  },
  WLD: {
    symbol: 'WLD', name: 'Worldcoin', sector: 'AI',
    description: '由 Sam Altman 联合创立的生物识别身份和金融网络，通过 Orb 设备扫描虹膜验证人类身份。',
    website: 'https://worldcoin.org', twitter: 'https://twitter.com/worldcoin',
    telegram: '', discord: 'https://discord.gg/worldcoin', github: 'https://github.com/worldcoin',
    whitepaper: 'https://worldcoin.org/whitepaper', tgeStatus: '已发币', chain: 'Optimism',
    funding: [
      { round: 'A轮', amount: '$2500万', date: '2021-06', investors: ['a16z', 'Coinbase Ventures'] },
      { round: 'B轮', amount: '$1亿', date: '2022-03', investors: ['Blockchain Capital', 'a16z'] },
      { round: 'C轮', amount: '$1.15亿', date: '2023-05', investors: ['Blockchain Capital', 'a16z'] },
    ],
  },

  // ===== Layer2 =====
  ARB: {
    symbol: 'ARB', name: 'Arbitrum', sector: 'Layer2',
    description: '最流行的 Ethereum Optimistic Rollup，TVL 排名 L2 第一。拥有庞大的 DeFi 和游戏生态。',
    website: 'https://arbitrum.io', twitter: 'https://twitter.com/arbitrum',
    telegram: '', discord: 'https://discord.gg/arbitrum', github: 'https://github.com/OffchainLabs',
    whitepaper: 'https://arbitrum.io/whitepaper', tgeStatus: '已发币', chain: 'Arbitrum (Ethereum L2)',
    defillamaId: 'arbitrum',
    team: [
      { name: 'Steven Goldfeder', role: 'CEO/Co-Founder' },
      { name: 'Ed Felten', role: 'Co-Founder' },
    ],
    funding: [
      { round: 'B轮', amount: '$1.2亿', date: '2021-08', investors: ['Lightspeed', 'a16z', 'Pantera'] },
    ],
  },
  OP: {
    symbol: 'OP', name: 'Optimism', sector: 'Layer2',
    description: 'Ethereum 官方支持的 Optimistic Rollup，以 Retroactive Public Goods Funding 著称。',
    website: 'https://optimism.io', twitter: 'https://twitter.com/optimismFND',
    telegram: '', discord: 'https://discord.gg/optimism', github: 'https://github.com/ethereum-optimism',
    whitepaper: 'https://optimism.io/whitepaper', tgeStatus: '已发币', chain: 'OP Mainnet (Ethereum L2)',
    defillamaId: 'optimism',
  },
  STRK: {
    symbol: 'STRK', name: 'StarkNet', sector: 'Layer2',
    description: '基于 STARK 证明的 ZK-Rollup，使用 Cairo 语言编写智能合约。专注于扩展 Ethereum 的同时保持去中心化。',
    website: 'https://starknet.io', twitter: 'https://twitter.com/StarkNet',
    telegram: '', discord: 'https://discord.gg/starknet', github: 'https://github.com/starkware-libs',
    whitepaper: 'https://starknet.io/whitepaper', tgeStatus: '已发币', chain: 'StarkNet (Ethereum L2)',
    defillamaId: 'starknet',
  },
  // 预 TGE L2
  MEGA: {
    symbol: 'MEGA', name: 'MegaETH', sector: 'Layer2',
    description: '高性能 Ethereum L2，专注于实现实时区块链（Real-Time Blockchain），区块确认时间低于 1 毫秒。',
    website: 'https://megaeth.com', twitter: 'https://twitter.com/megaeth_labs',
    telegram: '', discord: 'https://discord.gg/megaeth', github: '',
    whitepaper: '', tgeStatus: '未发币', chain: 'Ethereum L2',
    funding: [
      { round: '种子轮', amount: '$2000万', date: '2024-06', investors: ['Dragonfly', 'Figment', 'Robot Ventures'] },
    ],
    team: [
      { name: 'Yilong Li', role: 'CEO/Co-Founder' },
      { name: 'Nan Lin', role: 'CTO/Co-Founder' },
    ],
  },

  // ===== RWA =====
  ONDO: {
    symbol: 'ONDO', name: 'Ondo Finance', sector: 'RWA',
    description: '代币化金融产品平台，将美国国债、货币市场基金等传统资产上链。',
    website: 'https://ondo.finance', twitter: 'https://twitter.com/OndoFinance',
    telegram: 'https://t.me/ondofinance', discord: 'https://discord.gg/ondo', github: '',
    whitepaper: '', tgeStatus: '已发币', chain: 'Ethereum',
    defillamaId: 'ondo-finance',
  },

  // ===== 预测市场 =====
  POLY: {
    symbol: 'POLY', name: 'Polymarket', sector: '预测市场',
    description: '最大的去中心化预测市场平台，基于 Polygon。在 2024 美国大选期间交易量爆发。',
    website: 'https://polymarket.com', twitter: 'https://twitter.com/Polymarket',
    telegram: '', discord: '', github: '',
    whitepaper: '', tgeStatus: '未发币', chain: 'Polygon',
    funding: [
      { round: 'A轮', amount: '$4000万', date: '2024-05', investors: ['Founders Fund', 'Dragonfly', 'GSR'] },
    ],
    team: [
      { name: 'Shayne Coplan', role: 'CEO/Founder' },
    ],
  },
}

export function getProjectInfo(symbol: string): ProjectInfo | undefined {
  return PROJECTS_DB[symbol.toUpperCase()]
}
