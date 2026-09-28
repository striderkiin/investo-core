import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import ResetPasswordForm from './components/ResetPasswordForm'
import { useAdminBranding } from '@/investo/useAdminBranding'
import { Card, CardBody, Col } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Reset Password' }

const ResetPassword = () => {
  const { mark } = useAdminBranding()
  return (
    <Col lg={4} className="mx-auto">
      <Card>
        <CardBody className="p-0 bg-black auth-header-box rounded-top">
          <div className="text-center p-3">
            <Link href="/" className="logo logo-admin">
              <Image src={mark} height={50} alt="logo" className="auth-logo" />
            </Link>
            <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Reset Password</h4>
            <p className="text-muted fw-medium mb-0">Enter your email and we&apos;ll send you a reset link.</p>
          </div>
        </CardBody>
        <CardBody className="pt-0">
          <ResetPasswordForm />

          <div className="text-center  mb-2">
            <p className="text-muted">
              Remember it?{' '}
              <Link href="/auth/login" className="text-primary ms-2">
                Sign in here
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </Col>
  )
}

export default ResetPassword
