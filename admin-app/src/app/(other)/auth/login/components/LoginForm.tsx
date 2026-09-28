'use client'
import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import useSignIn from '../useSignIn'
import { Col } from 'react-bootstrap'

const LoginForm = () => {
  const { loading, login, control, step, verifyCode, codeControl, cancelCode } = useSignIn()

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="my-4">
        <p className="text-muted mb-3">Enter the 6-digit code from your authenticator app to finish signing in.</p>
        <TextFormInput
          control={codeControl}
          name="code"
          label="Authentication code"
          containerClassName="form-group mb-2"
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
        />
        <div className="form-group mb-0 row">
          <Col xs={12}>
            <div className="d-grid mt-3">
              <button className="btn btn-primary flex-centered" type="submit" disabled={loading}>
                Verify <IconifyIcon icon="fa6-solid:right-to-bracket" className="ms-1" />
              </button>
            </div>
            <div className="text-center mt-3">
              <button type="button" className="btn btn-link text-muted font-13 p-0" onClick={() => void cancelCode()}>
                Use a different account
              </button>
            </div>
          </Col>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={login} className="my-4">
      <TextFormInput control={control} name="email" label="Email" containerClassName="form-group mb-2" placeholder="Enter your email" autoComplete="email" />

      <PasswordFormInput
        control={control}
        name="password"
        id="password"
        label="Password"
        containerClassName="form-group"
        placeholder="Enter your password"
        autoComplete="current-password"
      />

      <div className="form-group row mt-3">
        <Col sm={12} className="text-end">
          <Link href="/auth/reset-pass" className="text-muted font-13">
            {' '}
            Forgot password?
          </Link>
        </Col>
      </div>
      <div className="form-group mb-0 row">
        <Col xs={12}>
          <div className="d-grid mt-3">
            <button className="btn btn-primary flex-centered" type="submit" disabled={loading}>
              Log In <IconifyIcon icon="fa6-solid:right-to-bracket" className="ms-1" />
            </button>
          </div>
        </Col>
      </div>
    </form>
  )
}

export default LoginForm
