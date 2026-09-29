'use client'
import type { Metadata } from 'next'
import { useState } from 'react'
import { Nav, NavItem, NavLink } from 'react-bootstrap'
import LiveMarketControls from './components/LiveMarketControls'
import ManageMarkets from './components/ManageMarkets'
import PlatformIndexControls from './components/PlatformIndexControls'

export const metadata: Metadata = { title: 'Market Controls' }

// The Platform Index engine, and the markets customers can pick with manual
// overrides on their prices. These apply to every customer; per-customer
// scenarios are Chart projections on the customer's profile.
const MarketControls = () => {
  const [tab, setTab] = useState<'index' | 'live'>('index')
  // Bumped when markets are added or removed so the price controls reload their list.
  const [marketsVersion, setMarketsVersion] = useState(0)
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
      {tab === 'index' ? (
        <PlatformIndexControls />
      ) : (
        <>
          <ManageMarkets onChanged={() => setMarketsVersion((v) => v + 1)} />
          <LiveMarketControls key={marketsVersion} />
        </>
      )}
    </>
  )
}

export default MarketControls
