import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapNotificationRow } from '../supabase/mappers';
import type { NotificationRow } from '../supabase/mappers';
import type { AppNotification } from '../../types/database';

export function createNotificationService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(userId: string): Promise<AppNotification[]> {
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as NotificationRow[]).map(mapNotificationRow);
    },

    async markAsRead(notificationId: string): Promise<void> {
      const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId);
      if (error) throw error;
    },

    async markAllAsRead(userId: string): Promise<void> {
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },

    subscribeToNewNotifications(userId: string, onInsert: (notification: AppNotification) => void) {
      const channel = client
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => onInsert(mapNotificationRow(payload.new as NotificationRow))
        )
        .subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
