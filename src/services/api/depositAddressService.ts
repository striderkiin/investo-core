import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export interface DepositAddress {
  id: string;
  currency: string;
  network: string;
  environment: string;
  address: string;
  isActive: boolean;
  updatedAt: string;
}

interface DepositAddressRow {
  id: string;
  currency: string;
  network: string;
  environment: string;
  address: string;
  is_active: boolean;
  updated_at: string;
}

function mapRow(row: DepositAddressRow): DepositAddress {
  return {
    id: row.id,
    currency: row.currency,
    network: row.network,
    environment: row.environment,
    address: row.address,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

/**
 * The addresses admins configure for receiving client crypto deposits —
 * one per (currency, network, environment). 'environment' here matches
 * each payment provider's own fixed identity ('demo', 'sandbox'), not the
 * 4-value AppEnvironment, since Demo/Sandbox each represent one payment
 * identity regardless of whether the app itself is running in the
 * 'development' or 'demo' AppEnvironment.
 */
export function createDepositAddressService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(environment: string): Promise<DepositAddress[]> {
      const { data, error } = await client.rpc('admin_list_deposit_addresses', { p_environment: environment });
      if (error) throw error;
      return (data as DepositAddressRow[]).map(mapRow);
    },

    async set(currency: string, network: string, environment: string, address: string, isActive = true): Promise<DepositAddress> {
      const { data, error } = await client.rpc('admin_set_deposit_address', {
        p_currency: currency,
        p_network: network,
        p_environment: environment,
        p_address: address,
        p_is_active: isActive,
      });
      if (error) throw error;
      return mapRow(data as DepositAddressRow);
    },
  };
}

export type DepositAddressService = ReturnType<typeof createDepositAddressService>;
