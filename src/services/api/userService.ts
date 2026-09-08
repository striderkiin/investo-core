import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapProfileRow } from '../supabase/mappers';
import type { ProfileRow } from '../supabase/mappers';
import type { AccountStatus, Profile, Transaction } from '../../types/database';
import { mapTransactionRow } from '../supabase/mappers';
import type { TransactionRow } from '../supabase/mappers';
import type { RoleName } from '../../types/roles';

export type BalanceField = 'total_balance' | 'available_balance' | 'bonus_balance' | 'invested_balance';
export type AdjustmentType = 'credit' | 'debit';

export interface AdjustBalanceInput {
  userId: string;
  field: BalanceField;
  amount: number;
  type: AdjustmentType;
  reason: string;
  notes?: string;
}

export function createUserService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(search?: string): Promise<Profile[]> {
      let query = client.from('profiles').select('*').order('created_at', { ascending: false });
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as ProfileRow[]).map(mapProfileRow);
    },

    async getById(userId: string): Promise<Profile | null> {
      const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      return data ? mapProfileRow(data as ProfileRow) : null;
    },

    async updateProfile(userId: string, updates: Partial<Pick<Profile, 'fullName' | 'avatarUrl'>>): Promise<Profile> {
      const payload: Record<string, unknown> = {};
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

      const { data, error } = await client.from('profiles').update(payload).eq('id', userId).select('*').single();
      if (error) throw error;
      return mapProfileRow(data as ProfileRow);
    },

    async setAccountStatus(userId: string, status: AccountStatus): Promise<Profile> {
      const { data, error } = await client
        .from('profiles')
        .update({ account_status: status })
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return mapProfileRow(data as ProfileRow);
    },

    async adjustBalance(input: AdjustBalanceInput): Promise<Transaction> {
      const { data, error } = await client.rpc('adjust_user_balance', {
        p_user_id: input.userId,
        p_field: input.field,
        p_amount: input.amount,
        p_type: input.type,
        p_reason: input.reason,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return mapTransactionRow(data as TransactionRow);
    },

    async listAdmins(): Promise<Profile[]> {
      const { data, error } = await client.from('profiles').select('*').neq('role', 'client').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ProfileRow[]).map(mapProfileRow);
    },

    async setRole(userId: string, role: RoleName): Promise<Profile> {
      const { data, error } = await client.rpc('admin_set_user_role', { p_user_id: userId, p_role: role });
      if (error) throw error;
      return mapProfileRow(data as ProfileRow);
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
