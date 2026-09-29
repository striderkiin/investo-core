'use client'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, OverlayTrigger, Tooltip } from 'react-bootstrap'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { useNotificationContext } from '@/context/useNotificationContext'
import UserAvatar from '@/investo/UserAvatar'
import { statusLabel, statusVariant, timeAgo } from '@/investo/format'
import { supportService, useTicketMessages, type TicketWithCustomer } from '../useSupportTickets'
import type { SupportMessage, SupportTicketStatus } from '../../../../../../../src/types/database'
import { useAuth } from '../../../../../../../src/hooks/useAuth'
import { usePermission } from '../../../../../../../src/hooks/usePermission'

const STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed']

const AlwaysScrollToBottom = ({ count }: { count: number }) => {
  const elementRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (elementRef?.current?.scrollIntoView) elementRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [count])
  return <div ref={elementRef} />
}

const UserMessage = ({ message, ticket, supportName }: { message: SupportMessage; ticket: TicketWithCustomer; supportName: string }) => {
  // Support replies on the right, the customer on the left.
  const fromSupport = message.isAdmin
  const name = fromSupport ? supportName : (ticket.customer?.name ?? 'Customer')
  return (
    <div className={clsx('d-flex', { 'flex-row-reverse': fromSupport })}>
      {fromSupport ? (
        <span className="rounded-circle thumb-md bg-primary text-white d-inline-flex align-items-center justify-content-center flex-shrink-0">
          <IconifyIcon icon="iconoir:headset-help" />
        </span>
      ) : (
        <UserAvatar photoUrl={ticket.customer?.avatarUrl} avatarKey={ticket.customer?.avatarKey} name={name} className="thumb-md flex-shrink-0" />
      )}
      <div className={clsx('chat-box w-100', fromSupport ? 'me-1 reverse' : 'ms-1')}>
        <div className="user-chat">
          <p style={{ whiteSpace: 'pre-wrap' }}>{message.message}</p>
        </div>
        <div className="chat-time">
          {name} · {timeAgo(message.createdAt)}
        </div>
      </div>
    </div>
  )
}

type Props = { ticket: TicketWithCustomer | null; onChanged: () => void }

const ChatArea = ({ ticket, onChanged }: Props) => {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canReply = can('support.manage')
  const { showNotification } = useNotificationContext()
  const { messages, append } = useTicketMessages(ticket?.id ?? null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  if (!ticket) {
    return (
      <div className="chat-box-right">
        <div className="d-flex h-100 align-items-center justify-content-center text-muted p-5 text-center">
          Choose a conversation on the left to read and reply.
        </div>
      </div>
    )
  }

  const name = ticket.customer?.name ?? 'Unknown customer'
  const variant = statusVariant(ticket.status)

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!profile || !draft.trim()) return
    setSending(true)
    try {
      const message = await supportService.sendMessage(ticket.id, profile.id, draft.trim(), true)
      append(message)
      setDraft('')
      // Replying moves a new ticket to "in progress" so the queue shows it's handled.
      if (ticket.status === 'open') await supportService.updateStatus(ticket.id, 'in_progress')
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'The message was not sent.', variant: 'danger' })
    } finally {
      setSending(false)
    }
  }

  const setStatus = async (status: SupportTicketStatus) => {
    try {
      await supportService.updateStatus(ticket.id, status)
      showNotification({ message: `Conversation marked ${statusLabel(status).toLowerCase()}.`, variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not change the status.', variant: 'danger' })
    }
  }

  const assignToMe = async () => {
    if (!profile) return
    try {
      await supportService.assign(ticket.id, profile.id)
      showNotification({ message: 'Assigned to you.', variant: 'success' })
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not assign.', variant: 'danger' })
    }
  }

  return (
    <div className="chat-box-right">
      <div className="p-3 d-flex justify-content-between align-items-center card-bg rounded gap-2">
        <Link href={`/customers/${ticket.userId}`} className="d-flex align-self-center text-body text-truncate">
          <div className="flex-shrink-0">
            <UserAvatar photoUrl={ticket.customer?.avatarUrl} avatarKey={ticket.customer?.avatarKey} name={name} className="thumb-lg" />
          </div>
          <div className="flex-grow-1 ms-2 align-self-center text-truncate">
            <h6 className="my-0 fw-medium text-dark fs-14">{name}</h6>
            <p className="text-muted mb-0 text-truncate">
              {ticket.subject} · <span className="text-capitalize">{ticket.category}</span>
            </p>
          </div>
        </Link>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <span className={`badge bg-${variant}-subtle text-${variant}`}>{statusLabel(ticket.status)}</span>
          {canReply && (
            <>
              {ticket.assignedTo !== profile?.id && (
                <OverlayTrigger placement="top" overlay={<Tooltip className="tooltip-primary">Assign to me</Tooltip>}>
                  <span role="button" className="fs-22 text-muted" onClick={() => void assignToMe()}>
                    <IconifyIcon icon="iconoir:user-plus" />
                  </span>
                </OverlayTrigger>
              )}
              <Dropdown align="end">
                <DropdownToggle variant="light" size="sm">
                  Status
                </DropdownToggle>
                <DropdownMenu>
                  {STATUSES.filter((s) => s !== ticket.status).map((s) => (
                    <DropdownItem key={s} onClick={() => void setStatus(s)}>
                      Mark {statusLabel(s).toLowerCase()}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </>
          )}
        </div>
      </div>
      <SimplebarReactClient className="chat-body">
        <div className="chat-detail">
          {!messages && <p className="text-muted text-center py-4">Loading…</p>}
          {messages?.length === 0 && <p className="text-muted text-center py-4">No messages yet.</p>}
          {messages?.map((message) => (
            <UserMessage key={message.id} message={message} ticket={ticket} supportName="Support" />
          ))}
          <AlwaysScrollToBottom count={messages?.length ?? 0} />
        </div>
      </SimplebarReactClient>
      <div className="chat-footer">
        {canReply ? (
          <form className="d-flex" onSubmit={send}>
            <div className="w-100">
              <input
                className="form-control"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={['resolved', 'closed'].includes(ticket.status) ? 'Reply to reopen the conversation…' : 'Type a reply…'}
                aria-label="Reply"
              />
            </div>
            <div className="text-end">
              <div className="chat-features icons-center flex-nowrap">
                <button type="submit" className="btn p-0 text-primary" disabled={sending || !draft.trim()} aria-label="Send">
                  <IconifyIcon icon="iconoir:send-solid" />
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-muted mb-0">Your role can read conversations but not reply.</p>
        )}
      </div>
    </div>
  )
}

export default ChatArea
