'use client'
import { useMemo, useState } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent } from 'react-bootstrap'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import MessagesPane from './MessagesPane'
import { OPEN_STATUSES, type TicketWithCustomer } from '../useSupportTickets'

type Props = { tickets: TicketWithCustomer[]; activeId: string | null; onSelect: (id: string) => void }

// Left column: conversations needing a reply first, then everything.
const ChatListPanel = ({ tickets, activeId, onSelect }: Props) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term
      ? tickets.filter((t) => [t.customer?.name, t.customer?.email, t.subject, t.lastMessage].some((v) => v?.toLowerCase().includes(term)))
      : tickets
  }, [tickets, search])
  const open = filtered.filter((t) => OPEN_STATUSES.includes(t.status))

  return (
    <div className="chat-box-left">
      <TabContainer mountOnEnter defaultActiveKey="Open">
        <Nav justify variant="tabs">
          <NavItem role="presentation">
            <NavLink as="span" className="py-2" eventKey="Open" role="button">
              Open ({open.length})
            </NavLink>
          </NavItem>
          <NavItem role="presentation">
            <NavLink as="span" className="py-2" eventKey="All" role="button">
              All
            </NavLink>
          </NavItem>
        </Nav>
        <div className="chat-search p-3">
          <div className="p-1 bg-light rounded rounded-pill">
            <div className="input-group">
              <div className="input-group-prepend">
                <button type="button" className="btn btn-link text-secondary">
                  <IconifyIcon icon="fa6-solid:magnifying-glass" />
                </button>
              </div>
              <input
                type="search"
                placeholder="Search customer or subject"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search conversations"
                className="form-control border-0 bg-light"
              />
            </div>
          </div>
        </div>
        <SimplebarReactClient className="chat-body-left px-3">
          <TabContent>
            <MessagesPane eventKey="Open" chats={open} activeId={activeId} onSelect={onSelect} empty="No open conversations." />
            <MessagesPane eventKey="All" chats={filtered} activeId={activeId} onSelect={onSelect} empty="No conversations yet." />
          </TabContent>
        </SimplebarReactClient>
      </TabContainer>
    </div>
  )
}

export default ChatListPanel
