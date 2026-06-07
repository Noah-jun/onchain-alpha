#!/usr/bin/env npx ts-node
/**
 * Uniswap V4 Position Event Sync
 * 
 * 扫描链上事件，记录持仓变动历史：
 * - IncreaseLiquidity / DecreaseLiquidity（NFPM 合约）
 * - Transfer（NFT 转入/转出）
 * 
 * 数据存储：data/v4-position-events.json
 * 通知：Telegram（通过 OpenClaw）
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// ============ 配置 ============

const CHAIN = 'base'
const CHAIN_ID = 8453

// NFPM (Non-Fungible Position Manager) V4
const NFPM_ADDRESS = '0x74dE920C6a266A1e5dD8C1a41a3c4C600741B3b5'

// PoolManager V4
const POOL_MANAGER_ADDRESS = '0x49854A842013F0d2C4bC3F11c2C17A455C2bA8a3'

// RPC endpoint (通过代理访问 Base 公共 RPC)
const RPC_URL = 'https://mainnet.base.org'

// 已知的持仓 tokenId（从 tokenURI 获取）
const KNOWN_TOKEN_IDS = [285655, 300896, 302211, 303955, 304033]

// 数据文件
const DATA_DIR = path.join(process.cwd(), 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'v4-position-events.json')
const STATE_FILE = path.join(DATA_DIR, 'v4-sync-state.json')

// 扫描范围（最近 N 个区块）
const SCAN_RANGE = 5000

// ============ 工具函数 ============

function curlPost(url: string, body: any): any {
  const json = JSON.stringify(body)
  const text = execSync(
    `curl -s --max-time 15 --connect-timeout 5 ` +
    `-X POST ` +
    `-H "Content-Type: application/json" ` +
    `--proxy http://127.0.0.1:7897 ` +
    `-d '${json.replace(/'/g, "'\\''")}' ` +
    `"${url}"`,
    { timeout: 20000, encoding: 'utf-8' }
  )
  return JSON.parse(text)
}

function rpcCall(method: string, params: any[]): any {
  return curlPost(RPC_URL, {
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  })
}

function getBlockNumber(): number {
  const res = rpcCall('eth_blockNumber', [])
  return parseInt(res.result, 16)
}

function getLogs(fromBlock: number, toBlock: number, address: string, topics: string[]): any[] {
  const res = rpcCall('eth_getLogs', [
    {
      fromBlock: '0x' + fromBlock.toString(16),
      toBlock: '0x' + toBlock.toString(16),
      address,
      topics,
    },
  ])
  return res.result || []
}

// ============ 事件签名 ============

// IncreaseLiquidity(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount0, uint256 amount1)
// topic0 = keccak256("IncreaseLiquidity(uint256,uint128,uint256,uint256)")
const INCREASE_LIQUIDITY_TOPIC = '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde'

// DecreaseLiquidity(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
// topic0 = keccak256("DecreaseLiquidity(uint256,uint128,uint256,uint256)")
const DECREASE_LIQUIDITY_TOPIC = '0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4'

// Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// ============ 状态管理 ============

interface SyncState {
  lastSyncBlock: number
  lastSyncTime: string
}

interface PositionEvent {
  id: string
  tokenId: number
  type: 'increase' | 'decrease' | 'transfer_in' | 'transfer_out'
  blockNumber: number
  txHash: string
  timestamp: string
  amount0?: string
  amount1?: string
  liquidity?: string
  from?: string
  to?: string
}

interface EventsData {
  events: PositionEvent[]
  lastUpdated: string
}

function loadState(): SyncState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    }
  } catch {}
  return { lastSyncBlock: 0, lastSyncTime: '' }
}

function saveState(state: SyncState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function loadEvents(): EventsData {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))
    }
  } catch {}
  return { events: [], lastUpdated: '' }
}

function saveEvents(data: EventsData) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2))
}

// ============ 事件解析 ============

function decodeIncreaseLiquidity(log: any): Partial<PositionEvent> {
  // topics[1] = tokenId (indexed)
  const tokenId = parseInt(log.topics[1], 16)
  // data = abi.encode(uint128 liquidity, uint256 amount0, uint256 amount1)
  const data = log.data
  const liquidity = BigInt('0x' + data.slice(2, 66)).toString()
  const amount0 = BigInt('0x' + data.slice(66, 130)).toString()
  const amount1 = BigInt('0x' + data.slice(130, 194)).toString()
  
  return { tokenId, type: 'increase', liquidity, amount0, amount1 }
}

function decodeDecreaseLiquidity(log: any): Partial<PositionEvent> {
  const tokenId = parseInt(log.topics[1], 16)
  const data = log.data
  const liquidity = BigInt('0x' + data.slice(2, 66)).toString()
  const amount0 = BigInt('0x' + data.slice(66, 130)).toString()
  const amount1 = BigInt('0x' + data.slice(130, 194)).toString()
  
  return { tokenId, type: 'decrease', liquidity, amount0, amount1 }
}

function decodeTransfer(log: any): Partial<PositionEvent> {
  const from = '0x' + log.topics[1].slice(26)
  const to = '0x' + log.topics[2].slice(26)
  const tokenId = parseInt(log.topics[3], 16)
  
  return { tokenId, from, to }
}

// ============ 主逻辑 ============

async function sync() {
  console.log('🔄 开始同步 V4 持仓事件...')
  
  const state = loadState()
  const eventsData = loadEvents()
  
  // 获取当前区块
  const currentBlock = getBlockNumber()
  console.log(`📦 当前区块: ${currentBlock}`)
  
  // 确定扫描起点
  // 首次运行从 20,000,000 开始（Base 链早期），后续增量扫描
  let fromBlock = state.lastSyncBlock || 20000000
  if (fromBlock >= currentBlock) {
    console.log('✅ 已是最新，无需同步')
    return
  }
  
  const toBlock = Math.min(currentBlock, fromBlock + SCAN_RANGE)
  console.log(`🔍 扫描区块范围: ${fromBlock} → ${toBlock}`)
  
  const newEvents: PositionEvent[] = []
  const tokenSet = new Set(KNOWN_TOKEN_IDS.map(id => '0x' + id.toString(16).padStart(64, '0')))
  
  // 1. 扫描 IncreaseLiquidity 事件
  try {
    const increaseLogs = getLogs(fromBlock, toBlock, NFPM_ADDRESS, [INCREASE_LIQUIDITY_TOPIC])
    console.log(`📈 IncreaseLiquidity 事件: ${increaseLogs.length} 个`)
    
    for (const log of increaseLogs) {
      const decoded = decodeIncreaseLiquidity(log)
      if (decoded.tokenId && tokenSet.has(log.topics[1])) {
        // 获取区块时间戳
        const blockRes = rpcCall('eth_getBlockByNumber', ['0x' + log.blockNumber.toString(16), false])
        const timestamp = parseInt(blockRes.result.timestamp, 16)
        
        newEvents.push({
          id: `inc-${log.transactionHash}-${log.logIndex}`,
          tokenId: decoded.tokenId,
          type: 'increase',
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          timestamp: new Date(timestamp * 1000).toISOString(),
          amount0: decoded.amount0,
          amount1: decoded.amount1,
          liquidity: decoded.liquidity,
        })
      }
    }
  } catch (e: any) {
    console.error('⚠️ 扫描 IncreaseLiquidity 失败:', e.message)
  }
  
  // 2. 扫描 DecreaseLiquidity 事件
  try {
    const decreaseLogs = getLogs(fromBlock, toBlock, NFPM_ADDRESS, [DECREASE_LIQUIDITY_TOPIC])
    console.log(`📉 DecreaseLiquidity 事件: ${decreaseLogs.length} 个`)
    
    for (const log of decreaseLogs) {
      const decoded = decodeDecreaseLiquidity(log)
      if (decoded.tokenId && tokenSet.has(log.topics[1])) {
        const blockRes = rpcCall('eth_getBlockByNumber', ['0x' + log.blockNumber.toString(16), false])
        const timestamp = parseInt(blockRes.result.timestamp, 16)
        
        newEvents.push({
          id: `dec-${log.transactionHash}-${log.logIndex}`,
          tokenId: decoded.tokenId,
          type: 'decrease',
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          timestamp: new Date(timestamp * 1000).toISOString(),
          amount0: decoded.amount0,
          amount1: decoded.amount1,
          liquidity: decoded.liquidity,
        })
      }
    }
  } catch (e: any) {
    console.error('⚠️ 扫描 DecreaseLiquidity 失败:', e.message)
  }
  
  // 3. 扫描 Transfer 事件
  try {
    // Transfer 有 3 个 indexed 参数，只用 topic0 过滤，后处理匹配 tokenId
    const transferLogs = getLogs(fromBlock, toBlock, NFPM_ADDRESS, [TRANSFER_TOPIC])
    console.log(`🔄 Transfer 事件: ${transferLogs.length} 个`)
    
    for (const log of transferLogs) {
      // Transfer 事件有 3 个 indexed: from, to, tokenId
      // tokenId 在 topics[3]
      if (log.topics.length >= 4) {
        const tokenIdHex = log.topics[3]
        const tokenId = parseInt(tokenIdHex, 16)
        if (tokenSet.has(tokenIdHex)) {
          const decoded = decodeTransfer(log)
          const blockRes = rpcCall('eth_getBlockByNumber', ['0x' + log.blockNumber.toString(16), false])
          const timestamp = parseInt(blockRes.result.timestamp, 16)
          
          const isTransferIn = decoded.to?.toLowerCase() !== '0x0000000000000000000000000000000000000000'
          
          newEvents.push({
            id: `tx-${log.transactionHash}-${log.logIndex}`,
            tokenId,
            type: isTransferIn ? 'transfer_in' : 'transfer_out',
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            timestamp: new Date(timestamp * 1000).toISOString(),
            from: decoded.from,
            to: decoded.to,
          })
        }
      }
    }
  } catch (e: any) {
    console.error('⚠️ 扫描 Transfer 失败:', e.message)
  }
  
  // 去重
  const existingIds = new Set(eventsData.events.map(e => e.id))
  const uniqueNew = newEvents.filter(e => !existingIds.has(e.id))
  
  if (uniqueNew.length > 0) {
    console.log(`✨ 新增 ${uniqueNew.length} 个事件`)
    eventsData.events.push(...uniqueNew)
    eventsData.events.sort((a, b) => b.blockNumber - a.blockNumber)
    eventsData.lastUpdated = new Date().toISOString()
    saveEvents(eventsData)
    
    // 生成通知摘要
    const summary = generateSummary(uniqueNew)
    console.log('\n' + summary)
  } else {
    console.log('✅ 无新事件')
  }
  
  // 更新状态
  state.lastSyncBlock = toBlock
  state.lastSyncTime = new Date().toISOString()
  saveState(state)
  
  console.log(`\n📊 同步完成，共 ${eventsData.events.length} 个事件`)
}

function generateSummary(events: PositionEvent[]): string {
  const lines: string[] = ['🔔 **V4 持仓变动通知**\n']
  
  for (const e of events) {
    const time = new Date(e.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    
    if (e.type === 'increase') {
      lines.push(`📈 **#${e.tokenId} 增加流动性**`)
      lines.push(`   时间: ${time}`)
      lines.push(`   Amount0: ${e.amount0}`)
      lines.push(`   Amount1: ${e.amount1}`)
      lines.push(`   流动性变化: ${e.liquidity}`)
    } else if (e.type === 'decrease') {
      lines.push(`📉 **#${e.tokenId} 移除流动性**`)
      lines.push(`   时间: ${time}`)
      lines.push(`   Amount0: ${e.amount0}`)
      lines.push(`   Amount1: ${e.amount1}`)
      lines.push(`   流动性变化: -${e.liquidity}`)
    } else if (e.type === 'transfer_in') {
      lines.push(`🔄 **#${e.tokenId} 转入**`)
      lines.push(`   时间: ${time}`)
    } else if (e.type === 'transfer_out') {
      lines.push(`🔄 **#${e.tokenId} 转出**`)
      lines.push(`   时间: ${time}`)
    }
    
    lines.push(`   TX: https://basescan.org/tx/${e.txHash}`)
    lines.push('')
  }
  
  return lines.join('\n')
}

// 执行
sync().catch(e => {
  console.error('❌ 同步失败:', e)
  process.exit(1)
})
