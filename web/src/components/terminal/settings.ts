export interface ClientSettings {
  perpSymbol: string
  watchlist: string[]
  refreshSeconds: number
}

export const SETTINGS_KEY = 'onchain-alpha.research.settings.v1'

export const DEFAULT_SETTINGS: ClientSettings = {
  perpSymbol: 'CLUSDT',
  watchlist: ['BTC', 'ETH', 'QQQ', 'SPX', 'CL', 'CLUSDT'],
  refreshSeconds: 60,
}

export function readSettings(): ClientSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<ClientSettings>
    const perpSymbol = String(parsed.perpSymbol || DEFAULT_SETTINGS.perpSymbol).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    const watchlist = Array.isArray(parsed.watchlist)
      ? parsed.watchlist.map((item) => String(item).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)).filter(Boolean)
      : DEFAULT_SETTINGS.watchlist
    const refreshSeconds = [30, 60, 120, 300].includes(Number(parsed.refreshSeconds)) ? Number(parsed.refreshSeconds) : 60
    return { perpSymbol: perpSymbol || 'CLUSDT', watchlist, refreshSeconds }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(settings: ClientSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
