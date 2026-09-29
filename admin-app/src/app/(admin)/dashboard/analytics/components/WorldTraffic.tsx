'use client'
import { useMemo } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import { WorldVectorMap } from '@/components/VectorMap'
import { countryName } from '@/investo/format'
import type { DashboardData } from '../useDashboardData'

// Customers per country (ISO alpha-2, as jsvectormap's world map keys regions).
const countByCountry = (data: DashboardData) => {
  const counts: Record<string, number> = {}
  for (const customer of data.customers) {
    if (customer.country) counts[customer.country] = (counts[customer.country] ?? 0) + 1
  }
  return counts
}

const WorldTraffic = ({ data }: { data: DashboardData }) => {
  const counts = useMemo(() => countByCountry(data), [data])
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const unknown = data.customers.filter((c) => !c.country).length

  // Memoised: the map is rebuilt whenever the options object changes.
  const options = useMemo(() => ({
    map: 'world',
    mapBgColor: '#F7F8F9',
    zoomOnScroll: false,
    zoomButtons: false,
    regionStyle: {
      initial: {
        fill: 'rgba(169,183,197, 0.3)',
        fillOpacity: 1,
      },
      hover: {
        fillOpacity: 0.8,
        cursor: 'pointer',
      },
    },
    visualizeData: Object.keys(counts).length
      ? {
          scale: ['#e8c3b9', '#a8442e'],
          values: counts,
        }
      : undefined,
    onRegionTooltipShow(_event: unknown, tooltip: { text: (html: string, asHtml?: boolean) => void }, code: string) {
      const total = counts[code] ?? 0
      tooltip.text(`${countryName(code)}: ${total} ${total === 1 ? 'customer' : 'customers'}`)
    },
  }), [counts])

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle>Customers By Country</CardTitle>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <Row>
          <Col lg={8}>
            <WorldVectorMap height="320px" options={options} />
          </Col>
          <Col lg={4} className="align-self-center">
            {top.length === 0 && (
              <p className="text-muted my-3">
                No countries yet. New customers pick their country when they sign up, and it will show here.
              </p>
            )}
            {top.map(([code, total]) => (
              <div className="d-flex align-items-center my-3" key={code}>
                <span className="thumb-sm align-self-center rounded-circle bg-primary-subtle text-primary fw-semibold d-flex align-items-center justify-content-center fs-11">
                  {code}
                </span>
                <div className="flex-grow-1 ms-2">
                  <h5 className="mb-1">{total.toLocaleString()}</h5>
                  <p className="text-muted mb-0">{countryName(code)}</p>
                </div>
              </div>
            ))}
            {unknown > 0 && top.length > 0 && <p className="text-muted fs-12 mb-0">{unknown} without a country on file</p>}
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default WorldTraffic
