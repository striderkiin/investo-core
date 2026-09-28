'use client'
import { createContext, use, useEffect, useState } from 'react'

import { getUserById } from '@/helpers/data'
import type { ChildrenType } from '@/types/component-props'
import type { ChatContextType } from '@/types/context'
import type { UserType } from '@/types/data'

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChatContext = () => {
  const context = use(ChatContext)
  if (!context) {
    throw new Error('useChatContext can only be used within ChatProvider')
  }
  return context
}

export const ChatProvider = ({ children }: ChildrenType) => {
  const [activeChat, setActiveChat] = useState<UserType>()

  const changeActiveChat = async (userId: UserType['id']) => {
    const user = await getUserById(userId)
    if (user) setActiveChat(user)
  }

  useEffect(() => {
    changeActiveChat('101')
  }, [])

  return (
    <ChatContext.Provider
      value={{
        activeChat,
        changeActiveChat,
      }}>
      {children}
    </ChatContext.Provider>
  )
}
