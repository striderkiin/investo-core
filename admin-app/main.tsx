import { Component, StrictMode, cloneElement, isValidElement, useEffect, useState, type ComponentType, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'

import Image from 'next/image'
import NextTopLoader from 'nextjs-toploader'
import type { Metadata } from 'next'
import { NotFoundError } from 'next/navigation'

import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import AppProvidersWrapper from '@/components/wrappers/AppProvidersWrapper'
import AdminLayout from '@/app/(admin)/layout'
import OtherLayout from '@/app/(other)/layout'
import NotFound from '@/app/not-found'

import * as AnalyticsPage from '@/app/(admin)/dashboard/analytics/page'
import * as ChatPage from '@/app/(admin)/apps/chat/page'
import * as CustomersPage from '@/app/(admin)/apps/ecommerce/customers/page'
import * as CustomerDetailsPage from '@/app/(admin)/apps/ecommerce/customers/[customerId]/page'
import * as OrdersPage from '@/app/(admin)/apps/ecommerce/orders/page'
import * as OrderDetailsPage from '@/app/(admin)/apps/ecommerce/orders/[orderId]/page'
import * as WithdrawalsPage from '@/app/(admin)/apps/ecommerce/withdrawals/page'
import * as WithdrawalDetailsPage from '@/app/(admin)/apps/ecommerce/withdrawals/[withdrawalId]/page'
import * as InvestmentsPage from '@/app/(admin)/apps/investments/page'
import * as TransactionsPage from '@/app/(admin)/apps/transactions/page'
import * as AdminsPage from '@/app/(admin)/system/admins/page'
import * as IntegrationsPage from '@/app/(admin)/system/integrations/page'
import * as ContactMessagesPage from '@/app/(admin)/apps/contact-messages/page'
import * as KycPage from '@/app/(admin)/compliance/kyc/page'
import * as ReferralsPage from '@/app/(admin)/growth/referrals/page'
import * as AuditLogsPage from '@/app/(admin)/system/audit-logs/page'
import * as SecurityPage from '@/app/(admin)/system/security/page'
import * as TreasuryPage from '@/app/(admin)/money/treasury/page'
import * as MarketPage from '@/app/(admin)/market/page'
import * as SocialProofPage from '@/app/(admin)/engagement/social-proof/page'
import * as ActivityPage from '@/app/(admin)/system/activity/page'
import * as MaintenancePage from '@/app/(admin)/system/maintenance/page'
import * as BrandingPage from '@/app/(admin)/system/branding/page'
import * as SettingsPage from '@/app/(admin)/system/settings/page'
import * as SandboxPage from '@/app/(admin)/system/sandbox/page'
import * as InvoicePage from '@/app/(admin)/apps/invoice/page'
import * as ProfilePage from '@/app/(admin)/pages/profile/page'
import * as NotificationsPage from '@/app/(admin)/pages/notifications/page'
import * as PricingPage from '@/app/(admin)/pages/pricing/page'
import * as LoginPage from '@/app/(other)/auth/login/page'
import * as RegisterPage from '@/app/(other)/auth/register/page'
import * as ResetPasswordPage from '@/app/(other)/auth/reset-pass/page'
import * as SetupTwoFactorPage from '@/app/(other)/auth/setup-2fa/page'

import { useAdminBranding } from '@/investo/useAdminBranding'

import '@/assets/scss/app.scss'
import '@/assets/scss/icons.scss'
import '@/investo/investo.scss'

// Stands in for the template's Next.js file-system router: each route below
// maps to the page file at the same path under src/app/, wrapped in the same
// layout group ((admin) or (other)) it sits in there.

type PageProps = { params: Record<string, string>; searchParams: Record<string, string> }

// Page props are typed loosely: each dynamic page declares its own param
// names (customerId, orderId), which the router fills from the URL.
type PageModule = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ComponentType<any> | ((props: any) => Promise<ReactNode>)
  metadata?: Metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateMetadata?: (props: any) => Promise<Metadata>
}

const TITLE_TEMPLATE = '%s | Investo Admin'

const toTitle = (metadata?: Metadata) => {
  const title = metadata?.title
  if (typeof title === 'string') return TITLE_TEMPLATE.replace('%s', title)
  return title?.default ?? DEFAULT_PAGE_TITLE
}

const isAsync = (fn: unknown) => typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'

// Server components in the template are async functions with no hooks. A page
// and any async components inside its markup (e.g. the customer page's
// <Orders />) are called and awaited here, the way Next renders them on the
// server, before the result is handed to React.
const resolveServerTree = async (node: ReactNode): Promise<ReactNode> => {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree))
  if (!isValidElement(node)) return node
  const element = node as ReactElement<{ children?: ReactNode }>
  if (isAsync(element.type)) {
    const render = element.type as (props: unknown) => Promise<ReactNode>
    return resolveServerTree(await render(element.props))
  }
  if (element.props.children === undefined) return element
  const children = await resolveServerTree(element.props.children)
  return cloneElement(element, undefined, ...(Array.isArray(children) ? children : [children]))
}

const AsyncPage = ({ page, props }: { page: (props: PageProps) => Promise<ReactNode>; props: PageProps }) => {
  const [state, setState] = useState<{ node: ReactNode } | { notFound: true } | null>(null)
  const key = JSON.stringify(props)

  useEffect(() => {
    let active = true
    page(props)
      .then(resolveServerTree)
      .then((node) => active && setState({ node }))
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof NotFoundError) setState({ notFound: true })
        else
          setState(() => {
            throw error
          })
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, key])

  if (!state) return null
  if ('notFound' in state) return <NotFound />
  return <>{state.node}</>
}

const Page = ({ module }: { module: PageModule }) => {
  const params = useParams() as Record<string, string>
  const [searchParams] = useSearchParams()
  const props: PageProps = { params, searchParams: Object.fromEntries(searchParams) }
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    if (module.generateMetadata) {
      void module.generateMetadata(props).then((metadata) => (document.title = toTitle(metadata)))
    } else {
      document.title = toTitle(module.metadata)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, paramsKey])

  const Component = module.default
  if (isAsync(Component)) return <AsyncPage page={Component as (props: PageProps) => Promise<ReactNode>} props={props} />
  const SyncComponent = Component as ComponentType<PageProps>
  return <SyncComponent {...props} />
}

const NotFoundRoute = () => {
  useEffect(() => {
    document.title = DEFAULT_PAGE_TITLE
  }, [])
  return <NotFound />
}

// AppProvidersWrapper hides the splash screen on the legacy DOMNodeInserted
// event, which current browsers no longer fire; this observes the same
// container and hides the splash once content is inserted into it.
const useRemoveSplashOnContent = () => {
  useEffect(() => {
    const container = document.querySelector('#__next_splash')
    const splash = document.querySelector('#splash-screen')
    if (!container || !splash) return
    const removeSplash = () => {
      if (!container.hasChildNodes()) return false
      splash.classList.add('remove')
      return true
    }
    if (removeSplash()) return
    const observer = new MutationObserver(() => {
      if (removeSplash()) observer.disconnect()
    })
    observer.observe(container, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
}

const useBrandFavicon = (href: string) => {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = href
  }, [href])
}

// The panel lives at /admin; /admin-app is the address it launched under
// and stays working so older links and bookmarks still open it.
const BASENAME = /^\/admin-app(\/|$)/.test(window.location.pathname) ? '/admin-app' : '/admin'

// Paths from the previous admin panel that moved in this one.
const LEGACY_REDIRECTS: Record<string, string> = {
  financial: '/treasury',
  users: '/customers',
  announcements: '/notifications',
  maintenance: '/system/maintenance',
  activity: '/system/activity',
  'white-label': '/system/branding',
  branding: '/system/branding',
  integrations: '/system/integrations',
  'sandbox-testing': '/system/sandbox',
  security: '/system/security',
  admins: '/system/admins',
  'audit-logs': '/system/audit-logs',
  settings: '/system/settings',
}

// A page that throws while rendering shows its error here, inside the normal
// layout, instead of blanking the whole panel. Keyed by path, so moving to
// another page clears it.
class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('Admin page crashed:', error)
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="card">
        <div className="card-body">
          <h4 className="mb-2">This page hit an error</h4>
          <p className="text-muted mb-2">The rest of the panel still works. If this keeps happening, send a screenshot of this box.</p>
          <pre className="bg-light p-2 rounded fs-12 text-danger" style={{ whiteSpace: 'pre-wrap' }}>
            {error.name}: {error.message}
            {'\n'}
            {(error.stack ?? '').split('\n').slice(1, 6).join('\n')}
          </pre>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}

const GuardedOutlet = () => {
  const { pathname } = useLocation()
  return (
    <PageErrorBoundary key={pathname}>
      <Outlet />
    </PageErrorBoundary>
  )
}

const RootLayout = () => {
  const { logoOnLight, mark, siteName } = useAdminBranding()
  useRemoveSplashOnContent()
  useBrandFavicon(mark)
  return (
    <>
      <div id="splash-screen">
        <Image alt={siteName} height={46} src={logoOnLight} style={{ height: 46, width: 'auto' }} priority />
      </div>
      <NextTopLoader color="#a8442e" showSpinner={false} />
      <div id="__next_splash">
        <AppProvidersWrapper>
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </AppProvidersWrapper>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={BASENAME}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route
            element={
              <AdminLayout>
                <GuardedOutlet />
              </AdminLayout>
            }
          >
            <Route path="dashboard" element={<Page module={AnalyticsPage} />} />
            <Route path="customers" element={<Page module={CustomersPage} />} />
            <Route path="customers/:customerId" element={<Page module={CustomerDetailsPage} />} />
            <Route path="deposits" element={<Page module={OrdersPage} />} />
            <Route path="deposits/:orderId" element={<Page module={OrderDetailsPage} />} />
            <Route path="withdrawals" element={<Page module={WithdrawalsPage} />} />
            <Route path="withdrawals/:withdrawalId" element={<Page module={WithdrawalDetailsPage} />} />
            <Route path="investments" element={<Page module={InvestmentsPage} />} />
            <Route path="transactions" element={<Page module={TransactionsPage} />} />
            <Route path="statement" element={<Page module={InvoicePage} />} />
            <Route path="system/admins" element={<Page module={AdminsPage} />} />
            <Route path="system/integrations" element={<Page module={IntegrationsPage} />} />
            <Route path="plans" element={<Page module={PricingPage} />} />
            <Route path="support" element={<Page module={ChatPage} />} />
            <Route path="notifications" element={<Page module={NotificationsPage} />} />
            <Route path="contact-messages" element={<Page module={ContactMessagesPage} />} />
            <Route path="kyc" element={<Page module={KycPage} />} />
            <Route path="referrals" element={<Page module={ReferralsPage} />} />
            <Route path="system/audit-logs" element={<Page module={AuditLogsPage} />} />
            <Route path="system/security" element={<Page module={SecurityPage} />} />
            <Route path="treasury" element={<Page module={TreasuryPage} />} />
            <Route path="market" element={<Page module={MarketPage} />} />
            <Route path="social-proof" element={<Page module={SocialProofPage} />} />
            <Route path="system/activity" element={<Page module={ActivityPage} />} />
            <Route path="system/maintenance" element={<Page module={MaintenancePage} />} />
            <Route path="system/branding" element={<Page module={BrandingPage} />} />
            <Route path="system/settings" element={<Page module={SettingsPage} />} />
            <Route path="system/sandbox" element={<Page module={SandboxPage} />} />
            <Route path="profile" element={<Page module={ProfilePage} />} />
          </Route>
          <Route
            element={
              <OtherLayout>
                <Outlet />
              </OtherLayout>
            }
          >
            <Route path="auth/login" element={<Page module={LoginPage} />} />
            <Route path="auth/register" element={<Page module={RegisterPage} />} />
            <Route path="auth/reset-pass" element={<Page module={ResetPasswordPage} />} />
            <Route path="auth/setup-2fa" element={<Page module={SetupTwoFactorPage} />} />
          </Route>
          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
