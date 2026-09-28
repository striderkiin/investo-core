import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import LoginForm from './components/LoginForm'
import { useAdminBranding } from '@/investo/useAdminBranding'

import { Card, CardBody, Col } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Login' }

const Login = () => {
  const { siteName, mark } = useAdminBranding()
  return (
    <Col lg={4} className="mx-auto">
      <Card>
        <CardBody className="p-0 bg-black auth-header-box rounded-top">
          <div className="text-center p-3">
            <Link href="/" className="logo logo-admin">
              <Image src={mark} height={50} alt="logo" className="auth-logo" />
            </Link>
            <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">{siteName} Admin</h4>
            <p className="text-muted fw-medium mb-0">Sign in to continue to the admin panel.</p>
          </div>
        </CardBody>
        <CardBody className="pt-0">
          <LoginForm />

          <div className="text-center mb-2">
            <p className="text-muted mb-0">Admin accounts are created by invitation only.</p>
          </div>
        </CardBody>
      </Card>
    </Col>
  )
}

export default Login
