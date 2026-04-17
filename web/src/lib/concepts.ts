// 加密行业专业术语知识库

export interface CryptoConcept {
  id: string
  term: string
  aliases: string[]
  category: string
  definition: string
  developmentStatus: string
  representativeProjects: {
    name: string
    symbol: string
    description: string
  }[]
  keyIndicators?: { label: string; value: string }[]
  trends?: string
}

export const CRYPTO_CONCEPTS: CryptoConcept[] = [
  {
    id: 'rwa',
    term: 'RWA',
    aliases: ['Real World Assets', '现实世界资产'],
    category: '概念',
    definition: 'RWA（Real World Assets）即现实世界资产，是指将房地产、债券、商品等传统实物资产通证化，在区块链上发行代币，使其能够进行分割、交易和流动性管理。RWA 桥接了传统金融与 DeFi，允许加密投资者获得传统资产的收益敞口。',
    developmentStatus: 'RWA 是 2023-2024 年增长最快的加密赛道之一。主流机构如 BlackRock、Franklin Templeton 已推出代币化基金。MakerDAO、Centrifuge 等 DeFi 协议已支持 RWA 借贷。主要发展集中在美国国债、房地产和私募股权领域。',
    representativeProjects: [
      { name: 'MakerDAO', symbol: 'MKR', description: '最大的 RWA 借贷平台，已将 USDC 和美国国债作为抵押品' },
      { name: 'Centrifuge', symbol: 'CFG', description: '专注企业应收账款融资，连接 TradFi 与 DeFi' },
      { name: 'Polymesh', symbol: 'POLYX', description: '专为 RWA 设计的合规 Layer1 区块链' },
      { name: 'Ondo Finance', symbol: 'ONDO', description: '提供代币化美国国债和货币市场基金' },
    ],
    keyIndicators: [
      { label: 'RWA 总锁定量', value: '$10B+' },
      { label: '年增长率', value: '300%+' },
    ],
    trends: '贝莱德等传统资管巨头入场，代币化国债成为主流用例，监管框架逐渐清晰'
  },
  {
    id: 'defi',
    term: 'DeFi',
    aliases: ['Decentralized Finance', '去中心化金融'],
    category: 'DeFi',
    definition: 'DeFi（去中心化金融）是基于区块链和智能合约构建的金融服务和产品，无需传统金融机构作为中介。用户可以直接进行借贷、交易、收益农业等活动。核心特点是无需许可、开源透明、流动性池模式。',
    developmentStatus: 'DeFi 经过 2020-2022 的爆发后经历了熊市洗牌，2024 年 TVL 稳定在 $50B 左右。主要集中在 Ethereum、Arbitrum、Optimism 等链上。借贷协议（Aave、Compound）和 DEX（Uniswap）是核心基础设施。',
    representativeProjects: [
      { name: 'Uniswap', symbol: 'UNI', description: '最大的去中心化交易所，日交易量数十亿美元' },
      { name: 'Aave', symbol: 'AAVE', description: '去中心化借贷协议，支持 20+ 资产的借贷' },
      { name: 'Compound', symbol: 'COMP', description: '自动利率借贷协议，算法利率生成' },
      { name: 'Curve', symbol: 'CRV', description: '稳定币和资产兑换专用 DEX，专注于低滑点交易' },
    ],
    trends: 'Intent-based 交易模式兴起，Restaking 带来新收益来源，专注安全性和用户体验'
  },
  {
    id: 'layer2',
    term: 'Layer2',
    aliases: ['L2', '二层网络', 'Rollup'],
    category: 'Layer2',
    definition: 'Layer2 是构建在 Layer1 区块链（如 Ethereum）之上的扩展解决方案，通过在链下处理交易来提高吞吐量、降低费用。主流方案包括 Rollup（ZK Rollup 和 Optimistic Rollup）、State Channels、Plasma 等。',
    developmentStatus: 'L2 是 Ethereum 生态最重要的扩展方案。Arbitrum、Optimism 等 OP Rollup 已稳定运行，zkSync、StarkNet 等 ZK Rollup 逐步成熟。2024 年 L2 总 TVL 超过 $40B，已成为主流交互层。',
    representativeProjects: [
      { name: 'Arbitrum', symbol: 'ARB', description: '最流行的 Optimistic Rollup，TVL 最高' },
      { name: 'Optimism', symbol: 'OP', description: 'Ethereum 官方支持的 OP Rollup，Retroactive Funding 支持生态' },
      { name: 'zkSync Era', symbol: 'ZK', description: 'ZK Rollup，支持 EVM 兼容，零知识证明验证' },
      { name: 'StarkNet', symbol: 'STRK', description: '基于 STARK 的 ZK Rollup，原生 Cairo 语言' },
      { name: 'Base', symbol: 'COIN', description: 'Coinbase 推出的 L2，专注于简单、安全、去中心化' },
    ],
    trends: 'ZK Rollup 技术成熟，Chain Abstraction 概念兴起，跨 L2 互操作性改善'
  },
  {
    id: 'restaking',
    term: 'Restaking',
    aliases: ['再质押', 'EigenLayer'],
    category: 'DeFi',
    definition: 'Restaking（再质押）允许 ETH 持有者在 Lido、Coinbase Wrapped Staked ETH 等流动性质押协议中质押 ETH 后，再次将 stETH/rETH 等代币存入 EigenLayer 等协议，获得额外收益。同时可以扮演验证者角色，为新基础设施提供经济安全性。',
    developmentStatus: 'EigenLayer 于 2023 年推出其 Restaking 机制，TVL 迅速突破 $10B。引发了关于 LSD（流动性质押衍生品）赛道的大爆发。2024 年 restaking 进一步演化为 restaked ETH（restETH）模式，支持比特币和多种资产的再质押。',
    representativeProjects: [
      { name: 'EigenLayer', symbol: 'EIGEN', description: 'Restaking 协议，允许 ETH 再次质押支持其他网络' },
      { name: 'Lido', symbol: 'LDO', description: '流动性质押龙头，占据 30%+ ETH 质押份额' },
      { name: 'Rocket Pool', symbol: 'RPL', description: '去中心化流动性质押协议，支持 16 ETH 起步的节点运营' },
    ],
    trends: 'EigenLayer AVS（主动验证服务）生态系统扩展，流动性再质押协议（Lybra、Prisma）兴起'
  },
  {
    id: 'memecoin',
    term: 'Memecoin',
    aliases: ['模因币', '动物币', 'Meme Coin'],
    category: '概念',
    definition: 'Memecoin 是基于互联网 meme（模因）文化创建的加密货币，通常以动物头像或热门事件为主题。其价值主要来自社区共识、社交媒体热度，而非实际技术或商业模式。Dogecoin、Shiba Inu 是典型代表。',
    developmentStatus: 'Memecoin 在 2023-2024 年经历了爆发式增长。Pepe、FLOKI、BONK 等新 Memecoin 涌现，部分百倍甚至千倍涨幅。链上 Memecoin 交易活跃，Twitter KOL 喊单影响巨大。Memecoin 成为加密市场不可忽视的板块。',
    representativeProjects: [
      { name: 'Dogecoin', symbol: 'DOGE', description: '最早的 Memecoin，由 Elon Musk 多次喊单' },
      { name: 'Shiba Inu', symbol: 'SHIB', description: '以太坊上最大的 Memecoin，社区驱动' },
      { name: 'Pepe', symbol: 'PEPE', description: '2023 年最火的新 Memecoin，上线后涨幅超万倍' },
      { name: 'BONK', symbol: 'BONK', description: 'Solana 生态最火的 Memecoin' },
    ],
    trends: 'Memecoin 永续合约交易量增长，追踪 KOL 钱包成为策略，注意力经济驱动'
  },
  {
    id: 'ai-crypto',
    term: 'AI + Crypto',
    aliases: ['AI Crypto', '人工智能加密', '人工智能代币'],
    category: '概念',
    definition: 'AI + Crypto 是将人工智能技术与区块链结合的领域，包括：AI 驱动的交易策略、AI 生成内容（AGC）、去中心化 AI 计算市场、AI 代理（Agent）等方向。核心是结合 AI 的智能化与区块链的去中心化特性。',
    developmentStatus: '2023-2024 年 AI + Crypto 概念爆发。Fetch.ai、SingularityNET、Ocean Protocol 等老牌项目获得关注。ACT、Zerebro 等 AI Agent 代币涌现。AI 代理自主交易、链上 AI 推理成为新趋势。',
    representativeProjects: [
      { name: 'Fetch.ai', symbol: 'FET', description: 'AI 代理基础设施，专注自主代理和机器学习' },
      { name: 'SingularityNET', symbol: 'AGIX', description: '去中心化 AI 市场，连接 AI 开发者和用户' },
      { name: 'Ocean Protocol', symbol: 'OCEAN', description: '数据代币化协议，AI 训练数据市场' },
      { name: 'Render', symbol: 'RNDR', description: '分布式 GPU 计算网络，AI 渲染和计算' },
    ],
    trends: 'AI Agent 自主链上操作成为热点，Agent 社交媒体账号涌现，Agent-to-Agent 经济萌芽'
  },
  {
    id: 'dao',
    term: 'DAO',
    aliases: ['Decentralized Autonomous Organization', '去中心化自治组织'],
    category: '基础设施',
    definition: 'DAO 是基于智能合约运行的去中心化组织，没有中心化领导结构。成员通过持有代币获得投票权，共同决策组织发展方向。Treasury、规则执行等都代码化，确保透明和不可篡改。',
    developmentStatus: 'DAO 是加密世界的核心组织形式。MakerDAO、Uniswap DAO 等管理数十亿美元资产。Arbitrum 等通过 DAO 治理进行空投分发。Snapshot 等工具使治理门槛降低。',
    representativeProjects: [
      { name: 'MakerDAO', symbol: 'MKR', description: '去中心化稳定币 DAI 的治理组织' },
      { name: 'Uniswap', symbol: 'UNI', description: 'UNI 代币持有者治理 Uniswap 协议' },
      { name: 'Lido DAO', symbol: 'LDO', description: '流动性质押服务的治理组织' },
    ],
    trends: 'DAO 工具专业化（Safe、Snapshot、Tally），SubDAO 概念兴起，治理参与度仍低'
  },
  {
    id: 'depin',
    term: 'DePIN',
    aliases: ['Decentralized Physical Infrastructure', '去中心化物理基础设施'],
    category: '概念',
    definition: 'DePIN（去中心化物理基础设施）是通过代币激励构建真实世界基础设施的网络。参与者贡献硬件资源（存储、带宽、计算、传感器等）获得代币奖励。模式结合了 Web3 代币经济和共享经济的概念。',
    developmentStatus: 'DePIN 是 2023-2024 年增长最快的赛道之一。存储领域 Filecoin、Arweave，计算领域 Render、Golem，地图领域 Hivemapper 等已具规模。Helium Mobile 进入移动网络领域。',
    representativeProjects: [
      { name: 'Filecoin', symbol: 'FIL', description: '去中心化存储网络，存储真实数据' },
      { name: 'Render', symbol: 'RNDR', description: 'GPU 渲染和 AI 计算网络' },
      { name: 'Helium', symbol: 'HNT', description: '去中心化无线网络，Helium Mobile 进入移动领域' },
      { name: 'Arweave', symbol: 'AR', description: '永久存储协议，一次付费永久存储' },
    ],
    trends: 'AI 驱动的计算需求增长，DePIN 设备销售增长，真实收入验证模式'
  },
  {
    id: 'liquid-staking',
    term: '流动性质押',
    aliases: ['Liquid Staking', 'LSD', '流动性质押衍生品'],
    category: 'DeFi',
    definition: '流动性质押解决了锁定质押资产流动性的问题。用户质押 ETH 后获得流动性质押凭证（如 stETH、rETH），该凭证可在 DeFi 中二次使用（如作为抵押品借贷），同时获得质押收益。',
    developmentStatus: 'LSD 是 Ethereum PoS 质押的核心基础设施。Lido 占据 30%+ ETH 质押份额。2023-2024 年 Lybra、Prisma 等 LSDfi 协议兴起，创造基于 stETH 的稳定币等创新产品。',
    representativeProjects: [
      { name: 'Lido', symbol: 'LDO', description: '流动性质押龙头，stETH 是最大的 LSD' },
      { name: 'Rocket Pool', symbol: 'RPL', description: '去中心化流动性质押，支持 16 ETH 节点' },
      { name: 'Frax Finance', symbol: 'FXS', description: '部分抵押稳定币，LSDfi 创新' },
    ],
    trends: 'LSDfi 生态扩张，再质押（Restaking）与 LSD 融合，流动性质押凭证跨链使用'
  },
  {
    id: 'yield',
    term: 'Yield Farming',
    aliases: ['收益农场', '流动性挖矿', 'Yield'],
    category: 'DeFi',
    definition: 'Yield Farming（收益农场/流动性挖矿）是用户通过向 DeFi 协议提供流动性或资产来获取收益的行为。收益来源包括：交易手续费分成、协议激励代币、借贷利息等。收益率通常以年化百分比（APY）表示。',
    developmentStatus: 'Yield Farming 模式已成熟，但高收益率时代已过。主流协议 APY 通常在 3-10% 区间。收益来源从纯代币激励转向真实手续费收入。稳定币借贷收益稳定，Memecoin 池收益波动大。',
    representativeProjects: [
      { name: 'Yearn Finance', symbol: 'YFI', description: '收益优化器，自动迁移资金到最高收益池' },
      { name: 'Beefy Finance', symbol: 'BIFI', description: '多链收益优化平台' },
      { name: 'Convex Finance', symbol: 'CVX', description: 'Curve 流动性池收益加速器' },
    ],
    trends: '真实收益（Real Yield）成为标准，再质押（Restaking）创造新收益源，收益来源多元化'
  },
  {
    id: 'dex',
    term: 'DEX',
    aliases: ['Decentralized Exchange', '去中心化交易所', 'Swap'],
    category: 'DeFi',
    definition: 'DEX（去中心化交易所）是无需中心化机构的数字资产交易平台。用户通过智能合约直接交易，资产托管在个人钱包。AMM（自动做市商）是主流模式，使用流动性池和算法定价。',
    developmentStatus: 'DEX 是 DeFi 最核心的应用。Uniswap 占据以太坊 DEX 主导地位，Curve 专注稳定币交易。Solana 上 Jupiter、Raydium 活跃。2024 年 DEX 交易量占比已达 CEX 的 10%+。',
    representativeProjects: [
      { name: 'Uniswap', symbol: 'UNI', description: '以太坊最大 DEX，V3 集中流动性创新' },
      { name: 'Curve', symbol: 'CRV', description: '稳定币和同类资产交易，低滑点' },
      { name: 'dYdX', symbol: 'DYDX', description: '去中心化永续合约交易所' },
      { name: 'Jupiter', symbol: 'JUP', description: 'Solana 生态聚合 DEX' },
    ],
    trends: 'Intent-based 交易（Across、UniswapX）简化用户体验，跨链 DEX 聚合发展'
  },
  {
    id: 'bridge',
    term: '跨链桥',
    aliases: ['Bridge', 'Cross-chain Bridge', '区块链桥'],
    category: '基础设施',
    definition: '跨链桥是连接不同区块链的协议，允许资产和数据在链之间转移。常见类型包括：锁定-铸造型（Lock-and-Mint）、销毁-铸造型（Burn-and-Mint）、原子交换等。跨链桥是 Web3 互操作性的关键基础设施。',
    developmentStatus: '跨链桥经历了多次安全事件（Ronin、Nomad 等损失数十亿美元）。安全性成为首要考量。LayerZero、Wormhole 等消息协议占据主导。2024 年电报机器人（Telegram Bot）集成的跨链交易增长迅速。',
    representativeProjects: [
      { name: 'LayerZero', symbol: 'ZRO', description: 'Omnichain 消息协议，连接多链' },
      { name: 'Wormhole', symbol: 'W', description: 'Guardian 验证的跨链消息协议' },
      { name: 'Stargate', symbol: 'STG', description: '基于 LayerZero 的跨链稳定币桥' },
      { name: 'Across', symbol: 'ACX', description: '意图驱动的跨链桥，滑点低' },
    ],
    trends: '意图（Intent）架构简化跨链体验，链抽象（Chain Abstraction）降低跨链门槛'
  },
  {
    id: 'modular',
    term: '模块化区块链',
    aliases: ['Modular Blockchain', 'Celestia'],
    category: '基础设施',
    definition: '模块化区块链是将区块链的三个核心功能（执行、共识、结算、数据可用性）分离设计的架构。不同于传统的单体区块链（Ethereum），模块化方案让各层专注做好一件事，通过组合实现灵活性。Celestia 是典型的数据可用性层。',
    developmentStatus: 'Celestia 于 2023 年主网上线引领模块化浪潮。Ethereum 通过 Danksharding 往模块化演进。Rollup-as-a-Service（RaaS）概念兴起，提供一键部署 Rollup 的服务。',
    representativeProjects: [
      { name: 'Celestia', symbol: 'TIA', description: '模块化数据可用性层，专注 DA 和共识' },
      { name: 'Ethereum', symbol: 'ETH', description: '向模块化演进的 Layer1，提供结算和共识' },
      { name: 'Fuel', symbol: 'FUEL', description: '模块化执行层，专注快速安全执行' },
    ],
    trends: 'RaaS（一键部署 Rollup）平台涌现，模块化执行层竞争加剧，DA 层多链格局形成'
  },
  {
    id: 'ordinals',
    term: 'Ordinals',
    aliases: ['BTC Ordinals', '比特币铭文', 'BRC-20'],
    category: '概念',
    definition: 'Ordinals 协议（序数协议）是 2023 年 1 月在比特币网络上推出的协议，通过巧妙的序号系统将任意内容（图片、文本、代码）刻入比特币 satoshis（sat，中本聪）中，创造比特币原生的 NFT。随之产生的 BRC-20 代币标准允许创建同质化代币。',
    developmentStatus: 'Ordinals 协议引爆了 2023 年比特币生态热潮。铭文铸造量快速突破 100 万。2024 年符文（Runes）协议上线，取代 BRC-20 成为更高效的比特币同质化代币标准。铭文生态涵盖 NFT、社交代币、游戏道具等。',
    representativeProjects: [
      { name: 'UniSat', symbol: 'SAT', description: 'BRC-20 浏览器和钱包，铭文市场' },
      { name: 'Ord.io', symbol: 'ORDI', description: 'Ordinals 铭文交易平台' },
      { name: 'Magic Eden', symbol: 'ME', description: '比特币 Ordinals NFT 市场' },
    ],
    trends: '符文（Runes）协议热度超越 BRC-20，矿工费用收益显著，Taproot 资产发行简化'
  },
  {
    id: 'institutional',
    term: '机构入场',
    aliases: ['Institutional Adoption', '机构投资者', 'ETF'],
    category: '概念',
    definition: '机构入场是指传统金融机构（银行、对冲基金、资产管理公司等）开始投资和参与加密货币市场。里程碑事件包括：CME 推出 BTC 期货、BlackRock 申请 BTC ETF、Payscale 等退休金账户投资加密等。',
    developmentStatus: '2024 年初美国批准 BTC 现货 ETF，BlackRock、Fidelity 等机构产品获批，带来数百亿美元资金流入。机构对比特币作为价值存储的认可度提升，以太坊 ETF 也在推进中。',
    representativeProjects: [
      { name: 'BlackRock', symbol: 'BLK', description: '全球最大资管，旗下 iShares BTC Trust 是最大 BTC ETF' },
      { name: 'Fidelity', symbol: 'FS', description: '推出 Fidelity Bitcoin ETF' },
      { name: 'MicroStrategy', symbol: 'MSTR', description: '持续买入 BTC 的上市公司典范' },
    ],
    trends: 'BTC ETF 持续净流入，ETH ETF 已获批，债券代币化产品探索中'
  }
]

export function searchConcepts(query: string): CryptoConcept[] {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return []
  
  return CRYPTO_CONCEPTS.filter(concept => {
    if (concept.term.toLowerCase().includes(lowerQuery)) return true
    if (concept.aliases.some(a => a.toLowerCase().includes(lowerQuery))) return true
    if (concept.category.toLowerCase().includes(lowerQuery)) return true
    if (concept.representativeProjects.some(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.symbol.toLowerCase().includes(lowerQuery)
    )) return true
    return false
  })
}
