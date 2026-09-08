import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export type DomainStatus = 'not_configured' | 'pending_verification' | 'verified' | 'active';

export interface WhiteLabelSettings {
  id: string;
  platformName: string;
  legalBusinessName: string;
  displayName: string;
  shortDescription: string;
  supportName: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  primaryDomain: string | null;
  applicationUrl: string | null;
  apiUrl: string | null;
  supportUrl: string | null;
  domainStatus: DomainStatus;
  businessName: string;
  businessRegistrationNumber: string;
  businessAddress: string;
  supportAddress: string;
  country: string;
  timezone: string;
  defaultCurrency: string;
  operatingRegions: string[];
}

interface WhiteLabelRow {
  id: string;
  platform_name: string;
  legal_business_name: string;
  display_name: string;
  short_description: string;
  support_name: string;
  support_email: string;
  support_phone: string;
  website: string;
  primary_domain: string | null;
  application_url: string | null;
  api_url: string | null;
  support_url: string | null;
  domain_status: DomainStatus;
  business_name: string;
  business_registration_number: string;
  business_address: string;
  support_address: string;
  country: string;
  timezone: string;
  default_currency: string;
  operating_regions: string[];
}

function mapRow(row: WhiteLabelRow): WhiteLabelSettings {
  return {
    id: row.id,
    platformName: row.platform_name,
    legalBusinessName: row.legal_business_name,
    displayName: row.display_name,
    shortDescription: row.short_description,
    supportName: row.support_name,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    website: row.website,
    primaryDomain: row.primary_domain,
    applicationUrl: row.application_url,
    apiUrl: row.api_url,
    supportUrl: row.support_url,
    domainStatus: row.domain_status,
    businessName: row.business_name,
    businessRegistrationNumber: row.business_registration_number,
    businessAddress: row.business_address,
    supportAddress: row.support_address,
    country: row.country,
    timezone: row.timezone,
    defaultCurrency: row.default_currency,
    operatingRegions: row.operating_regions ?? [],
  };
}

const FIELD_MAP: Record<keyof Omit<WhiteLabelSettings, 'id'>, keyof WhiteLabelRow> = {
  platformName: 'platform_name',
  legalBusinessName: 'legal_business_name',
  displayName: 'display_name',
  shortDescription: 'short_description',
  supportName: 'support_name',
  supportEmail: 'support_email',
  supportPhone: 'support_phone',
  website: 'website',
  primaryDomain: 'primary_domain',
  applicationUrl: 'application_url',
  apiUrl: 'api_url',
  supportUrl: 'support_url',
  domainStatus: 'domain_status',
  businessName: 'business_name',
  businessRegistrationNumber: 'business_registration_number',
  businessAddress: 'business_address',
  supportAddress: 'support_address',
  country: 'country',
  timezone: 'timezone',
  defaultCurrency: 'default_currency',
  operatingRegions: 'operating_regions',
};

export function createWhiteLabelService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async get(): Promise<WhiteLabelSettings> {
      const { data, error } = await client.from('white_label_settings').select('*').limit(1).single();
      if (error) throw error;
      return mapRow(data as WhiteLabelRow);
    },

    async update(updates: Partial<Omit<WhiteLabelSettings, 'id'>>): Promise<WhiteLabelSettings> {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        const column = FIELD_MAP[key as keyof Omit<WhiteLabelSettings, 'id'>];
        if (column) payload[column] = value;
      }
      const current = await this.get();
      const { data, error } = await client.from('white_label_settings').update(payload).eq('id', current.id).select('*').single();
      if (error) throw error;
      return mapRow(data as WhiteLabelRow);
    },
  };
}

export type WhiteLabelService = ReturnType<typeof createWhiteLabelService>;
