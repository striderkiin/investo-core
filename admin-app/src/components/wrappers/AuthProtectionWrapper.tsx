'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense } from 'react'

import type { ChildrenType } from '@/types/component-props'
import { useAdminAccess } from '@/investo/useAdminAccess'
import FallbackLoading from '../FallbackLoading'

const AuthProtectionWrapper = ({ children }: ChildrenType) => {
  const access = useAdminAccess()
  const { replace } = useRouter()
  const pathname = usePathname()

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

  if (access !== 'ok') return <FallbackLoading />

  return <Suspense>{children}</Suspense>
}

export default AuthProtectionWrapper
