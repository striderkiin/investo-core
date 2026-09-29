'use client'
import type { Metadata } from 'next'
import { useState } from 'react'
import { Nav, NavItem, NavLink } from 'react-bootstrap'
import LiveMarketControls from './components/LiveMarketControls'
import PlatformIndexControls from './components/PlatformIndexControls'

export const metadata: Metadata = { title: 'Market Controls' }

// The old panel's Market Controls page: the Platform Index engine and
// manual overrides on live provider prices.
const MarketControls = () => {
  const [tab, setTab] = useState<'index' | 'live'>('index')
  return (
    <>
      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => k && setTab(k as 'index' | 'live')}>
        <NavItem>
          <NavLink eventKey="index">Platform Index</NavLink>
        </NavItem>
        <NavItem>
          <NavLink eventKey="live">Live markets</NavLink>
        </NavItem>
      </Nav>
      {tab === 'index' ? <PlatformIndexControls /> : <LiveMarketControls />}
    </>
  )
}

export default MarketControls
