import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { useAdminBranding } from '@/investo/useAdminBranding'
import { Card, CardBody, Col } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Register' }

// Admin accounts are invite-only. Until the invite flow ships, this page only
// explains that; the invite link will open this page with a token to redeem.
const Register = () => {
  const { mark, siteName } = useAdminBranding()
  return (
    <Col lg={4} className="mx-auto">
      <Card>
        <CardBody className="p-0 bg-black auth-header-box rounded-top">
          <div className="text-center p-3">
            <Link href="/" className="logo logo-admin">
              <Image src={mark} height={50} alt="logo" className="auth-logo" />
            </Link>
            <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Invitation required</h4>
            <p className="text-muted fw-medium mb-0">{siteName} admin accounts are created by invitation only.</p>
          </div>
        </CardBody>
        <CardBody className="pt-0">
          <p className="text-muted my-4 text-center">
            Ask a super admin to send you an invite. The link in your invite email will bring you back here to set your password.
          </p>

          <div className="text-center">
            <p className="text-muted">
              Already have an account?
              <Link href="/auth/login" className="text-primary ms-2">
                Log in
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </Col>
  )
}

export default Register
