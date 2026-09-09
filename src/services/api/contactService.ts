import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapContactMessageRow } from '../supabase/mappers';
import type { ContactMessageRow } from '../supabase/mappers';
import type { ContactMessage, ContactMessageStatus } from '../../types/database';

export function createContactService(client: SupabaseClient = getSupabaseClient()) {
  return {
    /** Public — works for logged-in and anonymous visitors alike. submitted_by is stamped server-side. */
    async submit(input: { name: string; email: string; subject: string; message: string }): Promise<void> {
      const { error } = await client.from('contact_messages').insert({
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
      });
      if (error) throw error;
    },

    async listAll(status?: ContactMessageStatus): Promise<ContactMessage[]> {
      let query = client.from('contact_messages').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data as ContactMessageRow[]).map(mapContactMessageRow);
    },

    async updateStatus(id: string, status: ContactMessageStatus, adminId?: string): Promise<ContactMessage> {
      const payload: Record<string, unknown> = { status };
      if (status === 'responded' || status === 'closed') {
        payload.responded_by = adminId ?? null;
        payload.responded_at = new Date().toISOString();
      }
      const { data, error } = await client.from('contact_messages').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return mapContactMessageRow(data as ContactMessageRow);
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;
