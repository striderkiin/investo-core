'use client'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { invokeFunction } from '@/investo/functions'

type Props = { token: string; email: string; onDone: () => void }

// Accepts an admin invite: the email and role come from the invite, the
// person only chooses their name and password. 2FA setup follows at sign-in.
const RegisterForm = ({ token, email, onDone }: Props) => {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const registerSchema = yup.object({
    fullName: yup.string().trim().required('Enter your full name'),
    password: yup.string().min(10, 'Use at least 10 characters').required('Choose a password'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords must match')
      .required('Type the password again'),
  })

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(registerSchema),
  })

  const submit = handleSubmit(async ({ fullName, password }) => {
    setError(null)
    setSaving(true)
    try {
      await invokeFunction('accept-admin-invite', { token, fullName, password })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.')
    } finally {
      setSaving(false)
    }
  })

  return (
    <form className="my-4" onSubmit={submit}>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="form-group mb-2">
        <label className="form-label" htmlFor="invite-email">
          Email
        </label>
        <input id="invite-email" className="form-control" value={email} readOnly />
      </div>

      <TextFormInput control={control} name="fullName" label="Full name" placeholder="Your name" containerClassName="form-group mb-2" />

      <PasswordFormInput control={control} name="password" id="password" label="Password" placeholder="At least 10 characters" containerClassName="form-group mb-2" />

      <PasswordFormInput
        control={control}
        name="confirmPassword"
        id="confirmPassword"
        label="Confirm password"
        placeholder="Type it again"
        containerClassName="form-group mb-2"
      />

      <div className="form-group mb-0 row">
        <div className="col-12">
          <div className="d-grid mt-3">
            <button className="btn btn-primary flex-centered" type="submit" disabled={saving}>
              {saving ? 'Creating account…' : 'Create admin account'} <IconifyIcon icon="fa6-solid:right-to-bracket" className="ms-1" />
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default RegisterForm
