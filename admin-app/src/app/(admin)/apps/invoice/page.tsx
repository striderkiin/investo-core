'use client'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import type { Metadata } from 'next'
import InvoicePrintButton from './components/InvoicePrintButton'
import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'
import { countryName, formatDate, formatMoney, statusLabel } from '@/investo/format'
import { sendEmail } from '@/investo/functions'
import { supabase, userService } from '@/investo/services'
import { useAdminBranding } from '@/investo/useAdminBranding'
import type { Profile } from '../../../../../../src/types/database'

export const metadata: Metadata = { title: 'Customer Statement' }

type Line = { id: string; type: string; amount: number; balanceAfter: number; status: string; description: string | null; reference: string | null; createdAt: string }

const isoDay = (date: Date) => date.toISOString().slice(0, 10)

// Customer account statement for a chosen period: print it, save it as PDF
// from the print dialog, or email it to the customer through Resend.
const Invoice = () => {
  const { logoOnDark, siteName } = useAdminBranding()
  const { showNotification } = useNotificationContext()
  const preselected = useQueryParams()['customer'] ?? ''
  const today = new Date()
  const [customers, setCustomers] = useState<Profile[]>([])
  const [customerId, setCustomerId] = useState(preselected)
  const [from, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [to, setTo] = useState(isoDay(today))
  const [lines, setLines] = useState<Line[] | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    userService
      .list()
      .then((rows) => setCustomers(rows.filter((r) => r.role === 'client')))
      .catch(() => setCustomers([]))
  }, [])

  const customer = customers.find((c) => c.id === customerId) ?? null

  useEffect(() => {
    if (!customerId || !from || !to) return setLines(null)
    setLines(null)
    supabase
      .from('transactions')
      .select('id, type, amount, balance_after, status, description, reference, created_at')
      .eq('user_id', customerId)
      .gte('created_at', new Date(`${from}T00:00:00Z`).toISOString())
      .lte('created_at', new Date(`${to}T23:59:59.999Z`).toISOString())
      .order('created_at', { ascending: true })
      .then(({ data }) =>
        setLines(
          (data ?? []).map((t: Record<string, unknown>) => ({
            id: String(t.id),
            type: String(t.type),
            amount: Number(t.amount),
            balanceAfter: Number(t.balance_after),
            status: String(t.status),
            description: (t.description as string) ?? null,
            reference: (t.reference as string) ?? null,
            createdAt: String(t.created_at),
          }))
        )
      )
  }, [customerId, from, to])

  const totals = useMemo(() => {
    const done = (lines ?? []).filter((l) => l.status === 'completed')
    return {
      moneyIn: done.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0),
      moneyOut: done.filter((l) => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0),
    }
  }, [lines])

  const statementNo = customer ? `ST-${customer.referralCode}-${to.replace(/-/g, '')}` : ''

  const email = async () => {
    if (!customer) return
    if (!window.confirm(`Email this statement to ${customer.email}?`)) return
    setSending(true)
    try {
      await sendEmail('statement', { customerId: customer.id, from, to })
      showNotification({ message: `Statement emailed to ${customer.email}.`, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'The email failed.', variant: 'danger' })
    } finally {
      setSending(false)
    }
  }

  const downloadCsv = () => {
    if (!customer || !lines) return
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [['Date', 'Type', 'Description', 'Reference', 'Amount', 'Balance after', 'Status'], ...lines.map((l) => [l.createdAt.slice(0, 10), l.type, l.description ?? '', l.reference ?? '', l.amount, l.balanceAfter, l.status])]
      .map((row) => row.map(cell).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = `${statementNo}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <Row>
      <Col xs={12}>
        <Card className="d-print-none">
          <CardBody>
            <Row className="g-2 align-items-end">
              <Col md={6}>
                <label htmlFor="statement-customer" className="form-label">
                  Customer
                </label>
                <select id="statement-customer" className="form-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Choose a customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.email} ({c.email})
                    </option>
                  ))}
                </select>
              </Col>
              <Col md={3}>
                <label htmlFor="statement-from" className="form-label">
                  From
                </label>
                <input id="statement-from" type="date" className="form-control" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              </Col>
              <Col md={3}>
                <label htmlFor="statement-to" className="form-label">
                  To
                </label>
                <input id="statement-to" type="date" className="form-control" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              </Col>
            </Row>
          </CardBody>
        </Card>
        {!customer ? (
          <p className="text-muted text-center py-5 d-print-none">Choose a customer to build their statement.</p>
        ) : (
          <Card>
            <CardBody className="bg-black">
              <Row>
                <Col xs={4} className="align-self-center">
                  <Image src={logoOnDark} alt={siteName} className="me-1" height={44} style={{ width: 'auto' }} />
                </Col>
                <Col xs={8} className="text-end align-self-center">
                  <h5 className="mb-1 fw-semibold text-white">
                    <span className="text-muted">Statement:</span> #{statementNo}
                  </h5>
                  <h5 className="mb-0 fw-semibold text-white">
                    <span className="text-muted">Issue Date:</span> {formatDate(new Date().toISOString())}
                  </h5>
                </Col>
              </Row>
            </CardBody>
            <CardBody>
              <Row className="row-cols-3 d-flex justify-content-md-between">
                <Col md={3} className="d-print-flex align-self-center">
                  <div>
                    <span className="badge rounded text-dark bg-light">Statement for</span>
                    <h5 className="my-1 fw-semibold fs-18">{customer.fullName || customer.email}</h5>
                    <p className="text-muted ">
                      {customer.email}
                      {customer.country ? ` | ${countryName(customer.country)}` : ''}
                    </p>
                  </div>
                </Col>
                <Col md={3} className="d-print-flex align-self-center">
                  <div>
                    <address className="fs-13">
                      <strong className="fs-14">Period :</strong>
                      <br />
                      {formatDate(`${from}T12:00:00Z`)} to
                      <br />
                      {formatDate(`${to}T12:00:00Z`)}
                    </address>
                  </div>
                </Col>
                <Col md={3} className="d-print-flex align-self-center">
                  <div>
                    <address className="fs-13">
                      <strong className="fs-14">Balances today:</strong>
                      <br />
                      Total {formatMoney(customer.totalBalance)}
                      <br />
                      Available {formatMoney(customer.availableBalance)}
                      <br />
                      Invested {formatMoney(customer.investedBalance)}
                    </address>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col lg={12}>
                  <div className="table-responsive project-invoice">
                    <table className="table table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Transaction</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Amount</th>
                          <th>Balance After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines === null && (
                          <tr>
                            <td colSpan={5} className="text-muted text-center">
                              Loading…
                            </td>
                          </tr>
                        )}
                        {lines?.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-muted text-center">
                              No transactions in this period.
                            </td>
                          </tr>
                        )}
                        {lines?.map((line) => (
                          <tr key={line.id}>
                            <td>
                              <h5 className="mt-0 mb-1 fs-14 text-capitalize">{line.type}</h5>
                              <p className="mb-0 text-muted">{line.description ?? line.reference ?? ''}</p>
                            </td>
                            <td>{formatDate(line.createdAt)}</td>
                            <td>{statusLabel(line.status)}</td>
                            <td className={line.amount >= 0 ? 'text-success' : 'text-danger'}>
                              {line.amount >= 0 ? '+' : '-'}
                              {formatMoney(Math.abs(line.amount))}
                            </td>
                            <td>{formatMoney(line.balanceAfter)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={2} className="border-0" />
                          <td colSpan={2} className="border-0 fs-14 text-dark">
                            <b>Money in</b>
                          </td>
                          <td className="border-0 fs-14 text-dark">
                            <b>{formatMoney(totals.moneyIn)}</b>
                          </td>
                        </tr>
                        <tr>
                          <th colSpan={2} className="border-0" />
                          <td colSpan={2} className="border-0 fs-14 text-dark">
                            <b>Money out</b>
                          </td>
                          <td className="border-0 fs-14 text-dark">
                            <b>{formatMoney(totals.moneyOut)}</b>
                          </td>
                        </tr>
                        <tr>
                          <th colSpan={2} className="border-0" />
                          <td colSpan={2} className="border-0 fs-14">
                            <b>Current total balance</b>
                          </td>
                          <td className="border-0 fs-14">
                            <b>{formatMoney(customer.totalBalance)}</b>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col lg={12}>
                  <h5 className="mt-4">Notes :</h5>
                  <ul className="ps-3">
                    <li>
                      <small className="fs-12">Money in and out count completed transactions only. Pending items are listed but not totalled.</small>
                    </li>
                    <li>
                      <small className="fs-12">Contact support if anything on this statement looks wrong.</small>
                    </li>
                  </ul>
                </Col>
              </Row>
              <hr />
              <Row className="d-flex justify-content-center">
                <Col lg={12} xl={4} className="ms-auto align-self-center">
                  <div className="text-center">
                    <small className="fs-12">Thank you for investing with {siteName}.</small>
                  </div>
                </Col>
                <Col lg={12} xl={4}>
                  <div className="float-end d-flex d-print-none mt-2 mt-md-0 gap-1">
                    <InvoicePrintButton />
                    <Button variant="light" onClick={downloadCsv} disabled={!lines}>
                      CSV
                    </Button>
                    <Button variant="primary" onClick={() => void email()} disabled={sending}>
                      {sending ? 'Sending…' : 'Email to customer'}
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        )}
      </Col>
    </Row>
  )
}

export default Invoice
