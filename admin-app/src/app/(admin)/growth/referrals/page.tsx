'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import FallbackLoading from '@/components/FallbackLoading'
import StatTiles from '@/investo/StatTiles'
import { formatDate, formatMoney } from '@/investo/format'
import { supabase } from '@/investo/services'
import { createReferralService, type ReferredUserSummary } from '../../../../../../src/services/api/referralService'
import type { Profile } from '../../../../../../src/types/database'

export const metadata: Metadata = { title: 'Referrals' }

const referralService = createReferralService(supabase)

type Analytics = Awaited<ReturnType<typeof referralService.getAdminAnalytics>>

// One expandable row of the referral tree; loads its downline on first open.
const TreeNode = ({ user, depth }: { user: ReferredUserSummary; depth: number }) => {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState<ReferredUserSummary[] | null>(null)

  const toggle = async () => {
    if (!open && children === null) setChildren(await referralService.getReferredUsers(user.id).catch(() => []))
    setOpen((o) => !o)
  }

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="d-flex align-items-center gap-2 py-1 border-bottom">
        <button type="button" className="btn btn-sm btn-light px-1 py-0" onClick={() => void toggle()} aria-label={open ? 'Collapse' : 'Expand'}>
          <IconifyIcon icon={open ? 'iconoir:nav-arrow-down' : 'iconoir:nav-arrow-right'} />
        </button>
        <Link href={`/customers/${user.id}`} className="text-body fw-medium">
          {user.fullName || user.email}
        </Link>
        <small className="text-muted ms-auto">
          invested {formatMoney(user.investedBalance)} · joined {formatDate(user.joinedAt)}
        </small>
      </div>
      {open && children?.length === 0 && (
        <p className="text-muted fs-12 mb-1" style={{ marginLeft: 28 }}>
          No referrals yet.
        </p>
      )}
      {open && children?.map((child) => <TreeNode key={child.id} user={child} depth={depth + 1} />)}
    </div>
  )
}

const toSummary = (p: Profile): ReferredUserSummary => ({
  id: p.id,
  fullName: p.fullName,
  email: p.email,
  investedBalance: p.investedBalance,
  totalBalance: p.totalBalance,
  joinedAt: p.createdAt,
})

// Referral analytics and the referral tree (ported from the old panel).
const Referrals = () => {
  const [data, setData] = useState<Analytics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    referralService
      .getAdminAnalytics()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load referrals.'))
  }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!data) return <FallbackLoading />

  const average = data.activeReferrers > 0 ? data.totalReferrals / data.activeReferrers : 0

  return (
    <>
      <StatTiles
        tiles={[
          { title: 'Total referrals', stat: String(data.totalReferrals), icon: 'iconoir:network-right', variant: 'primary' },
          { title: 'Active referrers', stat: String(data.activeReferrers), icon: 'iconoir:group', variant: 'info' },
          { title: 'Rewards paid', stat: formatMoney(data.referralEarnings), icon: 'iconoir:gift', variant: 'success' },
          { title: 'Referrals per referrer', stat: average.toFixed(1), subText: 'average', icon: 'iconoir:graph-up', variant: 'secondary' },
        ]}
      />
      <Row>
        <Col lg={5}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Top referrers</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {data.topReferrers.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No referrals yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Customer</th>
                        <th className="text-end">Referrals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topReferrers.map(({ user, referralCount }) => (
                        <tr key={user.id}>
                          <td>
                            <Link href={`/customers/${user.id}`} className="text-body">
                              {user.fullName || user.email}
                            </Link>
                            <small className="d-block text-muted">Code {user.referralCode}</small>
                          </td>
                          <td className="text-end fw-semibold">{referralCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={7}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Referral tree</CardTitle>
              <p className="text-muted mb-0 fs-12">Open a referrer to see who they brought in, and who those people brought in.</p>
            </CardHeader>
            <CardBody className="pt-0">
              {data.topReferrers.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No referral tree yet.</p>
              ) : (
                data.topReferrers.map(({ user }) => <TreeNode key={user.id} user={toSummary(user)} depth={0} />)
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Referrals
