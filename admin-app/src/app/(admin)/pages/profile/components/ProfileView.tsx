'use client'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap'
import Settings from './Settings'
import Security from './Security'
import type { AdminProfileData } from '../useAdminProfile'

export type ProfileTab = 'settings' | 'security'

type ProfileViewProps = {
  activeTab: ProfileTab
  onSelectTab: (tab: ProfileTab) => void
  data: AdminProfileData
}

const ProfileView = ({ activeTab, onSelectTab, data }: ProfileViewProps) => {
  return (
    <TabContainer activeKey={activeTab} onSelect={(key) => key && onSelectTab(key as ProfileTab)}>
      <Nav className="nav-tabs mb-3" role="tablist">
        <NavItem>
          <NavLink eventKey="settings" className="fw-medium" role="tab">
            Settings
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink eventKey="security" className="fw-medium" role="tab">
            Security
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent>
        <TabPane eventKey="settings" className="p-3" id="settings" role="tabpanel">
          <Settings />
        </TabPane>
        <TabPane eventKey="security" className="p-3" id="security" role="tabpanel">
          <Security data={data} />
        </TabPane>
      </TabContent>
    </TabContainer>
  )
}

export default ProfileView
