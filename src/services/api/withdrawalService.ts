import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapWithdrawalRow } from '../supabase/mappers';
import type { WithdrawalRow } from '../supabase/mappers';
import type { Withdrawal, WithdrawalStatus } from '../../types/database';

export interface RequestWithdrawalInput {
  amount: number;
  currency: string;
  network: string;
  destination: string;
}

export type WithdrawalReviewAction = 'approve' | 'reject' | 'hold' | 'complete';

export function createWithdrawalService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async request(input: RequestWithdrawalInput): Promise<Withdrawal> {
      const { data, error } = await client.rpc('request_withdrawal', {
        p_amount: input.amount,
        p_currency: input.currency,
        p_network: input.network,
        p_destination: input.destination,
      });
      if (error) throw error;
      return mapWithdrawalRow(data as WithdrawalRow);
    },

    async review(withdrawalId: string, action: WithdrawalReviewAction, notes?: string): Promise<Withdrawal> {
      const { data, error } = await client.rpc('review_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_action: action,
        p_notes: notes ?? null,
      });
      if (error) throw error;
      return mapWithdrawalRow(data as WithdrawalRow);
    },

    async listMine(userId: string): Promise<Withdrawal[]> {
      const { data, error } = await client
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as WithdrawalRow[]).map(mapWithdrawalRow);
    },

    async listAll(status?: WithdrawalStatus): Promise<Withdrawal[]> {
      let query = client.from('withdrawals').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data as WithdrawalRow[]).map(mapWithdrawalRow);
    },
  };
}

export type WithdrawalService = ReturnType<typeof createWithdrawalService>;
