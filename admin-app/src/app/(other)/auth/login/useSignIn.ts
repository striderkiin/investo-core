'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'
import { useAuth } from '../../../../../../src/hooks/useAuth'
import { isAdminRole } from '../../../../../../src/types/roles'
import { getAssuranceLevel } from '@/investo/useAdminAccess'
import { authService, supabase } from '@/investo/services'

export type SignInStep = 'password' | 'code'

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)

const useSignIn = () => {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<SignInStep>('password')
  const { replace } = useRouter()
  const { showNotification } = useNotificationContext()
  const { login: signInWithPassword, logout, session } = useAuth()

  const queryParams = useQueryParams()
  const redirectTo = queryParams['redirectTo'] && queryParams['redirectTo'].startsWith('/') ? queryParams['redirectTo'] : '/dashboard'

  const loginFormSchema = yup.object({
    email: yup.string().email('Please enter a valid email').required('Please enter your email'),
    password: yup.string().required('Please enter your password'),
  })

  const codeFormSchema = yup.object({
    code: yup
      .string()
      .matches(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app')
      .required('Enter the 6-digit code from your authenticator app'),
  })

  const { control, handleSubmit } = useForm({ resolver: yupResolver(loginFormSchema) })
  const { control: codeControl, handleSubmit: handleCodeSubmit } = useForm({ resolver: yupResolver(codeFormSchema) })

  type LoginFormFields = yup.InferType<typeof loginFormSchema>
  type CodeFormFields = yup.InferType<typeof codeFormSchema>

  // Arriving here already signed in with the password but not the code (a
  // page refresh mid-login, or the admin guard sending the user back).
  useEffect(() => {
    if (!session) return
    let active = true
    void getAssuranceLevel()
      .then((level) => {
        if (!active) return
        if (level.next === 'aal2' && level.current !== 'aal2') setStep('code')
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [session])

  const continueAfterPassword = async () => {
    const level = await getAssuranceLevel()
    if (level.next !== 'aal2') {
      replace(`/auth/setup-2fa?redirectTo=${encodeURIComponent(redirectTo)}`)
    } else if (level.current !== 'aal2') {
      setStep('code')
    } else {
      replace(redirectTo)
    }
  }

  const login = handleSubmit(async (values: LoginFormFields) => {
    setLoading(true)
    try {
      await signInWithPassword({ email: values.email, password: values.password })
      const profile = await authService.getCurrentProfile()
      if (!profile || !isAdminRole(profile.role)) {
        await logout()
        showNotification({ message: 'This account does not have admin access.', variant: 'danger' })
        return
      }
      await continueAfterPassword()
    } catch (error) {
      showNotification({ message: errorMessage(error, 'Sign in failed. Check your email and password.'), variant: 'danger' })
    } finally {
      setLoading(false)
    }
  })

  const verifyCode = handleCodeSubmit(async (values: CodeFormFields) => {
    setLoading(true)
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError
      const factor = factors.totp[0]
      if (!factor) throw new Error('No authenticator is set up for this account.')
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: values.code })
      if (verifyError) throw verifyError
      replace(redirectTo)
    } catch (error) {
      showNotification({ message: errorMessage(error, 'That code did not work. Try the current code.'), variant: 'danger' })
    } finally {
      setLoading(false)
    }
  })

  const cancelCode = async () => {
    await logout()
    setStep('password')
  }

  return { loading, login, control, step, verifyCode, codeControl, cancelCode }
}

export default useSignIn
