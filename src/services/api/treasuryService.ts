import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapTreasuryAccountRow } from '../supabase/mappers';
import type { TreasuryAccountRow } from '../supabase/mappers';
import type { TreasuryAccount } from '../../types/database';

export function createTreasuryService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(): Promise<TreasuryAccount[]> {
      const { data, error } = await client.from('treasury_accounts').select('*').order('name');
      if (error) throw error;
      return (data as TreasuryAccountRow[]).map(mapTreasuryAccountRow);
    },

    async addDemoFunds(accountId: string, amount: number): Promise<TreasuryAccount> {
      const { data: current, error: readError } = await client
        .from('treasury_accounts')
        .select('balance')
        .eq('id', accountId)
        .single();
      if (readError) throw readError;

      const { data, error } = await client
        .from('treasury_accounts')
        .update({ balance: Number(current.balance) + amount })
        .eq('id', accountId)
        .select('*')
        .single();
      if (error) throw error;
      return mapTreasuryAccountRow(data as TreasuryAccountRow);
    },

    async moveToReserve(accountId: string, amount: number): Promise<TreasuryAccount> {
      const { data: current, error: readError } = await client
        .from('treasury_accounts')
        .select('balance, reserve_balance')
        .eq('id', accountId)
        .single();
      if (readError) throw readError;
      if (Number(current.balance) < amount) {
        throw new Error('Insufficient operating balance to move to reserve');
      }

      const { data, error } = await client
        .from('treasury_accounts')
        .update({
          balance: Number(current.balance) - amount,
          reserve_balance: Number(current.reserve_balance) + amount,
        })
        .eq('id', accountId)
        .select('*')
        .single();
      if (error) throw error;
      return mapTreasuryAccountRow(data as TreasuryAccountRow);
    },
  };
}

export type TreasuryService = ReturnType<typeof createTreasuryService>;
