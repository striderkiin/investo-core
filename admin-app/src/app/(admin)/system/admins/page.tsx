'use client'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import UserAvatar from '@/investo/UserAvatar'
import { formatDate, formatDateTime } from '@/investo/format'
import { sendEmail } from '@/investo/functions'
import { roleLabel } from '@/investo/roles'
import { supabase, userService } from '@/investo/services'
import type { Profile } from '../../../../../../src/types/database'
import type { RoleName } from '../../../../../../src/types/roles'
import { useAuth } from '../../../../../../src/hooks/useAuth'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Admins' }

const ADMIN_ROLES: { value: RoleName; hint: string }[] = [
  { value: 'support_admin', hint: 'Customers, support chat, notifications' },
  { value: 'finance_admin', hint: 'Deposits, withdrawals, treasury' },
  { value: 'operations_admin', hint: 'Plans, announcements, branding, market' },
  { value: 'demo_admin', hint: 'Shareable demo login; no keys, admins or settings' },
  { value: 'super_admin', hint: 'Everything, including other admins' },
]

const ROLE_VARIANT: Partial<Record<RoleName, string>> = {
  super_admin: 'danger',
  finance_admin: 'primary',
  support_admin: 'info',
  operations_admin: 'success',
  demo_admin: 'warning',
}

type Invite = { id: string; email: string; role: RoleName; expires_at: string; created_at: string }
type NewInvite = { email: string; link: string; emailed: boolean; emailError: string | null }

const Admins = () => {
  const { profile: me } = useAuth()
  const { can } = usePermission()
  const { showNotification } = useNotificationContext()
  const [admins, setAdmins] = useState<Profile[] | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<RoleName>('support_admin')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<NewInvite | null>(null)
  const isSuper = me?.role === 'super_admin'

  const load = useCallback(async () => {
    const [list, { data }] = await Promise.all([
      userService.listAdmins().catch(() => [] as Profile[]),
      supabase
        .from('admin_invites')
        .select('id, email, role, expires_at, created_at')
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ])
    setAdmins(list)
    setInvites((data ?? []) as Invite[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const notifyError = (err: unknown, fallback: string) =>
    showNotification({ message: err instanceof Error ? err.message : fallback, variant: 'danger' })

  const invite = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setCreated(null)
    try {
      const { data, error } = await supabase.rpc('create_admin_invite', { p_email: email.trim(), p_role: role })
      if (error) throw error
      const row = (Array.isArray(data) ? data[0] : data) as { invite_id: string; token: string }
      const link = `${window.location.origin}/admin/auth/register?token=${row.token}`
      let emailed = false
      let emailError: string | null = null
      try {
        await sendEmail('admin_invite', { inviteId: row.invite_id, token: row.token })
        emailed = true
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'The email could not be sent.'
      }
      setCreated({ email: email.trim().toLowerCase(), link, emailed, emailError })
      setEmail('')
      void load()
    } catch (err) {
      notifyError(err, 'Could not create the invite.')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (item: Invite) => {
    if (!window.confirm(`Cancel the invite for ${item.email}? The link stops working.`)) return
    const { error } = await supabase.rpc('revoke_admin_invite', { p_invite_id: item.id })
    if (error) return notifyError(error, 'Could not cancel the invite.')
    showNotification({ message: 'Invite cancelled.', variant: 'success' })
    void load()
  }

  const changeRole = async (admin: Profile, next: RoleName) => {
    const label = next === 'client' ? 'remove admin access from' : `make ${roleLabel(next)}:`
    if (!window.confirm(`Are you sure you want to ${label} ${admin.fullName || admin.email}?`)) return
    try {
      await userService.setRole(admin.id, next)
      showNotification({ message: next === 'client' ? 'Admin access removed.' : 'Role changed.', variant: 'success' })
      void load()
    } catch (err) {
      notifyError(err, 'Could not change the role.')
    }
  }

  const signOut = async (admin: Profile) => {
    if (!window.confirm(`Sign ${admin.fullName || admin.email} out of every device?`)) return
    const { data, error } = await supabase.rpc('admin_sign_out_user', { p_user_id: admin.id })
    if (error) return notifyError(error, 'Could not sign them out.')
    showNotification({ message: `Signed out of ${data ?? 0} session(s).`, variant: 'success' })
  }

  return (
    <>
      <Row>
        <Col lg={5}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Invite an admin</CardTitle>
              <p className="text-muted mb-0 fs-12">The link works once and expires after 48 hours. They set their own password and authenticator.</p>
            </CardHeader>
            <CardBody className="pt-0">
              <form onSubmit={invite}>
                <div className="mb-3">
                  <label htmlFor="invite-email" className="form-label">
                    Email
                  </label>
                  <input id="invite-email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label htmlFor="invite-role" className="form-label">
                    Role
                  </label>
                  <select id="invite-role" className="form-select" value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
                    {ADMIN_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {roleLabel(r.value)}: {r.hint}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={busy || !email.trim()}>
                  {busy ? 'Creating invite…' : 'Send invite'}
                </button>
              </form>
              {created && (
                <div className={`alert ${created.emailed ? 'alert-success' : 'alert-warning'} mt-3 mb-0`}>
                  <p className="mb-2">
                    {created.emailed ? `Invite emailed to ${created.email}.` : `Invite created, but the email was not sent: ${created.emailError}`}{' '}
                    {created.emailed ? 'You can also copy the link:' : 'Copy the link and send it to them yourself:'}
                  </p>
                  <div className="input-group">
                    <input className="form-control form-control-sm" value={created.link} readOnly onFocus={(e) => e.target.select()} />
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => void navigator.clipboard?.writeText(created.link).then(() => showNotification({ message: 'Link copied.', variant: 'success' }))}>
                      <IconifyIcon icon="iconoir:copy" /> Copy
                    </button>
                  </div>
                  <small className="d-block mt-2">This link is shown only once. If it gets lost, send a new invite.</small>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Pending invites</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {invites.length === 0 ? (
                <p className="text-muted mb-0">No pending invites.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {invites.map((item) => (
                    <li key={item.id} className="list-group-item px-0 d-flex align-items-center justify-content-between gap-2">
                      <div>
                        <div className="fw-medium">{item.email}</div>
                        <small className="text-muted">
                          {roleLabel(item.role)} · expires {formatDateTime(item.expires_at)}
                        </small>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void revoke(item)}>
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={7}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Admin team</CardTitle>
              <p className="text-muted mb-0 fs-12">Only a super admin can change roles, remove access or sign an admin out.</p>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Admin</th>
                      <th>Role</th>
                      <th>Since</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(admins ?? []).map((admin) => (
                      <tr key={admin.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <UserAvatar photoUrl={admin.avatarUrl} avatarKey={admin.avatarKey} name={admin.fullName || admin.email} className="thumb-md me-2" />
                            <div>
                              <div className="fw-medium">
                                {admin.fullName || 'No name'} {admin.id === me?.id && <span className="badge bg-light text-dark ms-1">You</span>}
                              </div>
                              <small className="text-muted">{admin.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge bg-${ROLE_VARIANT[admin.role] ?? 'secondary'}-subtle text-${ROLE_VARIANT[admin.role] ?? 'secondary'}`}>
                            {roleLabel(admin.role)}
                          </span>
                        </td>
                        <td>{formatDate(admin.createdAt)}</td>
                        <td className="text-end">
                          {isSuper && can('roles.manage') && admin.id !== me?.id && (
                            <Dropdown align="end">
                              <DropdownToggle variant="light" size="sm">
                                Manage
                              </DropdownToggle>
                              <DropdownMenu>
                                {ADMIN_ROLES.filter((r) => r.value !== admin.role).map((r) => (
                                  <DropdownItem key={r.value} onClick={() => void changeRole(admin, r.value)}>
                                    Make {roleLabel(r.value)}
                                  </DropdownItem>
                                ))}
                                <DropdownDivider />
                                <DropdownItem onClick={() => void signOut(admin)}>Sign out of all devices</DropdownItem>
                                <DropdownItem className="text-danger" onClick={() => void changeRole(admin, 'client')}>
                                  Remove admin access
                                </DropdownItem>
                              </DropdownMenu>
                            </Dropdown>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Admins
