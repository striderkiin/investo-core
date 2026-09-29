import { useCallback, useEffect, useState } from 'react'

import { lookupCustomers, type CustomerSummary } from '@/investo/customerLookup'
import { supabase } from '@/investo/services'
import { createSupportService } from '../../../../../../src/services/api/supportService'
import type { SupportMessage, SupportTicket } from '../../../../../../src/types/database'

export const supportService = createSupportService(supabase)

export type TicketWithCustomer = SupportTicket & { customer: CustomerSummary | null; lastMessage: string | null }

export const OPEN_STATUSES = ['open', 'in_progress', 'waiting']

/** All tickets with the customer's name and the latest message, newest activity first. */
export const useSupportTickets = () => {
  const [tickets, setTickets] = useState<TicketWithCustomer[] | null>(null)

  const load = useCallback(async () => {
    const list = await supportService.listAllTickets()
    const [customers, { data: latest }] = await Promise.all([
      lookupCustomers(list.map((t) => t.userId)),
      supabase
        .from('support_messages')
        .select('ticket_id, message, created_at')
        .in(
          'ticket_id',
          list.map((t) => t.id)
        )
        .order('created_at', { ascending: false }),
    ])
    const lastByTicket = new Map<string, string>()
    for (const row of (latest ?? []) as { ticket_id: string; message: string }[]) {
      if (!lastByTicket.has(row.ticket_id)) lastByTicket.set(row.ticket_id, row.message)
    }
    setTickets(list.map((t) => ({ ...t, customer: customers.get(t.userId) ?? null, lastMessage: lastByTicket.get(t.id) ?? null })))
  }, [])

  useEffect(() => {
    void load()
    // New customer messages anywhere bump the list.
    const channel = supabase
      .channel('admin-support-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => void load())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  return { tickets, reload: load }
}

/** Messages of one ticket, kept live with realtime inserts. */
export const useTicketMessages = (ticketId: string | null) => {
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)

  useEffect(() => {
    if (!ticketId) return setMessages(null)
    setMessages(null)
    let active = true
    supportService
      .listMessages(ticketId)
      .then((rows) => active && setMessages(rows))
      .catch(() => active && setMessages([]))
    const unsubscribe = supportService.subscribeToMessages(ticketId, (message) =>
      setMessages((current) => (current && !current.some((m) => m.id === message.id) ? [...current, message] : current))
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [ticketId])

  const append = (message: SupportMessage) => setMessages((current) => (current && !current.some((m) => m.id === message.id) ? [...current, message] : current))

  return { messages, append }
}
