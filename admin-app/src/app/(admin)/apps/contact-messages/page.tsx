'use client'
import type { Metadata } from 'next'
import { useCallback, useEffect, useState } from 'react'
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap'
import type { ColumnDef } from '@tanstack/react-table'
import { useNotificationContext } from '@/context/useNotificationContext'
import RecordList from '@/investo/RecordList'
import { formatDateTime, statusLabel } from '@/investo/format'
import { supabase } from '@/investo/services'
import { createContactService } from '../../../../../../src/services/api/contactService'
import type { ContactMessage, ContactMessageStatus } from '../../../../../../src/types/database'
import { useAuth } from '../../../../../../src/hooks/useAuth'
import { usePermission } from '../../../../../../src/hooks/usePermission'

export const metadata: Metadata = { title: 'Contact Messages' }

const contactService = createContactService(supabase)

const STATUSES: ContactMessageStatus[] = ['new', 'read', 'responded', 'closed']
const VARIANT: Record<ContactMessageStatus, string> = { new: 'primary', read: 'info', responded: 'success', closed: 'secondary' }

// Messages sent from the public Contact page (ported from the old panel).
const ContactMessages = () => {
  const { profile } = useAuth()
  const { can } = usePermission()
  const { showNotification } = useNotificationContext()
  const [messages, setMessages] = useState<ContactMessage[] | null>(null)
  const [active, setActive] = useState<ContactMessage | null>(null)

  const load = useCallback(() => {
    contactService
      .listAll()
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [])

  useEffect(load, [load])

  const replace = (updated: ContactMessage) => {
    setMessages((cur) => (cur ?? []).map((m) => (m.id === updated.id ? updated : m)))
    setActive((cur) => (cur?.id === updated.id ? updated : cur))
  }

  const open = async (message: ContactMessage) => {
    setActive(message)
    if (message.status === 'new' && can('support.manage')) {
      contactService
        .updateStatus(message.id, 'read', profile?.id)
        .then(replace)
        .catch(() => undefined)
    }
  }

  const setStatus = async (status: ContactMessageStatus) => {
    if (!active) return
    try {
      replace(await contactService.updateStatus(active.id, status, profile?.id))
      showNotification({ message: `Marked ${status}.`, variant: 'success' })
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not update.', variant: 'danger' })
    }
  }

  const columns: ColumnDef<ContactMessage>[] = [
    {
      header: 'From',
      cell: ({ row: { original } }) => (
        <button type="button" className="btn btn-link p-0 text-start text-body" onClick={() => void open(original)}>
          <span className={original.status === 'new' ? 'fw-semibold' : undefined}>{original.name}</span>
          <small className="d-block text-muted">{original.email}</small>
        </button>
      ),
    },
    {
      header: 'Subject',
      cell: ({ row: { original } }) => (
        <button type="button" className="btn btn-link p-0 text-start text-body text-truncate" style={{ maxWidth: 360 }} onClick={() => void open(original)}>
          {original.subject}
        </button>
      ),
    },
    { header: 'Received', cell: ({ row: { original } }) => formatDateTime(original.createdAt) },
    {
      header: 'Status',
      cell: ({ row: { original } }) => (
        <span className={`badge bg-${VARIANT[original.status]}-subtle text-${VARIANT[original.status]}`}>{statusLabel(original.status)}</span>
      ),
    },
  ]

  return (
    <>
      <RecordList<ContactMessage>
        title="Contact Messages"
        subtitle={(visible) => `${visible.length} shown · from the public Contact page, including visitors without an account`}
        rows={messages}
        columns={columns}
        tabs={[
          { key: 'new', label: `New (${(messages ?? []).filter((m) => m.status === 'new').length})`, match: (m) => m.status === 'new' },
          { key: 'all', label: 'All', match: () => true },
          ...STATUSES.filter((s) => s !== 'new').map((s) => ({ key: s, label: statusLabel(s), match: (m: ContactMessage) => m.status === s })),
        ]}
        searchText={(m) => [m.name, m.email, m.subject, m.message]}
        searchPlaceholder="Search name, email or text"
      />
      {active && (
        <Modal show onHide={() => setActive(null)} centered size="lg">
          <ModalHeader closeButton>
            <ModalTitle as="h5">{active.subject}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-muted mb-3">
              From {active.name} &lt;{active.email}&gt; · {formatDateTime(active.createdAt)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{active.message}</p>
          </ModalBody>
          <ModalFooter className="justify-content-between">
            <div className="d-flex gap-1 flex-wrap">
              {can('support.manage') &&
                STATUSES.map((s) => (
                  <button key={s} type="button" className={`btn btn-sm ${active.status === s ? 'btn-primary' : 'btn-light'}`} onClick={() => void setStatus(s)}>
                    {statusLabel(s)}
                  </button>
                ))}
            </div>
            <a href={`mailto:${active.email}?subject=${encodeURIComponent(`Re: ${active.subject}`)}`} className="btn btn-outline-primary btn-sm">
              Reply by email
            </a>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}

export default ContactMessages
