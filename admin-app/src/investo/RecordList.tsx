import { useMemo, useState, type ReactNode } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Nav, NavItem, NavLink, Row } from 'react-bootstrap'
import type { ColumnDef } from '@tanstack/react-table'
import ReactTable from '@/components/Table'
import FallbackLoading from '@/components/FallbackLoading'

type Props<T> = {
  title: string
  subtitle?: (visible: T[]) => ReactNode
  rows: T[] | null
  error?: string | null
  columns: ColumnDef<T>[]
  tabs: { key: string; label: string; match: (row: T) => boolean }[]
  searchText: (row: T) => (string | null | undefined)[]
  searchPlaceholder: string
  extra?: ReactNode
}

// Template card with status tabs, a search box and a paginated table.
const RecordList = <T,>({ title, subtitle, rows, error, columns, tabs, searchText, searchPlaceholder, extra }: Props<T>) => {
  const [tab, setTab] = useState(tabs[0]?.key ?? 'all')
  const [search, setSearch] = useState('')
  const visible = useMemo(() => {
    const active = tabs.find((t) => t.key === tab)
    const term = search.trim().toLowerCase()
    return (rows ?? []).filter((row) => (!active || active.match(row)) && (!term || searchText(row).some((v) => v?.toLowerCase().includes(term))))
  }, [rows, tab, search, tabs, searchText])

  return (
    <Row>
      <Col lg={12}>
        <Card>
          <CardHeader>
            <Row className="align-items-center g-2">
              <Col>
                <CardTitle as="h4">{title}</CardTitle>
                <p className="text-muted mb-0 fs-12">{rows ? (subtitle ? subtitle(visible) : `${visible.length} shown`) : 'Loading…'}</p>
              </Col>
              <Col xs="auto">
                <input type="search" className="form-control" placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={searchPlaceholder} />
              </Col>
              {extra && <Col xs="auto">{extra}</Col>}
            </Row>
            <Nav variant="tabs" className="mt-3" activeKey={tab} onSelect={(key) => key && setTab(key)}>
              {tabs.map((t) => (
                <NavItem key={t.key}>
                  <NavLink eventKey={t.key} className="py-1">
                    {t.label}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </CardHeader>
          <CardBody className="pt-0">
            {error && <div className="alert alert-danger mt-3">{error}</div>}
            {!rows && !error ? (
              <FallbackLoading />
            ) : visible.length === 0 ? (
              <p className="text-center text-muted py-4 mb-0">Nothing here.</p>
            ) : (
              <ReactTable<T> columns={columns} data={visible} rowsPerPageList={[10, 20, 50, 100]} pageSize={20} tableClass="mb-0 text-nowrap" theadClass="table-light" showPagination />
            )}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default RecordList
