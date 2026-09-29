'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import RecordList from '@/investo/RecordList'
import UserAvatar from '@/investo/UserAvatar'
import { lookupCustomers, type CustomerSummary } from '@/investo/customerLookup'
import { formatDate, formatMoney, statusLabel, statusVariant } from '@/investo/format'
import { supabase } from '@/investo/services'

export const metadata: Metadata = { title: 'Investments' }

type Row = {
  id: string
  userId: string
  customer: CustomerSummary | null
  planName: string
  amount: number
  rate: number
  rateType: string
  earnings: number
  status: string
  startedAt: string | null
  endsAt: string | null
}

const columns: ColumnDef<Row>[] = [
  {
    header: 'Customer',
    cell: ({ row: { original } }) => (
      <Link href={`/customers/${original.userId}`} className="d-flex align-items-center text-body">
        <UserAvatar photoUrl={original.customer?.avatarUrl} avatarKey={original.customer?.avatarKey} name={original.customer?.name} className="thumb-sm me-2" />
        {original.customer?.name ?? 'Unknown customer'}
      </Link>
    ),
  },
  { header: 'Plan', cell: ({ row: { original } }) => original.planName },
  { header: 'Amount', cell: ({ row: { original } }) => formatMoney(original.amount) },
  {
    header: 'Rate',
    cell: ({ row: { original } }) => (
      <>
        {original.rate}% <small className="text-muted">{original.rateType}</small>
      </>
    ),
  },
  { header: 'Earned', cell: ({ row: { original } }) => <span className="text-success">{formatMoney(original.earnings)}</span> },
  {
    header: 'Term',
    cell: ({ row: { original } }) => (
      <>
        {original.startedAt ? formatDate(original.startedAt) : '-'} <span className="text-muted">to</span> {original.endsAt ? formatDate(original.endsAt) : '-'}
      </>
    ),
  },
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
  amount: number
  rate: number
  rate_type: string
  current_earnings: number
  status: string
  started_at: string | null
  ends_at: string | null
  investment_plans: { name: string } | { name: string }[] | null
}

const Investments = () => {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('investments')
        .select('id, user_id, amount, rate, rate_type, current_earnings, status, started_at, ends_at, investment_plans(name)')
        .order('created_at', { ascending: false })
      if (error) return setError(error.message)
      const raw = (data ?? []) as Raw[]
      const customers = await lookupCustomers(raw.map((r) => r.user_id))
      setRows(
        raw.map((r) => ({
          id: r.id,
          userId: r.user_id,
          customer: customers.get(r.user_id) ?? null,
          planName: (Array.isArray(r.investment_plans) ? r.investment_plans[0]?.name : r.investment_plans?.name) ?? 'Plan',
          amount: Number(r.amount),
          rate: Number(r.rate),
          rateType: r.rate_type,
          earnings: Number(r.current_earnings),
          status: r.status,
          startedAt: r.started_at,
          endsAt: r.ends_at,
        }))
      )
    })()
  }, [])

  return (
    <RecordList<Row>
      title="Investments"
      subtitle={(visible) =>
        `${visible.length} shown · ${formatMoney(visible.reduce((t, r) => t + r.amount, 0))} invested · ${formatMoney(visible.reduce((t, r) => t + r.earnings, 0))} earned`
      }
      rows={rows}
      error={error}
      columns={columns}
      tabs={[
        { key: 'active', label: 'Active', match: (r) => r.status === 'active' },
        { key: 'all', label: 'All', match: () => true },
        { key: 'completed', label: 'Completed', match: (r) => r.status === 'completed' },
        { key: 'paused', label: 'Paused', match: (r) => r.status === 'paused' },
        { key: 'cancelled', label: 'Cancelled', match: (r) => r.status === 'cancelled' },
      ]}
      searchText={(r) => [r.customer?.name, r.customer?.email, r.planName]}
      searchPlaceholder="Search customer or plan"
    />
  )
}

export default Investments
