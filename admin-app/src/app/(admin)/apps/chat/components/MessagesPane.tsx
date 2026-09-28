import { Col, Row, TabPane } from 'react-bootstrap'

import ChatItem from './ChatItem'
import type { UserType } from '@/types/data'

const MessagesPane = ({ chats }: { chats: UserType[] }) => {
  return (
    <TabPane eventKey="Messages" className="fade" role="tabpanel">
      <Row>
        <Col>
          {chats.map((chat) => (
            <ChatItem key={chat.id} {...chat} />
          ))}
        </Col>
      </Row>
    </TabPane>
  )
}

export default MessagesPane
