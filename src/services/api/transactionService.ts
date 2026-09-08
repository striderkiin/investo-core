import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapTransactionRow } from '../supabase/mappers';
import type { TransactionRow } from '../supabase/mappers';
import type { Transaction, TransactionStatus, TransactionType } from '../../types/database';

export interface TransactionFilters {
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
}

export function createTransactionService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(filters: TransactionFilters = {}): Promise<Transaction[]> {
      let query = client.from('transactions').select('*').order('created_at', { ascending: false });
      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.search) query = query.ilike('reference', `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data as TransactionRow[]).map(mapTransactionRow);
    },

    async getLedgerSummary(userId: string) {
      const transactions = await this.list({ userId });
      const sum = (type: TransactionType) =>
        transactions.filter((t) => t.type === type && t.status === 'completed').reduce((acc, t) => acc + Math.abs(t.amount), 0);

      return {
        totalDeposited: sum('deposit'),
        totalWithdrawn: sum('withdrawal'),
        totalInvested: sum('investment'),
        totalYield: sum('yield'),
        totalBonuses: sum('bonus'),
        referralEarnings: sum('referral'),
        transactions,
      };
    },
  };
}

export type TransactionService = ReturnType<typeof createTransactionService>;
