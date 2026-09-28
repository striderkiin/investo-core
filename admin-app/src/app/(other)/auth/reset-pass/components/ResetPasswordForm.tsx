'use client'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import TextFormInput from '@/components/form/TextFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import { authService } from '@/investo/services'
import { Col, Row } from 'react-bootstrap'

const ResetPasswordForm = () => {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { showNotification } = useNotificationContext()

  const resetPasswordSchema = yup.object({
    email: yup.string().email('Enter a valid email').required('Email is required'),
  })

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(resetPasswordSchema),
  })

  // The emailed link opens the existing password-update page, which is
  // already an allowed Supabase auth redirect; admins then sign in here again.
  const sendResetLink = handleSubmit(async ({ email }) => {
    setLoading(true)
    try {
      await authService.requestPasswordReset(email, `${window.location.origin}/client-app/reset-password.html`)
      setSent(true)
    } catch (error) {
      showNotification({ message: error instanceof Error ? error.message : 'Could not send the reset link.', variant: 'danger' })
    } finally {
      setLoading(false)
    }
  })

  if (sent) {
    return (
      <div className="my-4 text-center">
        <p className="text-muted mb-0">If that email belongs to an account, a reset link is on its way. Check your inbox.</p>
      </div>
    )
  }

  return (
    <form className="my-4" onSubmit={sendResetLink}>
      <TextFormInput control={control} name="email" label="Email" placeholder="Enter your email" containerClassName="form-group mb-2" />

      <Row className="form-group mb-0">
        <Col xs={12}>
          <div className="d-grid mt-3">
            <button className="btn btn-primary flex-centered" type="submit" disabled={loading}>
              Send reset link <IconifyIcon icon="fa6-solid:right-to-bracket" className="ms-1" />
            </button>
          </div>
        </Col>
      </Row>
    </form>
  )
}

export default ResetPasswordForm
