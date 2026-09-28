import type { Metadata } from 'next'

import { ChatProvider } from '@/context/useChatContext'
import ChatArea from './components/ChatArea'
import ChatListPanel from './components/ChatListPanel'
import { Col, Row } from 'react-bootstrap'

export const metadata: Metadata = { title: 'Chat' }

const Chat = () => {
  return (
    <Row>
      <Col xs={12}>
        <ChatProvider>
          <ChatListPanel />
          <ChatArea />
        </ChatProvider>
      </Col>
    </Row>
  )
}

export default Chat
