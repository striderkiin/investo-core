import { invokeFunction } from '@/investo/functions'
import { supabase } from '@/investo/services'
import type { WithdrawalReviewAction } from '../../../src/services/api/withdrawalService'

export type MoneyKind = 'deposit' | 'withdrawal'

export type MoneyCustomer = { id: string; fullName: string | null; email: string; avatarUrl: string | null; avatarKey: string | null; country: string | null }

export type MoneyRecord = {
  id: string
  kind: MoneyKind
  userId: string
  customer: MoneyCustomer | null
  amount: number
  fee: number
  currency: string
  network: string | null
  status: string
  /** Deposit: the wallet the customer paid to. Withdrawal: the customer's wallet to pay out to. */
  address: string | null
  provider: string | null
  reference: string | null
  txHash: string | null
  confirmations: number
  requiredConfirmations: number | null
  notes: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  /** Withdrawals sent through PayRam: its payout status (QUEUED, SENT, FAILED, ...) and any error. */
  payoutProvider: string | null
  payoutStatus: string | null
  payoutError: string | null
}

export const MONEY = {
  deposit: {
    table: 'deposits',
    title: 'Deposits',
    singular: 'Deposit',
    path: '/deposits',
    statuses: ['pending', 'processing', 'completed', 'failed', 'rejected'],
    open: ['pending', 'processing'],
  },
  withdrawal: {
    table: 'withdrawals',
    title: 'Withdrawals',
    singular: 'Withdrawal',
    path: '/withdrawals',
    statuses: ['pending', 'review', 'processing', 'completed', 'rejected', 'failed'],
    open: ['pending', 'review', 'processing'],
  },
} as const

type Row = Record<string, unknown>

const str = (value: unknown) => (typeof value === 'string' && value ? value : null)

const toRecord = (kind: MoneyKind, row: Row, customers: Map<string, MoneyCustomer>): MoneyRecord => ({
  id: String(row.id),
  kind,
  userId: String(row.user_id),
  customer: customers.get(String(row.user_id)) ?? null,
  amount: Number(row.amount),
  fee: Number(row.fee ?? 0),
  currency: String(row.currency),
  network: str(row.network),
  status: String(row.status),
  address: kind === 'deposit' ? str(row.destination_address) : str(row.destination),
  provider: str(row.provider),
  reference: str(row.provider_reference),
  txHash: str(row.tx_hash),
  confirmations: Number(row.confirmations ?? 0),
  requiredConfirmations: row.required_confirmations == null ? null : Number(row.required_confirmations),
  notes: kind === 'deposit' ? str(row.admin_notes) : str(row.notes),
  reviewedAt: str(row.reviewed_at),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at ?? row.created_at),
  payoutProvider: str(row.payout_provider),
  payoutStatus: str(row.payout_status),
  payoutError: str(row.payout_error),
})

const loadCustomers = async (ids: string[]): Promise<Map<string, MoneyCustomer>> => {
  const unique = [...new Set(ids)]
  if (!unique.length) return new Map()
  const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url, avatar_key, country').in('id', unique)
  return new Map(
    (data ?? []).map((p: Row) => [
      String(p.id),
      { id: String(p.id), fullName: str(p.full_name), email: String(p.email), avatarUrl: str(p.avatar_url), avatarKey: str(p.avatar_key), country: str(p.country) },
    ])
  )
}

export const listMoney = async (kind: MoneyKind): Promise<MoneyRecord[]> => {
  const { data, error } = await supabase.from(MONEY[kind].table).select('*').order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as Row[]
  const customers = await loadCustomers(rows.map((r) => String(r.user_id)))
  return rows.map((row) => toRecord(kind, row, customers))
}

export const getMoney = async (kind: MoneyKind, id: string): Promise<MoneyRecord | null> => {
  const { data, error } = await supabase.from(MONEY[kind].table).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const customers = await loadCustomers([String((data as Row).user_id)])
  return toRecord(kind, data as Row, customers)
}

/** Confirm credits the customer's available balance; both actions notify the customer and are audit-logged. */
export const reviewDeposit = async (id: string, action: 'confirm' | 'reject', notes?: string, txHash?: string) => {
  const { error } = await supabase.rpc('admin_review_deposit', { p_deposit_id: id, p_action: action, p_notes: notes || null, p_tx_hash: txHash || null })
  if (error) throw error
}

export const reviewWithdrawal = async (id: string, action: WithdrawalReviewAction, notes?: string) => {
  const { error } = await supabase.rpc('review_withdrawal', { p_withdrawal_id: id, p_action: action, p_notes: notes || null })
  if (error) throw error
}

/** Approves (if still pending) and sends a USDT withdrawal through PayRam, or re-reads its payout status. */
export const payramPayout = (id: string, action: 'send' | 'refresh') =>
  invokeFunction<{ ok: boolean; status?: string; message: string }>('payram-payout', { withdrawalId: id, action })

export const setWithdrawalTxHash = async (id: string, txHash: string) => {
  const { error } = await supabase.rpc('set_withdrawal_tx_hash', { p_withdrawal_id: id, p_tx_hash: txHash })
  if (error) throw error
}

// Block explorer link for a transaction hash, by network name.
export const explorerUrl = (network: string | null, txHash: string | null) => {
  if (!network || !txHash) return null
  const n = network.toLowerCase()
  if (n.includes('trc') || n.includes('tron')) return `https://tronscan.org/#/transaction/${txHash}`
  if (n.includes('bep') || n.includes('bsc') || n.includes('bnb')) return `https://bscscan.com/tx/${txHash}`
  if (n.includes('polygon') || n.includes('matic')) return `https://polygonscan.com/tx/${txHash}`
  if (n.includes('sol')) return `https://solscan.io/tx/${txHash}`
  if (n.includes('erc') || n.includes('eth')) return `https://etherscan.io/tx/${txHash}`
  if (n.includes('btc') || n.includes('bitcoin')) return `https://mempool.space/tx/${txHash}`
  if (n.includes('ltc') || n.includes('litecoin')) return `https://blockchair.com/litecoin/transaction/${txHash}`
  return null
}

// Typical confirmations exchanges wait for, used when a provider hasn't said.
export const defaultConfirmations = (network: string | null) => {
  const n = (network ?? '').toLowerCase()
  if (n.includes('btc') || n.includes('bitcoin')) return 2
  if (n.includes('erc') || n.includes('eth')) return 12
  if (n.includes('trc') || n.includes('tron')) return 19
  if (n.includes('bep') || n.includes('bsc')) return 15
  if (n.includes('polygon')) return 128
  if (n.includes('sol')) return 32
  return 6
}
