import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapSupportMessageRow, mapSupportTicketRow } from '../supabase/mappers';
import type { SupportMessageRow, SupportTicketRow } from '../supabase/mappers';
import type { SupportMessage, SupportTicket, SupportTicketCategory, SupportTicketStatus } from '../../types/database';

export function createSupportService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async listMyTickets(userId: string): Promise<SupportTicket[]> {
      const { data, error } = await client
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data as SupportTicketRow[]).map(mapSupportTicketRow);
    },

    async listAllTickets(status?: SupportTicketStatus): Promise<SupportTicket[]> {
      let query = client.from('support_tickets').select('*').order('updated_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data as SupportTicketRow[]).map(mapSupportTicketRow);
    },

    async createTicket(userId: string, subject: string, category: SupportTicketCategory, firstMessage: string): Promise<SupportTicket> {
      const { data, error } = await client
        .from('support_tickets')
        .insert({ user_id: userId, subject, category })
        .select('*')
        .single();
      if (error) throw error;

      const ticket = mapSupportTicketRow(data as SupportTicketRow);
      await this.sendMessage(ticket.id, userId, firstMessage, false);
      return ticket;
    },

    async updateStatus(ticketId: string, status: SupportTicketStatus): Promise<SupportTicket> {
      const { data, error } = await client
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId)
        .select('*')
        .single();
      if (error) throw error;
      return mapSupportTicketRow(data as SupportTicketRow);
    },

    async assign(ticketId: string, adminId: string): Promise<SupportTicket> {
      const { data, error } = await client
        .from('support_tickets')
        .update({ assigned_to: adminId, status: 'in_progress' })
        .eq('id', ticketId)
        .select('*')
        .single();
      if (error) throw error;
      return mapSupportTicketRow(data as SupportTicketRow);
    },

    async listMessages(ticketId: string): Promise<SupportMessage[]> {
      const { data, error } = await client
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as SupportMessageRow[]).map(mapSupportMessageRow);
    },

    async sendMessage(ticketId: string, senderId: string, message: string, isAdmin: boolean): Promise<SupportMessage> {
      const { data, error } = await client
        .from('support_messages')
        .insert({ ticket_id: ticketId, sender_id: senderId, message, is_admin: isAdmin })
        .select('*')
        .single();
      if (error) throw error;
      return mapSupportMessageRow(data as SupportMessageRow);
    },

    subscribeToMessages(ticketId: string, onInsert: (message: SupportMessage) => void) {
      const channel = client
        .channel(`support_messages:${ticketId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
          (payload) => onInsert(mapSupportMessageRow(payload.new as SupportMessageRow))
        )
        .subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

export type SupportService = ReturnType<typeof createSupportService>;
