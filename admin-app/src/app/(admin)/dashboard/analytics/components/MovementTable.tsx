import Link from 'next/link'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import UserAvatar from '@/investo/UserAvatar'
import { formatMoney, statusLabel, statusVariant, timeAgo } from '@/investo/format'
import type { DashboardData, DashboardMovement } from '../useDashboardData'

type MovementTableProps = {
  rows: DashboardMovement[]
  data: DashboardData
  emptyText: string
  viewAllHref: string
  onRefresh: () => void
}

// Shared by the Recent Deposits and Recent Withdrawals cards.
const MovementTable = ({ rows, data, emptyText, viewAllHref, onRefresh }: MovementTableProps) => {
  const customers = new Map(data.customers.map((c) => [c.id, c]))
  return (
    <>
      <div className="table-responsive browser_users">
        <table className="table mb-0">
          <thead className="table-light">
            <tr>
              <th className="border-top-0">Customer</th>
              <th className="border-top-0">Amount</th>
              <th className="border-top-0">Network</th>
              <th className="border-top-0">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const customer = customers.get(row.userId)
              const name = customer?.fullName || customer?.email || 'Unknown customer'
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/customers/${row.userId}`} className="d-flex align-items-center text-body">
                      <UserAvatar photoUrl={customer?.avatarUrl} avatarKey={customer?.avatarKey} name={name} className="thumb-sm me-2" />
                      <span>
                        {name}
                        <small className="d-block text-muted">{timeAgo(row.createdAt)}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    {formatMoney(row.amount)}
                    <small className="text-muted"> {row.currency}</small>
                  </td>
                  <td>{row.network ?? '-'}</td>
                  <td>
                    <span className={`badge bg-${statusVariant(row.status)}-subtle text-${statusVariant(row.status)}`}>{statusLabel(row.status)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-2 fs-12 fst-italic ps-2 text-muted d-flex align-items-center">
        Updated {timeAgo(data.loadedAt.toISOString())}
        <button type="button" onClick={onRefresh} className="btn btn-link link-danger p-0 ms-1" aria-label="Refresh">
          <IconifyIcon icon="iconoir:refresh" className="align-middle" />
        </button>
        <Link href={viewAllHref} className="ms-auto fst-normal">
          View all <IconifyIcon icon="fa6-solid:arrow-right-long" className="ms-1" />
        </Link>
      </p>
    </>
  )
}

export default MovementTable
