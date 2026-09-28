import dynamic from 'next/dynamic'

import type { ChildrenType } from '@/types/component-props'
import Footer from '@/components/layout/Footer'
import FallbackLoading from '@/components/FallbackLoading'
import { Suspense } from 'react'
import AuthProtectionWrapper from '@/components/wrappers/AuthProtectionWrapper'

const TopNavigationBar = dynamic(() => import('@/components/layout/TopNavigationBar'))
const VerticalNavigationBar = dynamic(() => import('@/components/layout/VerticalNavigationBar'))

const AdminLayout = ({ children }: ChildrenType) => {
  return (
    <AuthProtectionWrapper>
      <Suspense>
        <TopNavigationBar />
      </Suspense>

      <Suspense fallback={<FallbackLoading />}>
        <VerticalNavigationBar />
      </Suspense>

      <div className="page-wrapper">
        <div className="page-content">
          <div className="container-xxl">
            <Suspense>{children}</Suspense>
          </div>
          <Footer />
        </div>
      </div>
    </AuthProtectionWrapper>
  )
}

export default AdminLayout
