'use client'
import { Button, Card, CardBody, Col, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import Image from 'next/image'
import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'
import { formatDate } from '@/investo/format'
import { roleLabel } from '@/investo/roles'
import { supabase, userService } from '@/investo/services'

import notificationImg from '@/assets/images/extra/card/notification.gif'
import type { Metadata } from 'next'
import {
  createAnnouncementService,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementDelivery,
  type AnnouncementType,
} from '../../../../../../src/services/api/announcementService'
import type { Profile } from '../../../../../../src/types/database'
import type { RoleName } from '../../../../../../src/types/roles'
import { useAuth } from '../../../../../../src/hooks/useAuth'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Notifications' }

const announcementService = createAnnouncementService(supabase)

const TYPES: { value: AnnouncementType; label: string; icon: string; variant: string }[] = [
  { value: 'important_notice', label: 'Important notice', icon: 'iconoir:warning-circle', variant: 'danger' },
  { value: 'system_update', label: 'System update', icon: 'iconoir:refresh-double', variant: 'info' },
  { value: 'promotion', label: 'Promotion', icon: 'iconoir:gift', variant: 'success' },
  { value: 'maintenance_notice', label: 'Maintenance', icon: 'iconoir:tools', variant: 'warning' },
]
const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'clients', label: 'All customers' },
  { value: 'admins', label: 'All admins' },
  { value: 'specific_role', label: 'One admin role' },
]
const DELIVERIES: { value: AnnouncementDelivery; label: string }[] = [
  { value: 'banner', label: 'Banner on the dashboard' },
  { value: 'popup', label: 'Pop-up' },
  { value: 'notification', label: 'Notification bell' },
]
const ROLES: RoleName[] = ['super_admin', 'finance_admin', 'support_admin', 'operations_admin', 'demo_admin']

const typeOf = (value: AnnouncementType) => TYPES.find((t) => t.value === value) ?? TYPES[0]

const dayLabel = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return formatDate(iso)
}

const AnnouncementModal = ({ show, onClose, onCreated }: { show: boolean; onClose: () => void; onCreated: () => void }) => {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<AnnouncementType>('important_notice')
  const [audience, setAudience] = useState<AnnouncementAudience>('clients')
  const [targetRole, setTargetRole] = useState<RoleName>('support_admin')
  const [delivery, setDelivery] = useState<AnnouncementDelivery[]>(['banner'])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!profile) return
    if (!title.trim() || !body.trim()) return setError('Write a title and a message.')
    if (!delivery.length) return setError('Choose at least one place to show it.')
    setSaving(true)
    try {
      await announcementService.create({
        title: title.trim(),
        body: body.trim(),
        type,
        audience,
        targetRole: audience === 'specific_role' ? targetRole : null,
        delivery,
        createdBy: profile.id,
      })
      setTitle('')
      setBody('')
      setError(null)
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <form onSubmit={submit} noValidate>
        <ModalHeader closeButton>
          <ModalTitle as="h5">New announcement</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <div className="mb-3">
            <label htmlFor="ann-title" className="form-label">
              Title
            </label>
            <input id="ann-title" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="mb-3">
            <label htmlFor="ann-body" className="form-label">
              Message
            </label>
            <textarea id="ann-body" className="form-control" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label htmlFor="ann-type" className="form-label">
                Type
              </label>
              <select id="ann-type" className="form-select" value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label htmlFor="ann-audience" className="form-label">
                Who sees it
              </label>
              <select id="ann-audience" className="form-select" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {audience === 'specific_role' && (
            <div className="mb-3">
              <label htmlFor="ann-role" className="form-label">
                Role
              </label>
              <select id="ann-role" className="form-select" value={targetRole} onChange={(e) => setTargetRole(e.target.value as RoleName)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="form-label d-block">Show it as</span>
          {DELIVERIES.map((d) => (
            <div className="form-check" key={d.value}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`delivery-${d.value}`}
                checked={delivery.includes(d.value)}
                onChange={() => setDelivery((cur) => (cur.includes(d.value) ? cur.filter((x) => x !== d.value) : [...cur, d.value]))}
              />
              <label className="form-check-label" htmlFor={`delivery-${d.value}`}>
                {d.label}
              </label>
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Publishing…' : 'Publish'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// A notification straight into customers' notification bell.
const DirectMessageModal = ({ show, onClose, preselected }: { show: boolean; onClose: () => void; preselected: string }) => {
  const { showNotification } = useNotificationContext()
  const [customers, setCustomers] = useState<Profile[]>([])
  const [recipient, setRecipient] = useState(preselected || 'all')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!show) return
    userService
      .list()
      .then((rows) => setCustomers(rows.filter((r) => r.role === 'client')))
      .catch(() => setCustomers([]))
  }, [show])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !message.trim()) return showNotification({ message: 'Write a title and a message.', variant: 'danger' })
    const targets = recipient === 'all' ? customers.map((c) => c.id) : [recipient]
    if (recipient === 'all' && !window.confirm(`Send this to all ${targets.length} customers?`)) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(targets.map((userId) => ({ user_id: userId, type: 'system_announcement', title: title.trim(), message: message.trim() })))
      if (error) throw error
      showNotification({ message: `Sent to ${targets.length} ${targets.length === 1 ? 'customer' : 'customers'}.`, variant: 'success' })
      setTitle('')
      setMessage('')
      onClose()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not send.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <form onSubmit={submit} noValidate>
        <ModalHeader closeButton>
          <ModalTitle as="h5">Message customers</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label htmlFor="dm-to" className="form-label">
              To
            </label>
            <select id="dm-to" className="form-select" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="all">All customers ({customers.length})</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName || c.email} ({c.email})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="dm-title" className="form-label">
              Title
            </label>
            <input id="dm-title" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="dm-message" className="form-label">
              Message
            </label>
            <textarea id="dm-message" className="form-control" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <small className="text-muted">It appears in their notification bell and on their Notifications page.</small>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Sending…' : 'Send'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

const Notifications = () => {
  const { can } = usePermission()
  const { showNotification } = useNotificationContext()
  const customerParam = useQueryParams()['customer'] ?? ''
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [messaging, setMessaging] = useState(Boolean(customerParam))

  const load = useCallback(() => {
    announcementService
      .list()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
  }, [])

  useEffect(load, [load])

  const byDay = useMemo(() => {
    const groups: Record<string, Announcement[]> = {}
    for (const a of announcements ?? []) (groups[dayLabel(a.createdAt)] ??= []).push(a)
    return groups
  }, [announcements])

  const toggle = async (a: Announcement) => {
    try {
      await announcementService.setActive(a.id, !a.isActive)
      load()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not update.', variant: 'danger' })
    }
  }

  const remove = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return
    try {
      await announcementService.remove(a.id)
      showNotification({ message: 'Announcement deleted.', variant: 'success' })
      load()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not delete.', variant: 'danger' })
    }
  }

  return (
    <Row className="justify-content-center">
      <Col xs={12}>
        <Card style={{ backgroundColor: '#ffd88e3b' }}>
          <CardBody>
            <Row>
              <Col>
                <h6 className="mb-2 mt-1 fw-medium text-dark fs-18">Notifications</h6>
                <p className="text-body fs-14 ">
                  Announcements show as a banner, pop-up or bell notification to the group you choose, until you turn them off. To reach one customer,
                  <br className="d-none d-lg-block" /> send them a direct message instead.
                </p>
                {can('announcements.manage') && (
                  <button type="button" className="btn btn-warning px-2 me-2" onClick={() => setCreating(true)}>
                    New announcement
                  </button>
                )}
                {can('notifications.send') && (
                  <button type="button" className="btn btn-light px-2" onClick={() => setMessaging(true)}>
                    Message customers
                  </button>
                )}
              </Col>
              <Col xs="auto" className="align-self-center">
                <Image src={notificationImg} alt="notification" height={90} className="rounded" />
              </Col>
            </Row>
          </CardBody>
        </Card>
        {announcements?.length === 0 && <p className="text-muted text-center py-4">No announcements yet.</p>}
        {Object.keys(byDay).map((day) => {
          return (
            <Fragment key={day}>
              <CardBody className="mb-3">
                <h5 className="text-body m-0 d-inline-block">{day}</h5>
                <span className="text-pink bg-pink-subtle py-0 px-1 rounded fw-medium d-inline-block ms-1">{byDay[day].length}</span>
              </CardBody>
              {byDay[day].map((a) => {
                const type = typeOf(a.type)
                return (
                  <Card key={a.id} className={a.isActive ? undefined : 'opacity-75'}>
                    <CardBody>
                      <Row>
                        <Col md={9}>
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                              <span className={`thumb-lg rounded-circle d-flex align-items-center justify-content-center bg-${type.variant}-subtle text-${type.variant} fs-4`}>
                                <IconifyIcon icon={type.icon} />
                              </span>
                            </div>
                            <div className="flex-grow-1 ms-2 text-truncate">
                              <h6 className="my-1 fw-medium text-dark fs-14">
                                {a.title}
                                <small className="text-muted ps-2">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                <span className={`badge ms-2 bg-${a.isActive ? 'success' : 'secondary'}-subtle text-${a.isActive ? 'success' : 'secondary'}`}>
                                  {a.isActive ? 'Showing' : 'Off'}
                                </span>
                              </h6>
                              <p className="text-muted mb-0 text-wrap">{a.body}</p>
                              <small className="text-muted">
                                {type.label} · {AUDIENCES.find((x) => x.value === a.audience)?.label}
                                {a.audience === 'specific_role' && a.targetRole ? ` (${roleLabel(a.targetRole)})` : ''} · {a.delivery.join(', ')}
                              </small>
                            </div>
                          </div>
                        </Col>
                        {can('announcements.manage') && (
                          <Col md={3} className="text-end align-self-center mt-sm-2 mt-lg-0">
                            <button type="button" className="btn btn-primary btn-sm px-2 me-1" onClick={() => void toggle(a)}>
                              {a.isActive ? 'Turn off' : 'Turn on'}
                            </button>
                            <button type="button" className="btn btn bg-secondary-subtle text-secondary btn-sm" onClick={() => void remove(a)} aria-label="Delete">
                              <IconifyIcon icon="fa-solid:trash" />
                            </button>
                          </Col>
                        )}
                      </Row>
                    </CardBody>
                  </Card>
                )
              })}
            </Fragment>
          )
        })}
      </Col>
      <AnnouncementModal show={creating} onClose={() => setCreating(false)} onCreated={load} />
      <DirectMessageModal show={messaging} onClose={() => setMessaging(false)} preselected={customerParam} />
    </Row>
  )
}

export default Notifications
