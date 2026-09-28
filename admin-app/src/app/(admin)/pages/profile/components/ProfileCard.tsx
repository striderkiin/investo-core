import { useRef, useState, type ChangeEvent } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import UserAvatar from '@/investo/UserAvatar'
import { roleLabel } from '@/investo/roles'
import { userService } from '@/investo/services'
import CompletionChart from './CompletionChart'
import { useAuth } from '../../../../../../../src/hooks/useAuth'

type ProfileCardProps = {
  twoFactorOn: boolean
  activeSessions: number
}

const ProfileCard = ({ twoFactorOn, activeSessions }: ProfileCardProps) => {
  const { profile, refreshProfile } = useAuth()
  const { showNotification } = useNotificationContext()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  if (!profile) return null

  // Profile completeness: a name, a picture (photo or picked avatar) and 2FA.
  const steps = [
    { done: Boolean(profile.fullName?.trim()), todo: 'add your name' },
    { done: Boolean(profile.avatarUrl || profile.avatarKey), todo: 'add a profile photo' },
    { done: twoFactorOn, todo: 'turn on two-factor authentication' },
  ]
  const missing = steps.filter((step) => !step.done).map((step) => step.todo)
  const completion = Math.round(((steps.length - missing.length) / steps.length) * 100)
  const missingText = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0]

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await userService.uploadAvatar(profile.id, file)
      await userService.updateProfile(profile.id, { avatarUrl: url })
      await refreshProfile()
      showNotification({ message: 'Profile photo updated.', variant: 'success' })
    } catch (error) {
      showNotification({ message: error instanceof Error ? error.message : 'Upload failed.', variant: 'danger' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardBody>
        <Row>
          <Col lg={4} className="align-self-center mb-3 mb-lg-0">
            <div className="d-flex align-items-center flex-row flex-wrap">
              <div className="position-relative me-3">
                <UserAvatar photoUrl={profile.avatarUrl} avatarKey={profile.avatarKey} name={profile.fullName} style={{ width: 120, height: 120, fontSize: 44 }} />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                  aria-label="Change profile photo"
                  className="thumb-md justify-content-center d-flex align-items-center bg-primary text-white rounded-circle position-absolute end-0 bottom-0 border border-3 border-card-bg">
                  <IconifyIcon icon="fa-solid:camera" className="fas fa-camera" />
                </button>
                <input ref={fileInput} type="file" accept="image/*" className="d-none" onChange={(event) => void uploadPhoto(event)} />
              </div>
              <div>
                <h5 className="fw-semibold fs-22 mb-1">{profile.fullName || profile.email}</h5>
                <p className="mb-0 text-muted fw-medium">{roleLabel(profile.role)}</p>
              </div>
            </div>
          </Col>
          <Col lg={4} className="ms-auto align-self-center">
            <div className="d-flex justify-content-center">
              <div className="border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">
                <h5 className={`fw-semibold fs-22 mb-1 ${twoFactorOn ? 'text-success' : 'text-danger'}`}>{twoFactorOn ? 'On' : 'Off'}</h5>
                <p className="text-muted mb-0 fw-medium">Two-Factor</p>
              </div>
              <div className="border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">
                <h5 className="fw-semibold fs-22 mb-1">{activeSessions}</h5>
                <p className="text-muted mb-0 fw-medium">Active Sessions</p>
              </div>
              <div className="border-dashed rounded border-theme-color p-2 me-2 flex-grow-1 flex-basis-0">
                <h5 className="fw-semibold fs-22 mb-1">{new Date(profile.createdAt).getFullYear()}</h5>
                <p className="text-muted mb-0 fw-medium">Member Since</p>
              </div>
            </div>
          </Col>
          <Col lg={4} className="align-self-center">
            <Row className="row-cols-2">
              <Col className="text-end">
                <CompletionChart value={completion} />
              </Col>
              <Col className="align-self-center">
                <p className="text-muted mb-0">
                  {missingText ? `To complete your profile, ${missingText}.` : 'Your profile is complete.'}
                </p>
              </Col>
            </Row>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default ProfileCard
