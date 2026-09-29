'use client'
import { Col, Row } from 'react-bootstrap'
import Stats from './components/Stats'
import AudienceOverviewChart from './components/AudienceOverviewChart'
import NewVisitors from './components/NewVisitors'
import BrowserAndTrafficReport from './components/BrowserAndTrafficReport'
import TotalVisits from './components/TotalVisits'
import TrafficSources from './components/TrafficSources'
import WorldTraffic from './components/WorldTraffic'
import FallbackLoading from '@/components/FallbackLoading'
import { useDashboardData } from './useDashboardData'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

const AnalyticDashboard = () => {
  const { data, refresh } = useDashboardData()

  if (!data) return <FallbackLoading />

  return (
    <>
      <Stats data={data} />
      <Row className="justify-content-center">
        <Col md={6} lg={8}>
          <AudienceOverviewChart data={data} />
        </Col>
        <Col md={6} lg={4}>
          <NewVisitors data={data} />
        </Col>
      </Row>
      <Row>
        <Col lg={6}>
          <BrowserAndTrafficReport data={data} onRefresh={() => void refresh()} />
        </Col>
        <Col lg={6}>
          <TotalVisits data={data} onRefresh={() => void refresh()} />
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <TrafficSources data={data} />
        </Col>
        <Col md={6} lg={8}>
          <WorldTraffic data={data} />
        </Col>
      </Row>
    </>
  )
}

export default AnalyticDashboard
