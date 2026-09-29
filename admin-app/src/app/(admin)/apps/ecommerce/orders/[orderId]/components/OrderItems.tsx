import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import { formatDateTime, formatMoney } from '@/investo/format'
import { explorerUrl, MONEY, type MoneyRecord } from '@/investo/money'

const copy = (text: string) => void navigator.clipboard?.writeText(text)

const CopyValue = ({ value }: { value: string | null }) =>
  value ? (
    <span className="d-inline-flex align-items-center gap-1 text-break">
      <code>{value}</code>
      <button type="button" className="btn btn-link p-0 text-muted" onClick={() => copy(value)} aria-label="Copy">
        <IconifyIcon icon="iconoir:copy" />
      </button>
    </span>
  ) : (
    <span className="text-muted">-</span>
  )

const OrderItems = ({ order }: { order: MoneyRecord }) => {
  const explorer = explorerUrl(order.network, order.txHash)
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Coin', value: `${order.currency}${order.network ? ` on ${order.network}` : ''}` },
    { label: order.kind === 'deposit' ? 'Paid to wallet' : 'Pay out to wallet', value: <CopyValue value={order.address} /> },
    {
      label: 'Transaction hash',
      value: order.txHash ? (
        <span className="d-inline-flex align-items-center gap-2 flex-wrap">
          <CopyValue value={order.txHash} />
          {explorer && (
            <a href={explorer} target="_blank" rel="noopener noreferrer" className="text-primary">
              View on explorer <IconifyIcon icon="iconoir:open-new-window" />
            </a>
          )}
        </span>
      ) : (
        <span className="text-muted">Not recorded yet</span>
      ),
    },
  ]
  if (order.kind === 'deposit') rows.push({ label: 'Payment provider', value: order.provider ? `${order.provider}${order.reference ? ` · ${order.reference}` : ''}` : '-' })

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">
              {MONEY[order.kind].singular} #{order.id.slice(0, 8).toUpperCase()}
            </CardTitle>
            <p className="mb-0 text-muted mt-1">Requested {formatDateTime(order.createdAt)}</p>
          </Col>
          <Col xs="auto">
            <h3 className="mb-0 fw-bold">{formatMoney(order.amount)}</h3>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive">
          <table className="table mb-0">
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th className="text-muted fw-medium" style={{ width: 200 }}>
                    {row.label}
                  </th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
}

export default OrderItems
