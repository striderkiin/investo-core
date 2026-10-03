import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapDepositRow } from '../supabase/mappers';
import type { DepositRow } from '../supabase/mappers';
import type {
  CreateDepositInput,
  DepositSession,
  PaymentProvider,
  WithdrawalRequestInput,
  WithdrawalRequestResult,
} from './PaymentProvider';
import type { DepositStatus, WithdrawalStatus } from '../../types/database';

/**
 * PayRam, the merchant's self-hosted crypto gateway. The payram-checkout edge
 * function opens the deposit and returns PayRam's checkout page; the customer
 * picks the coin there. PayRam's webhook (payram-webhook) confirms the deposit
 * server-side, so this class only starts payments and reads their status.
 */
export function createPayramPaymentProvider(client: SupabaseClient = getSupabaseClient()): PaymentProvider {
  return {
    name: 'payram',

    async createDeposit({ amount }: CreateDepositInput): Promise<DepositSession> {
      const { data, error } = await client.functions.invoke('payram-checkout', { body: { amount } });
      if (error) {
        const context = (error as { context?: Response }).context;
        const parsed = context && typeof context.json === 'function' ? ((await context.json().catch(() => null)) as { error?: string } | null) : null;
        throw new Error(parsed?.error ?? error.message);
      }
      const result = data as { deposit: DepositRow; checkoutUrl: string };
      return { deposit: mapDepositRow(result.deposit), address: null, qrCodeData: null, checkoutUrl: result.checkoutUrl };
    },

    async getDepositStatus(depositId: string): Promise<DepositStatus> {
      const { data, error } = await client.from('deposits').select('status').eq('id', depositId).single();
      if (error) throw error;
      return data.status as DepositStatus;
    },

    async requestWithdrawal(_input: WithdrawalRequestInput): Promise<WithdrawalRequestResult> {
      // Withdrawals are reviewed and paid out by an admin.
      return { providerReference: `PAYRAM-WD-${crypto.randomUUID()}`, status: 'pending' satisfies WithdrawalStatus };
    },

    async getWithdrawalStatus(): Promise<WithdrawalStatus> {
      return 'pending';
    },

    verifyWebhook(): boolean {
      // Verified in the payram-webhook edge function, never in the browser.
      return false;
    },
  };
}
