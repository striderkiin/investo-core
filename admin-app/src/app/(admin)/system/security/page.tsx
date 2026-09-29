'use client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import FallbackLoading from '@/components/FallbackLoading'
import { useNotificationContext } from '@/context/useNotificationContext'
import StatTiles from '@/investo/StatTiles'
import { lookupCustomers, type CustomerSummary } from '@/investo/customerLookup'
import { statusLabel, timeAgo } from '@/investo/format'
import { securityService, supabase } from '@/investo/services'
import type { SecurityEvent, UserSession } from '../../../../../../src/services/api/securityService'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Security Center' }

type Counts = Awaited<ReturnType<typeof securityService.getSecurityCounts>>

// Short, readable device from a user agent string.
const device = (ua: string | null) => {
  if (!ua) return 'Unknown device'
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${browser} on ${os}`
}

// Sessions, blocked accounts and security events (ported from the old panel).
const SecurityCenter = () => {
  const { can } = usePermission()
  const { showNotification } = useNotificationContext()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [people, setPeople] = useState<Map<string, CustomerSummary>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [c, s, e] = await Promise.all([securityService.getSecurityCounts(), securityService.listActiveSessions(100), securityService.listSecurityEvents(100)])
      setPeople(await lookupCustomers([...s.map((x) => x.userId), ...e.flatMap((x) => (x.userId ? [x.userId] : []))]))
      setCounts(c)
      setSessions(s)
      setEvents(e)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the security center.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const signOut = async (userId: string) => {
    const name = people.get(userId)?.name ?? 'this user'
    if (!window.confirm(`Sign ${name} out of every device? They will need to sign in again.`)) return
    const { data, error: rpcError } = await supabase.rpc('admin_sign_out_user', { p_user_id: userId })
    if (rpcError) return showNotification({ message: rpcError.message, variant: 'danger' })
    showNotification({ message: `Signed out of ${data ?? 0} session(s).`, variant: 'success' })
    void load()
  }

  const who = (userId: string | null) => {
    if (!userId) return <span className="text-muted">-</span>
    const p = people.get(userId)
    return (
      <Link href={`/customers/${userId}`} className="text-body">
        {p?.name ?? userId.slice(0, 8)}
      </Link>
    )
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!counts) return <FallbackLoading />

  return (
    <>
      <StatTiles
        tiles={[
          { title: 'Blocked accounts', stat: String(counts.blockedUsers), subText: 'suspended or frozen', icon: 'iconoir:user-xmark', variant: 'danger' },
          { title: 'Active sessions', stat: String(counts.activeSessions), icon: 'iconoir:laptop', variant: 'primary' },
          { title: 'Admin sessions', stat: String(counts.adminSessions), icon: 'iconoir:shield-check', variant: 'warning' },
          { title: 'Security events', stat: String(counts.securityEvents), subText: 'all time', icon: 'iconoir:warning-triangle', variant: 'secondary' },
        ]}
      />
      <Row>
        <Col lg={7}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Active sessions</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {sessions.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No one is signed in.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0 text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>User</th>
                        <th>Device</th>
                        <th>Last active</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id}>
                          <td>
                            {who(s.userId)}
                            {s.isAdminSession && <span className="badge bg-warning-subtle text-warning ms-1">Admin</span>}
                          </td>
                          <td title={s.userAgent ?? ''}>{device(s.userAgent)}</td>
                          <td>{timeAgo(s.lastActiveAt)}</td>
                          <td className="text-end">
                            {can('users.manage_status') && (
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void signOut(s.userId)}>
                                Sign out everywhere
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Security events</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {events.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No security events recorded.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0 text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>Event</th>
                        <th>User</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={e.id}>
                          <td>{statusLabel(e.eventType)}</td>
                          <td>{who(e.userId)}</td>
                          <td>{timeAgo(e.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default SecurityCenter
