'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import RecordList from '@/investo/RecordList'
import UserAvatar from '@/investo/UserAvatar'
import { lookupCustomers, type CustomerSummary } from '@/investo/customerLookup'
import { formatDateTime, formatMoney, statusLabel, statusVariant } from '@/investo/format'
import { supabase } from '@/investo/services'

export const metadata: Metadata = { title: 'Transactions' }

type Row = {
  id: string
  userId: string
  customer: CustomerSummary | null
  type: string
  amount: number
  balanceAfter: number
  status: string
  reference: string | null
  description: string | null
  simulated: boolean
  createdAt: string
}

const TYPES = ['deposit', 'withdrawal', 'investment', 'yield', 'bonus', 'referral', 'adjustment']

const columns: ColumnDef<Row>[] = [
  { header: 'Date', cell: ({ row: { original } }) => formatDateTime(original.createdAt) },
  {
    header: 'Customer',
    cell: ({ row: { original } }) => (
      <Link href={`/customers/${original.userId}`} className="d-flex align-items-center text-body">
        <UserAvatar photoUrl={original.customer?.avatarUrl} avatarKey={original.customer?.avatarKey} name={original.customer?.name} className="thumb-sm me-2" />
        {original.customer?.name ?? 'Unknown customer'}
      </Link>
    ),
  },
  {
    header: 'Type',
    cell: ({ row: { original } }) => (
      <>
        <span className="text-capitalize">{original.type}</span>
        {original.simulated && <span className="badge bg-secondary-subtle text-secondary ms-1">Simulated</span>}
      </>
    ),
  },
  {
    header: 'Description',
    cell: ({ row: { original } }) => (
      <>
        <span className="text-muted">{original.description ?? '-'}</span>
        {original.reference && <small className="d-block text-muted">{original.reference}</small>}
      </>
    ),
  },
  {
    header: 'Amount',
    cell: ({ row: { original } }) => (
      <span className={original.amount >= 0 ? 'text-success' : 'text-danger'}>
        {original.amount >= 0 ? '+' : '-'}
        {formatMoney(Math.abs(original.amount))}
      </span>
    ),
  },
  { header: 'Balance After', cell: ({ row: { original } }) => formatMoney(original.balanceAfter) },
  {
    header: 'Status',
    cell: ({ row: { original } }) => (
      <span className={`badge bg-${statusVariant(original.status)}-subtle text-${statusVariant(original.status)}`}>{statusLabel(original.status)}</span>
    ),
  },
]

type Raw = {
  id: string
  user_id: string
  type: string
  amount: number
  balance_after: number
  status: string
  reference: string | null
  description: string | null
  is_simulated: boolean | null
  created_at: string
}

// The full ledger (ported from the old admin Transactions page).
const Transactions = () => {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount, balance_after, status, reference, description, is_simulated, created_at')
        .order('created_at', { ascending: false })
        .limit(2000)
      if (error) return setError(error.message)
      const raw = (data ?? []) as Raw[]
      const customers = await lookupCustomers(raw.map((r) => r.user_id))
      setRows(
        raw.map((r) => ({
          id: r.id,
          userId: r.user_id,
          customer: customers.get(r.user_id) ?? null,
          type: r.type,
          amount: Number(r.amount),
          balanceAfter: Number(r.balance_after),
          status: r.status,
          reference: r.reference,
          description: r.description,
          simulated: Boolean(r.is_simulated),
          createdAt: r.created_at,
        }))
      )
    })()
  }, [])

  return (
    <RecordList<Row>
      title="Transactions"
      subtitle={(visible) => `${visible.length} shown (latest 2,000)`}
      rows={rows}
      error={error}
      columns={columns}
      tabs={[{ key: 'all', label: 'All', match: () => true }, ...TYPES.map((t) => ({ key: t, label: statusLabel(t), match: (r: Row) => r.type === t }))]}
      searchText={(r) => [r.customer?.name, r.customer?.email, r.reference, r.description, r.status]}
      searchPlaceholder="Search customer, reference or status"
    />
  )
}

export default Transactions
