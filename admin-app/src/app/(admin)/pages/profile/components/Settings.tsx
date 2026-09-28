import ComponentContainerCard from '@/components/ComponentContainerCard'
import { useNotificationContext } from '@/context/useNotificationContext'
import { securityService, supabase, userService } from '@/investo/services'
import { useState, type FormEvent } from 'react'
import { Button, Col, FormControl, FormGroup, FormLabel } from 'react-bootstrap'
import { useAuth } from '../../../../../../../src/hooks/useAuth'

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)

const PersonalInformation = () => {
  const { profile, refreshProfile } = useAuth()
  const { showNotification } = useNotificationContext()
  const [fullName, setFullName] = useState(profile?.fullName ?? '')
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!fullName.trim()) {
      showNotification({ message: 'Enter your name.', variant: 'danger' })
      return
    }
    setSaving(true)
    try {
      await userService.updateProfile(profile.id, { fullName: fullName.trim() })
      await refreshProfile()
      showNotification({ message: 'Profile updated.', variant: 'success' })
    } catch (error) {
      showNotification({ message: errorMessage(error, 'Could not save your profile.'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ComponentContainerCard title="Personal Information">
      <form onSubmit={(event) => void save(event)}>
        <FormGroup className="mb-3 row">
          <FormLabel className="col-xl-3 col-lg-3 text-end mb-lg-0 align-self-center">Full Name</FormLabel>
          <Col lg={9} xl={8}>
            <FormControl type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </Col>
        </FormGroup>
        <FormGroup className="mb-3 row">
          <FormLabel className="col-xl-3 col-lg-3 text-end mb-lg-0 align-self-center">Email Address</FormLabel>
          <Col lg={9} xl={8}>
            <FormControl type="email" value={profile.email} readOnly disabled />
            <span className="form-text text-muted font-12">Contact a super admin to change the email on an admin account.</span>
          </Col>
        </FormGroup>
        <FormGroup className="row">
          <div className="col-lg-9 col-xl-8 offset-lg-3">
            <Button variant="primary" className="me-1" type="submit" disabled={saving}>
              Save
            </Button>
            <Button variant="danger" type="button" onClick={() => setFullName(profile.fullName ?? '')}>
              Cancel
            </Button>
          </div>
        </FormGroup>
      </form>
    </ComponentContainerCard>
  )
}

// Confirmed with a fresh authenticator code rather than the current password:
// re-entering the password would start a new, lower-assurance session and
// sign the admin out of this one.
const ChangePassword = () => {
  const { profile } = useAuth()
  const { showNotification } = useNotificationContext()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setCode('')
    setPassword('')
    setConfirm('')
  }

  const change = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) return showNotification({ message: 'Enter the 6-digit code from your authenticator app.', variant: 'danger' })
    if (password.length < 8) return showNotification({ message: 'Use at least 8 characters for the new password.', variant: 'danger' })
    if (password !== confirm) return showNotification({ message: 'The new passwords do not match.', variant: 'danger' })

    setSaving(true)
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError
      const factor = factors.totp[0]
      if (!factor) throw new Error('Set up two-factor authentication before changing your password.')
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code })
      if (verifyError) throw verifyError

      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      if (profile) void securityService.logSecurityEvent(profile.id, 'password_changed').catch(() => undefined)
      reset()
      showNotification({ message: 'Password changed.', variant: 'success' })
    } catch (error) {
      showNotification({ message: errorMessage(error, 'Could not change your password.'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ComponentContainerCard title="Change Password">
      <form onSubmit={(event) => void change(event)}>
        <FormGroup className="mb-3 row">
          <FormLabel className="col-xl-3 col-lg-3 text-end mb-lg-0 align-self-center">Authenticator Code</FormLabel>
          <Col lg={9} xl={8}>
            <FormControl
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </Col>
        </FormGroup>
        <FormGroup className="mb-3 row">
          <FormLabel className="col-xl-3 col-lg-3 text-end mb-lg-0 align-self-center">New Password</FormLabel>
          <Col lg={9} xl={8}>
            <FormControl type="password" autoComplete="new-password" placeholder="New Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Col>
        </FormGroup>
        <FormGroup className="mb-3 row">
          <FormLabel className="col-xl-3 col-lg-3 text-end mb-lg-0 align-self-center">Confirm Password</FormLabel>
          <Col lg={9} xl={8}>
            <FormControl type="password" autoComplete="new-password" placeholder="Re-Password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </Col>
        </FormGroup>
        <FormGroup className="row">
          <Col lg={9} xl={8} className="offset-lg-3">
            <Button variant="primary" className="me-1" type="submit" disabled={saving}>
              Change Password
            </Button>
            <Button variant="danger" type="button" onClick={reset}>
              Cancel
            </Button>
          </Col>
        </FormGroup>
      </form>
    </ComponentContainerCard>
  )
}

const Settings = () => {
  return (
    <>
      <PersonalInformation />
      <ChangePassword />
    </>
  )
}

export default Settings
