'use client'
import type { Metadata } from 'next'
import { useState } from 'react'
import { Nav, NavItem, NavLink } from 'react-bootstrap'
import { usePermission } from '../../../../../../src/hooks/usePermission'
import BrandTab from './components/BrandTab'
import BusinessTab from './components/BusinessTab'

export const metadata: Metadata = { title: 'Branding' }

// The old Branding and White Label pages, as two tabs.
const BrandingPage = () => {
  const { can } = usePermission()
  const [tab, setTab] = useState<'brand' | 'business'>('brand')
  const canEdit = tab === 'brand' ? can('branding.manage') : can('white_label.manage')
  return (
    <>
      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => k && setTab(k as 'brand' | 'business')}>
        <NavItem>
          <NavLink eventKey="brand">Brand</NavLink>
        </NavItem>
        <NavItem>
          <NavLink eventKey="business">Business details</NavLink>
        </NavItem>
      </Nav>
      {!canEdit && <div className="alert alert-info">Read only: your role can view these settings but not change them.</div>}
      {tab === 'brand' ? <BrandTab canManage={can('branding.manage')} /> : <BusinessTab canManage={can('white_label.manage')} />}
    </>
  )
}

export default BrandingPage
