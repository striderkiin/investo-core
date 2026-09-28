import { useEffect, useState } from 'react'

import { useAuth } from '../../../src/hooks/useAuth'
import { isAdminRole } from '../../../src/types/roles'
import { supabase } from './services'

export type AdminAccess =
  | 'loading'
  | 'signed-out'
  | 'not-admin'
  // Password accepted, but a verified authenticator exists and its code hasn't been entered this session.
  | 'needs-mfa-code'
  // Signed-in admin with no authenticator yet; admins must enroll one before seeing any data.
  | 'needs-mfa-setup'
  | 'ok'

type AssuranceLevel = { current: string | null; next: string | null }

export const getAssuranceLevel = async (): Promise<AssuranceLevel> => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  return { current: data.currentLevel, next: data.nextLevel }
}

export const useAdminAccess = (): AdminAccess => {
  const { session, profile, isLoading, error } = useAuth()
  const [assurance, setAssurance] = useState<AssuranceLevel | null>(null)
  const accessToken = session?.access_token

  useEffect(() => {
    if (!accessToken) {
      setAssurance(null)
      return
    }
    let active = true
    getAssuranceLevel()
      .then((level) => active && setAssurance(level))
      .catch(() => active && setAssurance({ current: null, next: null }))
    return () => {
      active = false
    }
  }, [accessToken])

  if (isLoading) return 'loading'
  if (!session) return 'signed-out'
  if (!profile) return error ? 'signed-out' : 'loading'
  if (!isAdminRole(profile.role)) return 'not-admin'
  if (!assurance) return 'loading'
  if (assurance.next !== 'aal2') return 'needs-mfa-setup'
  if (assurance.current !== 'aal2') return 'needs-mfa-code'
  return 'ok'
}
