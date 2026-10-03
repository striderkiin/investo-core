import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapDepositRow } from '../supabase/mappers';
import type { DepositRow } from '../supabase/mappers';
import type { Deposit, DepositStatus } from '../../types/database';
import { getActiveGateway, resolveDepositProvider } from '../payments/paymentProviderFactory';
import type { DepositSession } from '../payments/PaymentProvider';

export interface CreateDepositRequest {
  userId: string;
  amount: number;
  currency: string;
  network: string;
}

export function createDepositService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async createDeposit(request: CreateDepositRequest): Promise<DepositSession> {
      const provider = await resolveDepositProvider(client);
      return provider.createDeposit(request);
    },

    /** 'payram' when deposits go through a PayRam checkout page, else null (pay to an address). */
    activeGateway(): Promise<'payram' | null> {
      return getActiveGateway(client);
    },

    async getStatus(depositId: string): Promise<DepositStatus> {
      const { data, error } = await client.from('deposits').select('status').eq('id', depositId).single();
      if (error) throw error;
      return data.status as DepositStatus;
    },

    async listMine(userId: string): Promise<Deposit[]> {
      const { data, error } = await client
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as DepositRow[]).map(mapDepositRow);
    },

    async listAll(status?: DepositStatus): Promise<Deposit[]> {
      let query = client.from('deposits').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data as DepositRow[]).map(mapDepositRow);
    },
  };
}

export type DepositService = ReturnType<typeof createDepositService>;
