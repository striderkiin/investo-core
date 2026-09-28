import type { Metadata } from 'next'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import ProfileCard from './components/ProfileCard'
import PersonalInformation from './components/PersonalInformation'
import ProfileView, { type ProfileTab } from './components/ProfileView'
import { useAdminProfile } from './useAdminProfile'

export const metadata: Metadata = { title: 'Profile' }

// The signed-in admin's own account page.
const Profile = () => {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ProfileTab>(searchParams.get('tab') === 'security' ? 'security' : 'settings')
  const data = useAdminProfile()

  return (
    <>
      <Row className="justify-content-center">
        <Col xs={12}>
          <ProfileCard twoFactorOn={data.factors.length > 0} activeSessions={data.sessions.length} />
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col md={4}>
          <PersonalInformation onEdit={() => setActiveTab('settings')} />
        </Col>
        <Col md={8}>
          <ProfileView activeTab={activeTab} onSelectTab={setActiveTab} data={data} />
        </Col>
      </Row>
    </>
  )
}

export default Profile
