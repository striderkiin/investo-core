import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Nav, NavItem, NavLink, Row } from 'react-bootstrap'
import { formatDate, formatDateTime, formatMoney, statusLabel, statusVariant } from '@/investo/format'
import type { CustomerDetail, MovementRow } from '../useCustomer'

type Tab = 'ledger' | 'deposits' | 'withdrawals' | 'investments'

const Badge = ({ status }: { status: string }) => (
  <span className={`badge bg-${statusVariant(status)}-subtle text-${statusVariant(status)}`}>{statusLabel(status)}</span>
)

const Empty = ({ columns, text }: { columns: number; text: string }) => (
  <tr>
    <td colSpan={columns} className="text-center text-muted py-4">
      {text}
    </td>
  </tr>
)

const shortAddress = (address: string | null) => (address && address.length > 18 ? `${address.slice(0, 8)}…${address.slice(-6)}` : (address ?? '-'))

const MovementTable = ({ rows, addressLabel, empty }: { rows: MovementRow[]; addressLabel: string; empty: string }) => (
  <table className="table mb-0">
    <thead className="table-light">
      <tr>
        <th>Date</th>
        <th>Amount</th>
        <th>Network</th>
        <th>{addressLabel}</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {rows.length === 0 && <Empty columns={5} text={empty} />}
      {rows.map((row) => (
        <tr key={row.id}>
          <td>{formatDateTime(row.createdAt)}</td>
          <td>
            {formatMoney(row.amount)} <small className="text-muted">{row.currency}</small>
          </td>
          <td>{row.network ?? '-'}</td>
          <td>
            <code title={row.address ?? undefined}>{shortAddress(row.address)}</code>
          </td>
          <td>
            <Badge status={row.status} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)

// Customer activity, one tab per record type.
const Orders = ({ detail }: { detail: CustomerDetail }) => {
  const [tab, setTab] = useState<Tab>('ledger')
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'ledger', label: 'Transactions', count: detail.ledger.length },
    { key: 'deposits', label: 'Deposits', count: detail.deposits.length },
    { key: 'withdrawals', label: 'Withdrawals', count: detail.withdrawals.length },
    { key: 'investments', label: 'Investments', count: detail.investments.length },
  ]

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Activity</CardTitle>
          </Col>
          <Col xs="auto">
            <Nav variant="pills" className="nav-pills-sm" activeKey={tab} onSelect={(key) => key && setTab(key as Tab)}>
              {tabs.map((t) => (
                <NavItem key={t.key}>
                  <NavLink eventKey={t.key} className="py-1 px-2">
                    {t.label} <span className="badge bg-light text-dark ms-1">{t.count}</span>
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive">
          {tab === 'ledger' && (
            <table className="table mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.ledger.length === 0 && <Empty columns={6} text="No transactions yet." />}
                {detail.ledger.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDateTime(tx.createdAt)}</td>
                    <td className="text-capitalize">{tx.type}</td>
                    <td className="text-muted">{tx.description ?? '-'}</td>
                    <td className={tx.amount >= 0 ? 'text-success' : 'text-danger'}>
                      {tx.amount >= 0 ? '+' : '-'}
                      {formatMoney(Math.abs(tx.amount))}
                    </td>
                    <td>{formatMoney(tx.balanceAfter)}</td>
                    <td>
                      <Badge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'deposits' && <MovementTable rows={detail.deposits} addressLabel="Paid To" empty="No deposits yet." />}
          {tab === 'withdrawals' && <MovementTable rows={detail.withdrawals} addressLabel="Sent To" empty="No withdrawals yet." />}
          {tab === 'investments' && (
            <table className="table mb-0">
              <thead className="table-light">
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Rate</th>
                  <th>Earned</th>
                  <th>Started</th>
                  <th>Ends</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.investments.length === 0 && <Empty columns={7} text="No investments yet." />}
                {detail.investments.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.planName}</td>
                    <td>{formatMoney(inv.amount)}</td>
                    <td>
                      {inv.rate}% <small className="text-muted">{inv.rateType}</small>
                    </td>
                    <td className="text-success">{formatMoney(inv.earnings)}</td>
                    <td>{inv.startedAt ? formatDate(inv.startedAt) : '-'}</td>
                    <td>{inv.endsAt ? formatDate(inv.endsAt) : '-'}</td>
                    <td>
                      <Badge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

export default Orders
