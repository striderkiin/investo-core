'use client'

import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import UserAvatar from '@/investo/UserAvatar'
import { formatDateTime, formatMoney, statusLabel, statusVariant } from '@/investo/format'
import { MONEY, type MoneyRecord } from '@/investo/money'

const shortAddress = (address: string | null) => (address && address.length > 16 ? `${address.slice(0, 6)}…${address.slice(-6)}` : (address ?? '-'))

const columns: ColumnDef<MoneyRecord>[] = [
  {
    header: 'Reference',
    cell: ({ row: { original } }) => (
      <Link href={`${MONEY[original.kind].path}/${original.id}`} className="fw-medium">
        #{original.id.slice(0, 8).toUpperCase()}
      </Link>
    ),
  },
  {
    header: 'Customer',
    cell: ({
      row: {
        original: { customer, userId },
      },
    }) => {
      const name = customer?.fullName || customer?.email || 'Unknown customer'
      return (
        <Link href={`/customers/${userId}`} className="d-flex align-items-center text-body">
          <UserAvatar photoUrl={customer?.avatarUrl} avatarKey={customer?.avatarKey} name={name} className="thumb-sm me-2" />
          <p className="d-inline-block align-middle mb-0">
            <span className="d-block align-middle mb-0 text-body">{name}</span>
            {customer?.fullName && <span className="text-muted font-13">{customer.email}</span>}
          </p>
        </Link>
      )
    },
  },
  {
    header: 'Date',
    cell: ({ row: { original } }) => <>{formatDateTime(original.createdAt)}</>,
  },
  {
    header: 'Network',
    cell: ({ row: { original } }) => (
      <>
        {original.currency} <span className="text-muted">{original.network ?? ''}</span>
        <small className="d-block text-muted">
          <code>{shortAddress(original.address)}</code>
        </small>
      </>
    ),
  },
  {
    header: 'Status',
    cell: ({
      row: {
        original: { status },
      },
    }) => <span className={`badge bg-${statusVariant(status)}-subtle text-${statusVariant(status)}`}>{statusLabel(status)}</span>,
  },
  {
    header: 'Amount',
    cell: ({ row: { original } }) => (
      <>
        {formatMoney(original.amount)}
        {original.fee > 0 && <small className="d-block text-muted">fee {formatMoney(original.fee)}</small>}
      </>
    ),
  },

  {
    id: 'action',
    header: () => <div className="text-end">Action</div>,
    cell: ({ row: { original } }) => (
      <div className="text-end w-100">
        <Link href={`${MONEY[original.kind].path}/${original.id}`} aria-label="Open">
          <IconifyIcon icon="la:eye" className="text-secondary fs-18" />
        </Link>
      </div>
    ),
  },
]

const OrdersTable = ({ orders }: { orders: MoneyRecord[] }) => {
  const pageSizeList = [10, 20, 50, 100]

  return (
    <ReactTable<MoneyRecord>
      columns={columns}
      data={orders}
      rowsPerPageList={pageSizeList}
      pageSize={20}
      tableClass="mb-0 text-nowrap"
      theadClass="table-light"
      showPagination
    />
  )
}

export default OrdersTable
