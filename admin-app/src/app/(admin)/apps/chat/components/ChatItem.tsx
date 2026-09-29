import clsx from 'clsx'

import UserAvatar from '@/investo/UserAvatar'
import { statusLabel, statusVariant, timeAgo } from '@/investo/format'
import type { TicketWithCustomer } from '../useSupportTickets'

type Props = { ticket: TicketWithCustomer; active: boolean; onSelect: (id: string) => void }

const ChatItem = ({ ticket, active, onSelect }: Props) => {
  const name = ticket.customer?.name ?? 'Unknown customer'
  const variant = statusVariant(ticket.status)
  return (
    <div
      onClick={() => onSelect(ticket.id)}
      className={clsx('p-2 border-dashed rounded mb-2', active ? 'border-primary bg-primary-subtle' : 'border-theme-color')}>
      <div role="button">
        <div className="d-flex align-items-start">
          <div className="position-relative">
            <UserAvatar photoUrl={ticket.customer?.avatarUrl} avatarKey={ticket.customer?.avatarKey} name={name} className="thumb-lg" />
          </div>
          <div className="flex-grow-1 ms-2 text-truncate align-self-center">
            <h6 className="my-0 fw-medium text-dark fs-14 text-truncate">
              {name}
              <small className="float-end text-muted fs-11">{timeAgo(ticket.updatedAt)}</small>
            </h6>
            <p className="text-muted mb-0 text-truncate">
              <span className="text-body">{ticket.subject}</span>
              <span className={`badge float-end rounded bg-${variant}-subtle text-${variant}`}>{statusLabel(ticket.status)}</span>
            </p>
            {ticket.lastMessage && <p className="text-muted mb-0 fs-12 text-truncate">{ticket.lastMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatItem
