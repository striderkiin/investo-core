'use client'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Nav, NavItem, NavLink, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { formatMoney, statusLabel } from '@/investo/format'
import { listMoney, MONEY, type MoneyKind, type MoneyRecord } from '@/investo/money'
import OrdersTable from './OrdersTable'

type Filter = 'open' | 'all' | string

// Deposits and withdrawals share this list: open items first, then status tabs.
const MoneyList = ({ kind }: { kind: MoneyKind }) => {
  const config = MONEY[kind]
  const [records, setRecords] = useState<MoneyRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('open')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    listMoney(kind)
      .then((rows) => active && setRecords(rows))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : `Could not load ${config.title.toLowerCase()}.`))
    return () => {
      active = false
    }
  }, [kind, config.title])

  const openStatuses: readonly string[] = config.open
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (records ?? []).filter((r) => {
      if (filter === 'open' && !openStatuses.includes(r.status)) return false
      if (filter !== 'open' && filter !== 'all' && r.status !== filter) return false
      if (!term) return true
      return [r.customer?.fullName, r.customer?.email, r.id, r.address, r.txHash, r.currency, r.network].some((v) => v?.toLowerCase().includes(term))
    })
  }, [records, filter, search, openStatuses])

  const openCount = (records ?? []).filter((r) => openStatuses.includes(r.status)).length
  const tabs: { key: Filter; label: string }[] = [
    { key: 'open', label: `Needs action (${openCount})` },
    { key: 'all', label: 'All' },
    ...config.statuses.map((s) => ({ key: s, label: statusLabel(s) })),
  ]

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <Row className="align-items-center g-2">
              <Col>
                <CardTitle as="h4">{config.title}</CardTitle>
                <p className="text-muted mb-0 fs-12">
                  {records ? `${visible.length} shown · ${formatMoney(visible.reduce((t, r) => t + r.amount, 0))} total` : 'Loading…'}
                </p>
              </Col>
              <Col xs="auto">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search customer, wallet or hash"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={`Search ${config.title.toLowerCase()}`}
                />
              </Col>
            </Row>
            <Nav variant="tabs" className="mt-3" activeKey={filter} onSelect={(key) => key && setFilter(key)}>
              {tabs.map((tab) => (
                <NavItem key={tab.key}>
                  <NavLink eventKey={tab.key} className="py-1">
                    {tab.label}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </CardHeader>
          <CardBody className="pt-0">
            {error && <div className="alert alert-danger mt-3">{error}</div>}
            {!records && !error ? (
              <FallbackLoading />
            ) : visible.length === 0 ? (
              <p className="text-center text-muted py-4 mb-0">{filter === 'open' ? `Nothing waiting. All ${config.title.toLowerCase()} are handled.` : 'Nothing here.'}</p>
            ) : (
              <OrdersTable orders={visible} />
            )}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default MoneyList
