import { useCallback, useEffect, useState } from 'react'

import { supabase, userService } from '@/investo/services'
import type { Profile } from '../../../../../../../../src/types/database'

export type LedgerRow = { id: string; type: string; amount: number; balanceAfter: number; status: string; description: string | null; createdAt: string }
export type MovementRow = {
  id: string
  amount: number
  currency: string
  network: string | null
  status: string
  address: string | null
  createdAt: string
}
export type InvestmentRow = {
  id: string
  planName: string
  amount: number
  rate: number
  rateType: string
  status: string
  earnings: number
  startedAt: string | null
  endsAt: string | null
}
export type KycRow = { status: string; legalName: string; createdAt: string; reviewNotes: string | null }

export type CustomerDetail = {
  profile: Profile
  ledger: LedgerRow[]
  deposits: MovementRow[]
  withdrawals: MovementRow[]
  investments: InvestmentRow[]
  kyc: KycRow | null
  referredBy: Profile | null
  referralCount: number
}

// Rows a role isn't allowed to read come back empty rather than failing the page.
const rows = async <T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
  try {
    const { data, error } = await query
    return error ? [] : (data ?? [])
  } catch {
    return []
  }
}

type RawLedger = { id: string; type: string; amount: number; balance_after: number; status: string; description: string | null; created_at: string }
type RawDeposit = { id: string; amount: number; currency: string; network: string | null; status: string; destination_address: string | null; created_at: string }
type RawWithdrawal = { id: string; amount: number; currency: string; network: string | null; status: string; destination: string | null; created_at: string }
type RawInvestment = {
  id: string
  amount: number
  rate: number
  rate_type: string
  status: string
  current_earnings: number
  started_at: string | null
  ends_at: string | null
  // PostgREST embeds a to-one relation as an object; the untyped client types it as an array.
  investment_plans: { name: string } | { name: string }[] | null
}
type RawKyc = { status: string; legal_full_name: string; created_at: string; review_notes: string | null }

export const loadCustomer = async (customerId: string): Promise<CustomerDetail | null> => {
  const profile = await userService.getById(customerId)
  if (!profile) return null

  const [ledger, deposits, withdrawals, investments, kyc, referrals, referredBy] = await Promise.all([
    rows<RawLedger>(
      supabase.from('transactions').select('id, type, amount, balance_after, status, description, created_at').eq('user_id', customerId).order('created_at', { ascending: false })
    ),
    rows<RawDeposit>(
      supabase.from('deposits').select('id, amount, currency, network, status, destination_address, created_at').eq('user_id', customerId).order('created_at', { ascending: false })
    ),
    rows<RawWithdrawal>(
      supabase.from('withdrawals').select('id, amount, currency, network, status, destination, created_at').eq('user_id', customerId).order('created_at', { ascending: false })
    ),
    rows<RawInvestment>(
      supabase
        .from('investments')
        .select('id, amount, rate, rate_type, status, current_earnings, started_at, ends_at, investment_plans(name)')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
    ),
    rows<RawKyc>(
      supabase.from('kyc_submissions').select('status, legal_full_name, created_at, review_notes').eq('user_id', customerId).order('created_at', { ascending: false }).limit(1)
    ),
    rows<{ id: string }>(supabase.from('profiles').select('id').eq('referred_by', customerId)),
    profile.referredBy ? userService.getById(profile.referredBy).catch(() => null) : Promise.resolve(null),
  ])

  return {
    profile,
    ledger: ledger.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balance_after),
      status: t.status,
      description: t.description,
      createdAt: t.created_at,
    })),
    deposits: deposits.map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      currency: d.currency,
      network: d.network,
      status: d.status,
      address: d.destination_address,
      createdAt: d.created_at,
    })),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      currency: w.currency,
      network: w.network,
      status: w.status,
      address: w.destination,
      createdAt: w.created_at,
    })),
    investments: investments.map((i) => ({
      id: i.id,
      planName: (Array.isArray(i.investment_plans) ? i.investment_plans[0]?.name : i.investment_plans?.name) ?? 'Plan',
      amount: Number(i.amount),
      rate: Number(i.rate),
      rateType: i.rate_type,
      status: i.status,
      earnings: Number(i.current_earnings),
      startedAt: i.started_at,
      endsAt: i.ends_at,
    })),
    kyc: kyc[0] ? { status: kyc[0].status, legalName: kyc[0].legal_full_name, createdAt: kyc[0].created_at, reviewNotes: kyc[0].review_notes } : null,
    referredBy,
    referralCount: referrals.length,
  }
}

export const useCustomer = (customerId: string) => {
  const [detail, setDetail] = useState<CustomerDetail | null | undefined>(undefined)

  const refresh = useCallback(async () => {
    setDetail(await loadCustomer(customerId))
  }, [customerId])

  useEffect(() => {
    setDetail(undefined)
    refresh().catch(() => setDetail(null))
  }, [refresh])

  return { detail, refresh }
}
