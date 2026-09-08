import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapDepositRow } from '../supabase/mappers';
import type { DepositRow } from '../supabase/mappers';
import type { Deposit } from '../../types/database';

export function createSandboxTestingService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async listPendingSandboxDeposits(): Promise<Deposit[]> {
      const { data, error } = await client
        .from('deposits')
        .select('*')
        .eq('provider', 'sandbox')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as DepositRow[]).map(mapDepositRow);
    },

    /** Invokes the simulate-sandbox-webhook Edge Function — see supabase/functions/. */
    async simulateWebhook(depositId: string): Promise<void> {
      const { error } = await client.functions.invoke('simulate-sandbox-webhook', { body: { deposit_id: depositId } });
      if (error) throw error;
    },
  };
}

export type SandboxTestingService = ReturnType<typeof createSandboxTestingService>;
