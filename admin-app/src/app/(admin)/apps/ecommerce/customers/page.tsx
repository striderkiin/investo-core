'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import clsx from 'clsx'
import type { Metadata } from 'next'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownMenu, DropdownToggle, FormCheck, Row } from 'react-bootstrap'
import CustomerTable from './components/CustomerTable'
import FallbackLoading from '@/components/FallbackLoading'
import useQueryParams from '@/hooks/useQueryParams'
import { userService } from '@/investo/services'
import { countryName } from '@/investo/format'
import { ACCOUNT_STATUSES } from '@/investo/customers'
import type { AccountStatus, Profile } from '../../../../../../../src/types/database'

export const metadata: Metadata = { title: 'Customers' }

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

const exportCsv = (customers: Profile[]) => {
  const header = ['Name', 'Email', 'Country', 'Status', 'Total balance', 'Available', 'Invested', 'Bonus', 'Joined']
  const rows = customers.map((c) => [
    c.fullName,
    c.email,
    c.country ? countryName(c.country) : '',
    c.accountStatus,
    c.totalBalance,
    c.availableBalance,
    c.investedBalance,
    c.bonusBalance,
    c.createdAt.slice(0, 10),
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

const Customers = () => {
  const queryParams = useQueryParams()
  const [search, setSearch] = useState(queryParams['q'] ?? '')
  const [statuses, setStatuses] = useState<AccountStatus[]>(ACCOUNT_STATUSES.map((s) => s.value))
  const [customers, setCustomers] = useState<Profile[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The top bar's search box navigates here with ?q=.
  const searchParam = queryParams['q'] ?? ''
  useEffect(() => {
    setSearch(searchParam)
  }, [searchParam])

  useEffect(() => {
    let active = true
    const timeout = setTimeout(() => {
      userService
        .list(search.trim() || undefined)
        .then((rows) => {
          if (!active) return
          setCustomers(rows.filter((row) => row.role === 'client'))
          setError(null)
        })
        .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Could not load customers.'))
    }, 250)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [search])

  const visible = useMemo(() => (customers ?? []).filter((c) => statuses.includes(c.accountStatus)), [customers, statuses])

  const toggleStatus = (status: AccountStatus) =>
    setStatuses((current) => (current.includes(status) ? current.filter((s) => s !== status) : [...current, status]))

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <Row className="align-items-center g-2">
              <Col>
                <CardTitle as="h4">Customers</CardTitle>
                <p className="text-muted mb-0 fs-12">
                  {customers ? `${visible.length} of ${customers.length} shown` : 'Loading…'}
                </p>
              </Col>
              <Col xs="auto">
                <form className="row g-2" onSubmit={(event) => event.preventDefault()}>
                  <Col xs="auto">
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search name or email"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      aria-label="Search customers"
                    />
                  </Col>
                  <Col xs="auto">
                    <Dropdown autoClose="outside">
                      <DropdownToggle
                        variant="link"
                        className="btn bg-primary-subtle text-primary d-flex align-items-center arrow-none"
                        role="button">
                        <IconifyIcon icon="iconoir:filter-alt" className="me-1" /> Filter
                      </DropdownToggle>
                      <DropdownMenu align="start">
                        <div className="p-2">
                          {ACCOUNT_STATUSES.map((status, idx) => (
                            <FormCheck
                              label={status.label}
                              className={clsx({ 'mb-2': ACCOUNT_STATUSES.length - 1 != idx })}
                              id={`filter-${status.value}`}
                              key={status.value}
                              checked={statuses.includes(status.value)}
                              onChange={() => toggleStatus(status.value)}
                            />
                          ))}
                        </div>
                      </DropdownMenu>
                    </Dropdown>
                  </Col>
                  <Col xs="auto">
                    <Button variant="primary" type="button" className="icons-center" disabled={!visible.length} onClick={() => exportCsv(visible)}>
                      <IconifyIcon icon="fa6-solid:file-arrow-down" className="me-1" /> Export CSV
                    </Button>
                  </Col>
                </form>
              </Col>
            </Row>
          </CardHeader>
          <CardBody className="pt-0">
            {error && <div className="alert alert-danger">{error}</div>}
            {!customers && !error ? (
              <FallbackLoading />
            ) : visible.length === 0 ? (
              <p className="text-center text-muted py-4 mb-0">{search ? 'No customers match that search.' : 'No customers yet.'}</p>
            ) : (
              <CustomerTable customers={visible} />
            )}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default Customers
