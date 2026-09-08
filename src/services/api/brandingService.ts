import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Branding {
  id: string;
  siteName: string;
  logoUrl: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  logoText: string | null;
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  theme: ThemeMode;
  primaryFont: string;
  headingFont: string;
}

interface BrandingRow {
  id: string;
  site_name: string;
  logo_url: string | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  logo_text: string | null;
  primary_color: string;
  secondary_color: string;
  success_color: string;
  warning_color: string;
  danger_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  theme: ThemeMode;
  primary_font: string;
  heading_font: string;
}

function mapRow(row: BrandingRow): Branding {
  return {
    id: row.id,
    siteName: row.site_name,
    logoUrl: row.logo_url,
    logoLightUrl: row.logo_light_url,
    logoDarkUrl: row.logo_dark_url,
    faviconUrl: row.favicon_url,
    logoText: row.logo_text,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    successColor: row.success_color,
    warningColor: row.warning_color,
    dangerColor: row.danger_color,
    backgroundColor: row.background_color,
    surfaceColor: row.surface_color,
    textColor: row.text_color,
    theme: row.theme,
    primaryFont: row.primary_font,
    headingFont: row.heading_font,
  };
}

const FIELD_MAP: Record<keyof Omit<Branding, 'id'>, keyof BrandingRow> = {
  siteName: 'site_name',
  logoUrl: 'logo_url',
  logoLightUrl: 'logo_light_url',
  logoDarkUrl: 'logo_dark_url',
  faviconUrl: 'favicon_url',
  logoText: 'logo_text',
  primaryColor: 'primary_color',
  secondaryColor: 'secondary_color',
  successColor: 'success_color',
  warningColor: 'warning_color',
  dangerColor: 'danger_color',
  backgroundColor: 'background_color',
  surfaceColor: 'surface_color',
  textColor: 'text_color',
  theme: 'theme',
  primaryFont: 'primary_font',
  headingFont: 'heading_font',
};

export function createBrandingService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async get(): Promise<Branding> {
      const { data, error } = await client.from('branding').select('*').limit(1).single();
      if (error) throw error;
      return mapRow(data as BrandingRow);
    },

    async update(updates: Partial<Omit<Branding, 'id'>>): Promise<Branding> {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        const column = FIELD_MAP[key as keyof Omit<Branding, 'id'>];
        if (column) payload[column] = value;
      }
      const current = await this.get();
      const { data, error } = await client.from('branding').update(payload).eq('id', current.id).select('*').single();
      if (error) throw error;
      return mapRow(data as BrandingRow);
    },

    /** Uploads a branding asset (logo/favicon) to the public `branding` storage bucket and returns its public URL. */
    async uploadAsset(file: File, kind: 'logo' | 'logo-light' | 'logo-dark' | 'favicon'): Promise<string> {
      const path = `${kind}-${Date.now()}.${file.name.split('.').pop() ?? 'png'}`;
      const { error } = await client.storage.from('branding').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = client.storage.from('branding').getPublicUrl(path);
      return data.publicUrl;
    },
  };
}

export type BrandingService = ReturnType<typeof createBrandingService>;
