import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import type { RoleName } from '../../types/roles';

export type AnnouncementType = 'maintenance_notice' | 'promotion' | 'system_update' | 'important_notice';
export type AnnouncementAudience = 'everyone' | 'clients' | 'admins' | 'specific_role';
export type AnnouncementDelivery = 'banner' | 'popup' | 'notification' | 'email';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  targetRole: RoleName | null;
  delivery: AnnouncementDelivery[];
  isActive: boolean;
  createdAt: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  target_role: RoleName | null;
  delivery: AnnouncementDelivery[];
  is_active: boolean;
  created_at: string;
}

function mapRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    audience: row.audience,
    targetRole: row.target_role,
    delivery: row.delivery ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function createAnnouncementService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(): Promise<Announcement[]> {
      const { data, error } = await client.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as AnnouncementRow[]).map(mapRow);
    },

    async listActiveFor(role: RoleName | null): Promise<Announcement[]> {
      const { data, error } = await client.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      const all = (data as AnnouncementRow[]).map(mapRow);
      const isAdmin = role !== null && role !== 'client';
      return all.filter((a) => {
        if (a.audience === 'everyone') return true;
        if (a.audience === 'clients') return role === 'client';
        if (a.audience === 'admins') return isAdmin;
        if (a.audience === 'specific_role') return role === a.targetRole;
        return false;
      });
    },

    async create(input: {
      title: string;
      body: string;
      type: AnnouncementType;
      audience: AnnouncementAudience;
      targetRole?: RoleName | null;
      delivery: AnnouncementDelivery[];
      createdBy: string;
    }): Promise<Announcement> {
      const { data, error } = await client
        .from('announcements')
        .insert({
          title: input.title,
          body: input.body,
          type: input.type,
          audience: input.audience,
          target_role: input.targetRole ?? null,
          delivery: input.delivery,
          created_by: input.createdBy,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapRow(data as AnnouncementRow);
    },

    async setActive(id: string, isActive: boolean): Promise<Announcement> {
      const { data, error } = await client.from('announcements').update({ is_active: isActive }).eq('id', id).select('*').single();
      if (error) throw error;
      return mapRow(data as AnnouncementRow);
    },

    async remove(id: string): Promise<void> {
      const { error } = await client.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
  };
}

export type AnnouncementService = ReturnType<typeof createAnnouncementService>;
