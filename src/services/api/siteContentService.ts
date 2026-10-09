import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

/** Website text and images an admin changed (site_content table). Fields with no row use the defaults in code. */
export function createSiteContentService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async getAll(): Promise<Record<string, string>> {
      const { data, error } = await client.from('site_content').select('key, value');
      if (error) throw error;
      return Object.fromEntries((data as { key: string; value: string }[]).map((row) => [row.key, row.value]));
    },

    /** Saves changed fields. A null value removes the row, which puts the default back. */
    async save(changes: Record<string, string | null>): Promise<void> {
      const upserts = Object.entries(changes)
        .filter((entry): entry is [string, string] => entry[1] !== null)
        .map(([key, value]) => ({ key, value }));
      const removals = Object.entries(changes)
        .filter(([, value]) => value === null)
        .map(([key]) => key);
      if (upserts.length > 0) {
        const { error } = await client.from('site_content').upsert(upserts, { onConflict: 'key' });
        if (error) throw error;
      }
      if (removals.length > 0) {
        const { error } = await client.from('site_content').delete().in('key', removals);
        if (error) throw error;
      }
    },

    /** Uploads a website picture to the public branding bucket and returns its URL. */
    async uploadImage(file: File, key: string): Promise<string> {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file (PNG, JPG, WEBP or SVG).');
      if (file.size > 5 * 1024 * 1024) throw new Error('The picture is larger than 5 MB. Choose a smaller one.');
      const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `site/${key.replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${ext}`;
      const { error } = await client.storage.from('branding').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      return client.storage.from('branding').getPublicUrl(path).data.publicUrl;
    },
  };
}

export type SiteContentService = ReturnType<typeof createSiteContentService>;
