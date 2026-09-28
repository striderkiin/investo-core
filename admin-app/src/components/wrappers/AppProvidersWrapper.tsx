'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

import { NotificationProvider } from '@/context/useNotificationContext'
import type { ChildrenType } from '@/types/component-props'
import { Toaster } from 'sonner'
import { AuthProvider } from '../../../../src/features/auth/AuthContext'

const LayoutProvider = dynamic(() => import('@/context/useLayoutContext').then((mod) => mod.LayoutProvider), { ssr: false })

const AppProvidersWrapper = ({ children }: ChildrenType) => {
  useEffect(() => {
    if (document) {
      const e = document.querySelector<HTMLDivElement>('#__next_splash')
      if (e?.hasChildNodes()) {
        document.querySelector('#splash-screen')?.classList.add('remove')
      }
      e?.addEventListener('DOMNodeInserted', () => {
        document.querySelector('#splash-screen')?.classList.add('remove')
      })
    }
  }, [])

  return (
    <AuthProvider>
      <LayoutProvider>
        <NotificationProvider>
          {children}
          <Toaster richColors />
        </NotificationProvider>
      </LayoutProvider>
    </AuthProvider>
  )
}
export default AppProvidersWrapper
