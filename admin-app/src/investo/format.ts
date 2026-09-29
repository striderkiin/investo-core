const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })

export const formatMoney = (value: number) => usd.format(value)

/** Market prices: cents for normal prices, significant digits for sub-dollar coins (e.g. $0.00001234). */
export { formatUsdPrice as formatPrice } from '../../../src/shared/price'

/** $5K style labels for chart axes. */
export const formatMoneyAxis = (value: number) => usdCompact.format(value)

/** $12.5K style for tight stat tiles. Values under $10,000 stay exact. */
export const formatMoneyShort = (value: number) => (Math.abs(value) >= 10000 ? usdCompact.format(value) : usd.format(value))

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const timeAgo = (iso: string) => {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days < 30 ? `${days}d ago` : formatDate(iso)
}

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

export const countryName = (code: string) => {
  try {
    return regionNames?.of(code) ?? code
  } catch {
    return code
  }
}

/** Bootstrap colour for a deposit/withdrawal/KYC/ticket status badge. */
export const statusVariant = (status: string) => {
  switch (status) {
    case 'completed':
    case 'approved':
    case 'active':
    case 'resolved':
      return 'success'
    case 'pending':
    case 'review':
    case 'waiting':
    case 'open':
      return 'warning'
    case 'processing':
    case 'in_progress':
      return 'info'
    case 'failed':
    case 'rejected':
    case 'cancelled':
      return 'danger'
    default:
      return 'secondary'
  }
}

export const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
