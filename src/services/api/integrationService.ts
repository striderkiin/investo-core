import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface IntegrationConfig {
  id: string;
  providerType: string;
  providerName: string;
  environment: string;
  status: IntegrationStatus;
  lastTestedAt: string | null;
}

export interface CredentialMetadata {
  integrationId: string;
  maskedKey: string;
  maskedSecret: string;
  webhookConfigured: boolean;
  rotatedAt: string | null;
}

interface IntegrationConfigRow {
  id: string;
  provider_type: string;
  provider_name: string;
  environment: string;
  status: IntegrationStatus;
  last_tested_at: string | null;
}

interface CredentialMetadataRow {
  integration_id: string;
  masked_key: string;
  masked_secret: string;
  webhook_configured: boolean;
  rotated_at: string | null;
}

function mapConfig(row: IntegrationConfigRow): IntegrationConfig {
  return {
    id: row.id,
    providerType: row.provider_type,
    providerName: row.provider_name,
    environment: row.environment,
    status: row.status,
    lastTestedAt: row.last_tested_at,
  };
}

function mapMetadata(row: CredentialMetadataRow): CredentialMetadata {
  return {
    integrationId: row.integration_id,
    maskedKey: row.masked_key,
    maskedSecret: row.masked_secret,
    webhookConfigured: row.webhook_configured,
    rotatedAt: row.rotated_at,
  };
}

export const PROVIDER_CATALOG: { type: string; label: string; icon: string }[] = [
  { type: 'payment', label: 'Crypto / Payment Provider', icon: 'bi-currency-bitcoin' },
  { type: 'email', label: 'Email Provider', icon: 'bi-envelope' },
  { type: 'sms', label: 'SMS Provider', icon: 'bi-chat-dots' },
  { type: 'kyc', label: 'KYC Provider', icon: 'bi-person-vcard' },
  { type: 'analytics', label: 'Analytics Provider', icon: 'bi-graph-up' },
  { type: 'monitoring', label: 'Monitoring Provider', icon: 'bi-activity' },
];

export function createIntegrationService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(): Promise<IntegrationConfig[]> {
      const { data, error } = await client.from('integration_configs').select('*').order('provider_type');
      if (error) throw error;
      return (data as IntegrationConfigRow[]).map(mapConfig);
    },

    async getCredentialMetadata(integrationId: string): Promise<CredentialMetadata | null> {
      const { data, error } = await client.from('credential_metadata').select('*').eq('integration_id', integrationId).maybeSingle();
      if (error) throw error;
      return data ? mapMetadata(data as CredentialMetadataRow) : null;
    },

    async createIntegration(providerType: string, providerName: string, environment: string): Promise<IntegrationConfig> {
      const { data, error } = await client
        .from('integration_configs')
        .insert({ provider_type: providerType, provider_name: providerName, environment, status: 'disconnected' })
        .select('*')
        .single();
      if (error) throw error;
      return mapConfig(data as IntegrationConfigRow);
    },

    /** Sends credentials to a security-definer RPC — the frontend never reads them back. Only masked metadata is returned. */
    async saveCredential(integrationId: string, apiKey: string, apiSecret: string, webhookSecret?: string): Promise<CredentialMetadata> {
      const { data, error } = await client.rpc('save_integration_credential', {
        p_integration_id: integrationId,
        p_api_key: apiKey,
        p_api_secret: apiSecret,
        p_webhook_secret: webhookSecret ?? null,
      });
      if (error) throw error;
      return mapMetadata(data as CredentialMetadataRow);
    },

    async testConnection(integrationId: string): Promise<IntegrationConfig> {
      const { data, error } = await client.rpc('test_integration_connection', { p_integration_id: integrationId });
      if (error) throw error;
      return mapConfig(data as IntegrationConfigRow);
    },

    async disconnect(integrationId: string): Promise<IntegrationConfig> {
      const { data, error } = await client.rpc('disconnect_integration', { p_integration_id: integrationId });
      if (error) throw error;
      return mapConfig(data as IntegrationConfigRow);
    },
  };
}

export type IntegrationService = ReturnType<typeof createIntegrationService>;
