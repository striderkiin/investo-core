import React from 'react'
import { Card, CardHeader, Col, Row } from 'react-bootstrap'
import Stats from './components/Stats'
import AudienceOverviewChart from './components/AudienceOverviewChart'
import NewVisitors from './components/NewVisitors'
import BrowserAndTrafficReport from './components/BrowserAndTrafficReport'
import TotalVisits from './components/TotalVisits'
import TrafficSources from './components/TrafficSources'
import WorldTraffic from './components/WorldTraffic'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

const AnalyticDashboard = () => {
  return (
    <>
      <Stats />
      <Row className="justify-content-center">
        <Col md={6} lg={8}>
          <AudienceOverviewChart />
        </Col>
        <Col md={6} lg={4}>
          <NewVisitors />
        </Col>
      </Row>
      <Row>
        <Col lg={6}>
          <BrowserAndTrafficReport />
        </Col>
        <Col lg={6}>
          <TotalVisits />
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <TrafficSources />
        </Col>
        <Col md={6} lg={8}>
          <WorldTraffic />
        </Col>
      </Row>
    </>
  )
}

export default AnalyticDashboard
