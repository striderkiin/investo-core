import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/investo/services'

export type DashboardPerson = {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  avatarKey: string | null
  createdAt: string
  country: string | null
  role: string
  totalBalance: number
  availableBalance: number
}

export type DashboardMovement = {
  id: string
  userId: string
  amount: number
  currency: string
  network: string | null
  status: string
  createdAt: string
}

export type DashboardData = {
  customers: DashboardPerson[]
  deposits: DashboardMovement[]
  withdrawals: DashboardMovement[]
  investments: { amount: number; status: string }[]
  kycStatuses: string[]
  openTickets: number
  loadedAt: Date
}

// Each source is fetched independently: an admin whose role can't read one
// table (row level security returns an error or nothing) still sees the rest.
const settle = async <T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
  try {
    const { data, error } = await query
    return error ? [] : (data ?? [])
  } catch {
    return []
  }
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  avatar_key: string | null
  created_at: string
  country: string | null
  role: string
  total_balance: number
  available_balance: number
}
type MovementRow = { id: string; user_id: string; amount: number; currency: string; network: string | null; status: string; created_at: string }

const toMovement = (row: MovementRow): DashboardMovement => ({
  id: row.id,
  userId: row.user_id,
  amount: Number(row.amount),
  currency: row.currency,
  network: row.network,
  status: row.status,
  createdAt: row.created_at,
})

const loadDashboard = async (): Promise<DashboardData> => {
  const [profiles, deposits, withdrawals, investments, kyc, tickets] = await Promise.all([
    settle<ProfileRow>(
      supabase.from('profiles').select('id, full_name, email, avatar_url, avatar_key, created_at, country, role, total_balance, available_balance').order('created_at', { ascending: false })
    ),
    settle<MovementRow>(
      supabase.from('deposits').select('id, user_id, amount, currency, network, status, created_at').order('created_at', { ascending: false })
    ),
    settle<MovementRow>(
      supabase.from('withdrawals').select('id, user_id, amount, currency, network, status, created_at').order('created_at', { ascending: false })
    ),
    settle<{ amount: number; status: string }>(supabase.from('investments').select('amount, status')),
    settle<{ status: string }>(supabase.from('kyc_submissions').select('status')),
    settle<{ id: string }>(supabase.from('support_tickets').select('id').in('status', ['open', 'in_progress', 'waiting'])),
  ])

  return {
    customers: profiles
      .filter((p) => p.role === 'client')
      .map((p) => ({
        id: p.id,
        fullName: p.full_name,
        email: p.email,
        avatarUrl: p.avatar_url,
        avatarKey: p.avatar_key,
        createdAt: p.created_at,
        country: p.country,
        role: p.role,
        totalBalance: Number(p.total_balance),
        availableBalance: Number(p.available_balance),
      })),
    deposits: deposits.map(toMovement),
    withdrawals: withdrawals.map(toMovement),
    investments: investments.map((i) => ({ amount: Number(i.amount), status: i.status })),
    kycStatuses: kyc.map((k) => k.status),
    openTickets: tickets.length,
    loadedAt: new Date(),
  }
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setData(await loadDashboard())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, refresh }
}

export const PENDING_DEPOSIT = ['pending', 'processing']
export const PENDING_WITHDRAWAL = ['pending', 'review', 'processing']

const DAY = 24 * 60 * 60 * 1000

export const sumAmount = (rows: { amount: number }[]) => rows.reduce((total, row) => total + row.amount, 0)

export const since = (iso: string, days: number) => Date.now() - new Date(iso).getTime() <= days * DAY

export type ChartRange = '7d' | '30d' | '12m'

export const RANGE_LABELS: Record<ChartRange, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '12m': 'Last 12 Months',
}

/** Buckets completed movements into days (7d/30d) or months (12m), oldest first. */
export const bucketByRange = (rows: DashboardMovement[], range: ChartRange) => {
  const now = new Date()
  const buckets: { label: string; start: Date; end: Date }[] = []
  if (range === '12m') {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      buckets.push({ label: start.toLocaleDateString(undefined, { month: 'short' }), start, end })
    }
  } else {
    const days = range === '7d' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
      buckets.push({ label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), start, end })
    }
  }
  const completed = rows.filter((row) => row.status === 'completed')
  return buckets.map(({ label, start, end }) => ({
    label,
    total: sumAmount(completed.filter((row) => new Date(row.createdAt) >= start && new Date(row.createdAt) < end)),
  }))
}
