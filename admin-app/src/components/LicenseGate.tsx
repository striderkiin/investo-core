import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Alert, Card, CardBody } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { ChildrenType } from '@/types/component-props'
import { supabase } from '@/investo/services'
import { createLicenseService, type LicenseState } from '../../../src/services/api/licenseService'

const licenseService = createLicenseService(supabase)

// Pages that stay open while the site is locked, so customers can still be paid.
const OPEN_WHEN_LOCKED = [/^\/withdrawals(\/|$)/, /^\/support(\/|$)/]

const longDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '')

/**
 * Shows the subscription reminder during the grace period and, once the site
 * is locked, replaces every page except Withdrawals and Support with a notice.
 * The database refuses new deposits and investments on its own; this only
 * explains it to the site's admins.
 */
const LicenseGate = ({ children }: ChildrenType) => {
  const pathname = usePathname() ?? ''
  const [license, setLicense] = useState<LicenseState | null>(null)

  useEffect(() => {
    licenseService.get().then(setLicense).catch(() => setLicense(null))
  }, [])

  if (!license || license.status === 'active') return <>{children}</>

  if (license.status === 'grace') {
    return (
      <>
        <Alert variant="warning" className="d-flex align-items-start gap-2 mt-3">
          <IconifyIcon icon="iconoir:warning-triangle" className="fs-20 flex-shrink-0" />
          <div>
            <strong>Your subscription payment is due.</strong>{' '}
            {license.message || `Please pay${license.locksOn ? ` by ${longDate(license.locksOn)}` : ''} to keep your site running. After that, new deposits and investments are paused until payment is received.`}
          </div>
        </Alert>
        {children}
      </>
    )
  }

  const notice = (
    <Alert variant="danger" className="d-flex align-items-start gap-2 mt-3">
      <IconifyIcon icon="iconoir:lock" className="fs-20 flex-shrink-0" />
      <div>
        <strong>Your site is paused.</strong>{' '}
        {license.message || 'Your subscription payment is overdue. New deposits and investments are paused until payment is received.'} Withdrawals and
        support keep working so your customers can still be paid.
      </div>
    </Alert>
  )

  if (OPEN_WHEN_LOCKED.some((rule) => rule.test(pathname))) {
    return (
      <>
        {notice}
        {children}
      </>
    )
  }

  return (
    <>
      {notice}
      <Card>
        <CardBody className="text-center py-5">
          <IconifyIcon icon="iconoir:lock" className="text-danger mb-3" style={{ fontSize: 48 }} />
          <h4 className="mb-2">This page is unavailable while your site is paused</h4>
          <p className="text-muted mb-4">Contact your provider to pay and unlock the site. Everything is kept as it was.</p>
          <div className="d-flex justify-content-center gap-2">
            <Link href="/withdrawals" className="btn btn-primary">
              Open Withdrawals
            </Link>
            <Link href="/support" className="btn btn-light">
              Open Support
            </Link>
          </div>
        </CardBody>
      </Card>
    </>
  )
}

export default LicenseGate
