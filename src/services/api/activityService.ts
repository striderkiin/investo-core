import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export interface ActivitySettings {
  id: string;
  enabled: boolean;
  frequency: 'low' | 'medium' | 'high' | 'custom';
  eventsPerHour: number;
  variationLevel: 'low' | 'medium' | 'high';
  eventTypes: string[];
}

export interface OnlineUserSettings {
  id: string;
  enabled: boolean;
  baseUsers: number;
  minUsers: number;
  maxUsers: number;
  fluctuationSpeedMs: number;
}

interface ActivitySettingsRow {
  id: string;
  enabled: boolean;
  frequency: ActivitySettings['frequency'];
  events_per_hour: number;
  variation_level: ActivitySettings['variationLevel'];
  event_types: string[];
}

interface OnlineUserSettingsRow {
  id: string;
  enabled: boolean;
  base_users: number;
  min_users: number;
  max_users: number;
  fluctuation_speed_ms: number;
}

function mapActivity(row: ActivitySettingsRow): ActivitySettings {
  return {
    id: row.id,
    enabled: row.enabled,
    frequency: row.frequency,
    eventsPerHour: row.events_per_hour,
    variationLevel: row.variation_level,
    eventTypes: row.event_types ?? [],
  };
}

function mapOnlineUsers(row: OnlineUserSettingsRow): OnlineUserSettings {
  return {
    id: row.id,
    enabled: row.enabled,
    baseUsers: row.base_users,
    minUsers: row.min_users,
    maxUsers: row.max_users,
    fluctuationSpeedMs: row.fluctuation_speed_ms,
  };
}

export function createActivityService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async getActivitySettings(): Promise<ActivitySettings> {
      const { data, error } = await client.from('activity_settings').select('*').limit(1).single();
      if (error) throw error;
      return mapActivity(data as ActivitySettingsRow);
    },

    async updateActivitySettings(updates: Partial<Omit<ActivitySettings, 'id'>>): Promise<ActivitySettings> {
      const current = await this.getActivitySettings();
      const payload: Record<string, unknown> = {};
      if (updates.enabled !== undefined) payload.enabled = updates.enabled;
      if (updates.frequency !== undefined) payload.frequency = updates.frequency;
      if (updates.eventsPerHour !== undefined) payload.events_per_hour = updates.eventsPerHour;
      if (updates.variationLevel !== undefined) payload.variation_level = updates.variationLevel;
      if (updates.eventTypes !== undefined) payload.event_types = updates.eventTypes;

      const { data, error } = await client.from('activity_settings').update(payload).eq('id', current.id).select('*').single();
      if (error) throw error;
      return mapActivity(data as ActivitySettingsRow);
    },

    async getOnlineUserSettings(): Promise<OnlineUserSettings> {
      const { data, error } = await client.from('online_user_settings').select('*').limit(1).single();
      if (error) throw error;
      return mapOnlineUsers(data as OnlineUserSettingsRow);
    },

    async updateOnlineUserSettings(updates: Partial<Omit<OnlineUserSettings, 'id'>>): Promise<OnlineUserSettings> {
      const current = await this.getOnlineUserSettings();
      const payload: Record<string, unknown> = {};
      if (updates.enabled !== undefined) payload.enabled = updates.enabled;
      if (updates.baseUsers !== undefined) payload.base_users = updates.baseUsers;
      if (updates.minUsers !== undefined) payload.min_users = updates.minUsers;
      if (updates.maxUsers !== undefined) payload.max_users = updates.maxUsers;
      if (updates.fluctuationSpeedMs !== undefined) payload.fluctuation_speed_ms = updates.fluctuationSpeedMs;

      const { data, error } = await client.from('online_user_settings').update(payload).eq('id', current.id).select('*').single();
      if (error) throw error;
      return mapOnlineUsers(data as OnlineUserSettingsRow);
    },
  };
}

export type ActivityService = ReturnType<typeof createActivityService>;
