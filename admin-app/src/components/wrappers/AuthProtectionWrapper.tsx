'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense } from 'react'

import type { ChildrenType } from '@/types/component-props'
import { useAdminAccess } from '@/investo/useAdminAccess'
import { supabase } from '@/investo/services'
import { useAuth } from '../../../../src/hooks/useAuth'
import { mountDemoTimer } from '../../../../src/shared/demoSession'
import FallbackLoading from '../FallbackLoading'

const AuthProtectionWrapper = ({ children }: ChildrenType) => {
  const access = useAdminAccess()
  const { replace } = useRouter()
  const pathname = usePathname()
  const { session } = useAuth()
  const userId = session?.user.id

  useEffect(() => {
    if (access === 'signed-out' || access === 'needs-mfa-code') {
      replace(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`)
    } else if (access === 'needs-mfa-setup') {
      replace(`/auth/setup-2fa?redirectTo=${encodeURIComponent(pathname)}`)
    } else if (access === 'not-admin') {
      // Signed in as a customer: the client dashboard is a separate static app.
      window.location.replace('/client-app/index.html')
    }
  }, [access, pathname, replace])

  // Visitors signed in from /demo get a countdown and are signed out at zero.
  useEffect(() => {
    if (access === 'ok') mountDemoTimer(userId, () => supabase.auth.signOut())
  }, [access, userId])

  if (access !== 'ok') return <FallbackLoading />

  return <Suspense>{children}</Suspense>
}

export default AuthProtectionWrapper
