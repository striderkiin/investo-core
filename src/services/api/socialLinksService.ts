import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapSocialLinkRow } from '../supabase/mappers';
import type { SocialLinkRow } from '../supabase/mappers';
import type { SocialLink } from '../../types/database';

export function createSocialLinksService(client: SupabaseClient = getSupabaseClient()) {
  return {
    /** Public/landing-page view — only platforms the operator has turned on. */
    async listEnabled(): Promise<SocialLink[]> {
      const { data, error } = await client.from('social_links').select('*').eq('enabled', true).order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as SocialLinkRow[]).map(mapSocialLinkRow);
    },

    /** Admin management view — every platform, enabled or not. */
    async listAll(): Promise<SocialLink[]> {
      const { data, error } = await client.from('social_links').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as SocialLinkRow[]).map(mapSocialLinkRow);
    },

    async update(id: string, updates: Partial<{ url: string; enabled: boolean }>): Promise<SocialLink> {
      const payload: Record<string, unknown> = {};
      if (updates.url !== undefined) payload.url = updates.url;
      if (updates.enabled !== undefined) payload.enabled = updates.enabled;

      const { data, error } = await client.from('social_links').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return mapSocialLinkRow(data as SocialLinkRow);
    },
  };
}

export type SocialLinksService = ReturnType<typeof createSocialLinksService>;
