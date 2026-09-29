'use client'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardBody, Col } from 'react-bootstrap'

import useQueryParams from '@/hooks/useQueryParams'
import { roleLabel } from '@/investo/roles'
import { supabase } from '@/investo/services'
import { useAdminBranding } from '@/investo/useAdminBranding'
import RegisterForm from './components/RegisterForm'
import type { RoleName } from '../../../../../../src/types/roles'

export const metadata: Metadata = { title: 'Accept Invitation' }

type Invite = { email: string; role: RoleName; expires_at: string }

// Admin accounts are invite-only. The invite email links here with ?token=.
const Register = () => {
  const { mark, siteName } = useAdminBranding()
  const token = useQueryParams()['token'] ?? ''
  const [invite, setInvite] = useState<Invite | null | undefined>(token ? undefined : null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return
    supabase
      .rpc('peek_admin_invite', { p_token: token })
      .then(({ data }) => setInvite(Array.isArray(data) && data[0] ? (data[0] as Invite) : null))
  }, [token])

  const heading = done ? 'Account created' : invite ? `Join ${siteName} as ${roleLabel(invite.role)}` : 'Invitation required'

  return (
    <Col lg={4} className="mx-auto">
      <Card>
        <CardBody className="p-0 bg-black auth-header-box rounded-top">
          <div className="text-center p-3">
            <Link href="/" className="logo logo-admin">
              <Image src={mark} height={50} alt="logo" className="auth-logo" />
            </Link>
            <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">{heading}</h4>
            <p className="text-muted fw-medium mb-0">{siteName} admin accounts are created by invitation only.</p>
          </div>
        </CardBody>
        <CardBody className="pt-0">
          {invite === undefined && <p className="text-muted my-4 text-center">Checking your invitation…</p>}
          {invite === null && (
            <p className="text-muted my-4 text-center">
              {token
                ? 'This invitation link is invalid, already used or expired. Ask a super admin to send you a new one.'
                : 'Ask a super admin to send you an invite. The link in your invite email will bring you back here to set your password.'}
            </p>
          )}
          {invite && !done && <RegisterForm token={token} email={invite.email} onDone={() => setDone(true)} />}
          {done && (
            <div className="my-4 text-center">
              <p className="text-muted">Your admin account is ready. Sign in next; you will be asked to set up an authenticator app.</p>
              <Link href="/auth/login" className="btn btn-primary">
                Go to sign in
              </Link>
            </div>
          )}

          {!done && (
            <div className="text-center">
              <p className="text-muted">
                Already have an account?
                <Link href="/auth/login" className="text-primary ms-2">
                  Log in
                </Link>
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </Col>
  )
}

export default Register
