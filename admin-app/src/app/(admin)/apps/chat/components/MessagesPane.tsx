import { Col, Row, TabPane } from 'react-bootstrap'

import ChatItem from './ChatItem'
import type { TicketWithCustomer } from '../useSupportTickets'

type Props = { eventKey: string; chats: TicketWithCustomer[]; activeId: string | null; onSelect: (id: string) => void; empty: string }

const MessagesPane = ({ eventKey, chats, activeId, onSelect, empty }: Props) => {
  return (
    <TabPane eventKey={eventKey} className="fade" role="tabpanel">
      <Row>
        <Col>
          {chats.length === 0 && <p className="text-muted text-center py-4 mb-0">{empty}</p>}
          {chats.map((chat) => (
            <ChatItem key={chat.id} ticket={chat} active={chat.id === activeId} onSelect={onSelect} />
          ))}
        </Col>
      </Row>
    </TabPane>
  )
}

export default MessagesPane
