'use client'
import type { Metadata } from 'next'
import { useEffect, useState } from 'react'
import { Col, Row } from 'react-bootstrap'

import FallbackLoading from '@/components/FallbackLoading'
import useQueryParams from '@/hooks/useQueryParams'
import ChatArea from './components/ChatArea'
import ChatListPanel from './components/ChatListPanel'
import { useSupportTickets } from './useSupportTickets'

export const metadata: Metadata = { title: 'Support Chat' }

// Customer support: ported from the old Support page onto the template chat.
// ?customer=<id> (the "Message" button on a customer page) opens that
// customer's latest conversation.
const Chat = () => {
  const { tickets, reload } = useSupportTickets()
  const customerParam = useQueryParams()['customer'] ?? ''
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!tickets || activeId) return
    const fromCustomer = customerParam ? tickets.find((t) => t.userId === customerParam) : undefined
    if (fromCustomer) setActiveId(fromCustomer.id)
  }, [tickets, customerParam, activeId])

  if (!tickets) return <FallbackLoading />
  const active = tickets.find((t) => t.id === activeId) ?? null
  const customerHasNoTicket = Boolean(customerParam) && !tickets.some((t) => t.userId === customerParam)

  return (
    <Row>
      <Col xs={12}>
        {customerHasNoTicket && (
          <div className="alert alert-info">
            This customer has not contacted support yet. Conversations start when a customer opens a ticket from their dashboard; you can also
            send them a notification from the Notifications page.
          </div>
        )}
        <ChatListPanel tickets={tickets} activeId={activeId} onSelect={setActiveId} />
        <ChatArea ticket={active} onChanged={() => void reload()} />
      </Col>
    </Row>
  )
}

export default Chat
