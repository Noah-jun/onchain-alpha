export const RESEARCH_DISCLAIMER =
  '研究辅助信息，不构成投资建议，不提供下单或自动交易。事实、推断与未知分开标注。不承诺任何收益。'

export function formatShanghai(iso: string | null | undefined): string {
  if (!iso) return '暂无时间'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '暂无时间'
  const text = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
  return `${text} CST`
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '暂无数据'
  const digits = Math.abs(value) >= 100 ? 2 : Math.abs(value) >= 1 ? 2 : 4
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })}`
}

export function formatAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '暂无数据'
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

export function formatFunding(ratePct: number): string {
  const sign = ratePct > 0 ? '+' : ''
  return `${sign}${ratePct.toFixed(4)}%`
}

export function modeLabel(mode: string): string {
  if (mode === 'live') return '实时'
  if (mode === 'demo') return '演示'
  if (mode === 'unconfigured') return '未配置'
  return mode
}

export function freshnessLabel(freshness: string): string {
  if (freshness === 'fresh') return '新鲜'
  if (freshness === 'stale') return '数据延迟'
  return '暂无数据'
}

export function observationLabel(value: string): string {
  if (value === 'onchain_observed') return '链上已观察到'
  if (value === 'exchange_confirmed') return '交易所已确认'
  if (value === 'exchange_print') return '交易所公开成交'
  return '归属不确定'
}

export function directionLabel(value: string): string {
  if (value === 'deposit') return '转入交易所方向'
  if (value === 'withdraw') return '转出交易所方向'
  if (value === 'transfer') return '地址间转移'
  if (value === 'buy') return '主动买入'
  if (value === 'sell') return '主动卖出'
  if (value === 'mint') return '铸造'
  if (value === 'burn') return '销毁'
  if (value === 'lock') return '锁定'
  if (value === 'unlock') return '解锁'
  return '方向未知'
}

export function volStatusLabel(status: string): string {
  return status === 'verified' ? '三项核对通过' : '待确认异常'
}
