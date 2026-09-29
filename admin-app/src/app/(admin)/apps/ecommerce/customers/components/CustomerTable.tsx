'use client'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import UserAvatar from '@/investo/UserAvatar'
import { accountStatus } from '@/investo/customers'
import { countryName, formatDate, formatMoney } from '@/investo/format'
import type { Profile } from '../../../../../../../../src/types/database'

const columns: ColumnDef<Profile>[] = [
  {
    id: 'customer',
    header: () => <div className="ps-0">Customer</div>,
    cell: ({
      row: {
        original: { fullName, email, avatarUrl, avatarKey, id },
      },
    }) => (
      <Link href={`/customers/${id}`} className="ps-0 text-body d-flex align-items-center">
        <UserAvatar photoUrl={avatarUrl} avatarKey={avatarKey} name={fullName || email} className="thumb-md me-2" />
        <p className="d-inline-block align-middle mb-0">
          <span className="font-13 fw-medium d-block">{fullName || 'No name'}</span>
          <span className="text-muted fs-12">{email}</span>
        </p>
      </Link>
    ),
  },
  {
    header: 'Country',
    cell: ({
      row: {
        original: { country },
      },
    }) => (country ? countryName(country) : <span className="text-muted">-</span>),
  },
  {
    header: 'Status',
    cell: ({
      row: {
        original: { accountStatus: status },
      },
    }) => {
      const { label, variant } = accountStatus(status)
      return <span className={`badge bg-${variant}-subtle text-${variant}`}>{label}</span>
    },
  },
  {
    header: 'Balance',
    cell: ({ row: { original } }) => formatMoney(original.totalBalance),
  },
  {
    header: 'Invested',
    cell: ({ row: { original } }) => formatMoney(original.investedBalance),
  },
  {
    header: 'Joined',
    cell: ({ row: { original } }) => formatDate(original.createdAt),
  },
  {
    id: 'action',
    header: () => <div className="text-end">Action</div>,
    cell: ({
      row: {
        original: { id },
      },
    }) => (
      <div className="text-end">
        <Link href={`/customers/${id}`} aria-label="Open customer">
          <IconifyIcon icon="la:eye" className="text-secondary fs-18" />
        </Link>
      </div>
    ),
  },
]

const CustomerTable = ({ customers }: { customers: Profile[] }) => {
  const pageSizeList = [10, 20, 50, 100]
  return (
    <ReactTable<Profile>
      columns={columns}
      data={customers}
      rowsPerPageList={pageSizeList}
      pageSize={20}
      tableClass="mb-0 text-nowrap"
      theadClass="table-light"
      showPagination
    />
  )
}

export default CustomerTable
