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
 * Live site without PayRam: the customer pays one of the admin's own wallet
 * addresses (Integrations > Wallet addresses, Live) and an admin confirms the
 * deposit under Deposits.
 */
export function createManualPaymentProvider(client: SupabaseClient = getSupabaseClient()): PaymentProvider {
  return {
    name: 'manual',

    async createDeposit({ amount, currency, network }: CreateDepositInput): Promise<DepositSession> {
      const { data, error } = await client.rpc('create_manual_deposit', { p_amount: amount, p_currency: currency, p_network: network });
      if (error) throw error;
      const deposit = mapDepositRow(data as DepositRow);
      return { deposit, address: deposit.destinationAddress ?? null, qrCodeData: null };
    },

    async getDepositStatus(depositId: string): Promise<DepositStatus> {
      const { data, error } = await client.from('deposits').select('status').eq('id', depositId).single();
      if (error) throw error;
      return data.status as DepositStatus;
    },

    async requestWithdrawal(_input: WithdrawalRequestInput): Promise<WithdrawalRequestResult> {
      return { providerReference: `MAN-WD-${crypto.randomUUID()}`, status: 'pending' satisfies WithdrawalStatus };
    },

    async getWithdrawalStatus(): Promise<WithdrawalStatus> {
      return 'pending';
    },

    verifyWebhook(): boolean {
      return false;
    },
  };
}
