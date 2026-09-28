'use client'
import { yupResolver } from '@hookform/resolvers/yup'
import type { Metadata } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Card, CardBody, Col } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import TextFormInput from '@/components/form/TextFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'
import { useAdminAccess } from '@/investo/useAdminAccess'
import { useAdminBranding } from '@/investo/useAdminBranding'
import { securityService, supabase } from '@/investo/services'
import { useAuth } from '../../../../../../src/hooks/useAuth'

export const metadata: Metadata = { title: 'Set Up Two-Factor Authentication' }

type Enrollment = { factorId: string; qrCode: string; secret: string }

const codeSchema = yup.object({
  code: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app')
    .required('Enter the 6-digit code from your authenticator app'),
})

// Starts a fresh TOTP enrollment, clearing any earlier unfinished attempt so
// abandoned QR codes never become valid second factors.
const startEnrollment = async (): Promise<Enrollment> => {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError) throw listError
  for (const factor of factors.all.filter((f) => f.status === 'unverified')) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Admin authenticator ${Date.now()}` })
  if (error) throw error
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

const SetupTwoFactor = () => {
  const { siteName, mark } = useAdminBranding()
  const access = useAdminAccess()
  const { session } = useAuth()
  const { replace } = useRouter()
  const { showNotification } = useNotificationContext()
  const queryParams = useQueryParams()
  const redirectTo = queryParams['redirectTo'] && queryParams['redirectTo'].startsWith('/') ? queryParams['redirectTo'] : '/dashboard'

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [loading, setLoading] = useState(false)
  const { control, handleSubmit } = useForm({ resolver: yupResolver(codeSchema) })
  // One enrollment per visit: a second concurrent one would clear the first's QR code.
  const enrollmentRequest = useRef<Promise<Enrollment> | null>(null)
  const notify = useRef(showNotification)
  notify.current = showNotification

  useEffect(() => {
    if (access === 'signed-out' || access === 'needs-mfa-code') replace('/auth/login')
    else if (access === 'not-admin') window.location.replace('/client-app/index.html')
    else if (access === 'ok') replace(redirectTo)
  }, [access, redirectTo, replace])

  useEffect(() => {
    if (access !== 'needs-mfa-setup') return
    let active = true
    enrollmentRequest.current ??= startEnrollment()
    enrollmentRequest.current
      .then((result) => active && setEnrollment(result))
      .catch((error: unknown) =>
        notify.current({ message: error instanceof Error ? error.message : 'Could not start authenticator setup.', variant: 'danger' })
      )
    return () => {
      active = false
    }
  }, [access])

  const verify = handleSubmit(async ({ code }) => {
    if (!enrollment) return
    setLoading(true)
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrollment.factorId, challengeId: challenge.id, code })
      if (verifyError) throw verifyError
      if (session?.user.id) void securityService.logSecurityEvent(session.user.id, '2fa_enabled').catch(() => undefined)
      showNotification({ message: 'Two-factor authentication is on.', variant: 'success' })
      replace(redirectTo)
    } catch (error) {
      showNotification({ message: error instanceof Error ? error.message : 'That code did not work. Try the current code.', variant: 'danger' })
    } finally {
      setLoading(false)
    }
  })

  return (
    <Col lg={4} className="mx-auto">
      <Card>
        <CardBody className="p-0 bg-black auth-header-box rounded-top">
          <div className="text-center p-3">
            <Image src={mark} height={50} alt="logo" className="auth-logo" />
            <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Secure your {siteName} admin account</h4>
            <p className="text-muted fw-medium mb-0">Admins must use two-factor authentication.</p>
          </div>
        </CardBody>
        <CardBody className="pt-0">
          <form onSubmit={verify} className="my-4">
            <p className="text-muted mb-3">
              Scan this QR code with an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit
              code it shows.
            </p>
            <div className="text-center mb-3">
              {enrollment ? (
                <img
                  src={enrollment.qrCode.startsWith('data:') ? enrollment.qrCode : `data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`}
                  alt="Authenticator QR code"
                  width={180}
                  height={180}
                  className="border rounded p-2 bg-white"
                />
              ) : (
                <div className="spinner-border text-primary my-5" role="status" />
              )}
            </div>
            {enrollment && (
              <p className="text-muted text-center fs-12 mb-3">
                Can&apos;t scan it? Enter this key instead:
                <br />
                <code className="user-select-all">{enrollment.secret}</code>
              </p>
            )}
            <TextFormInput
              control={control}
              name="code"
              label="Authentication code"
              containerClassName="form-group mb-2"
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
            />
            <div className="d-grid mt-3">
              <button className="btn btn-primary flex-centered" type="submit" disabled={loading || !enrollment}>
                Turn on two-factor authentication <IconifyIcon icon="fa6-solid:shield-halved" className="ms-1" />
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </Col>
  )
}

export default SetupTwoFactor
