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

const DEMO_CONFIRMATION_DELAY_MS = 4000;

/**
 * Simulates a crypto payment provider end-to-end for Development/Demo use, with
 * no external network calls and no real funds. `createDeposit` opens a pending
 * deposit exactly like a real provider would after starting a payment session;
 * confirmation is performed by `demo_complete_deposit`, a security-definer
 * Postgres function — the same trust boundary a real provider's webhook handler
 * would occupy, so the frontend still never marks its own deposit as paid.
 */
export function createDemoPaymentProvider(client: SupabaseClient = getSupabaseClient()): PaymentProvider {
  return {
    name: 'demo',

    async createDeposit({ amount, currency, network }: CreateDepositInput): Promise<DepositSession> {
      // Routed through create_demo_deposit() so deposit min/max, the deposit-enabled
      // flag, and maintenance mode are enforced server-side — the same validation
      // request_withdrawal() already gets — instead of trusting the client to only
      // ever insert a reasonable row.
      const { data, error } = await client.rpc('create_demo_deposit', {
        p_amount: amount,
        p_currency: currency,
        p_network: network,
      });
      if (error) throw error;

      const deposit = mapDepositRow(data as DepositRow);

      setTimeout(() => {
        void client.rpc('demo_complete_deposit', { p_deposit_id: deposit.id });
      }, DEMO_CONFIRMATION_DELAY_MS);

      return {
        deposit,
        address: `demo-${network.toLowerCase()}-address-${deposit.id.slice(0, 8)}`,
        qrCodeData: `demo:${currency}:${network}:${amount}:${deposit.id}`,
      };
    },

    async getDepositStatus(depositId: string): Promise<DepositStatus> {
      const { data, error } = await client.from('deposits').select('status').eq('id', depositId).single();
      if (error) throw error;
      return data.status as DepositStatus;
    },

    async requestWithdrawal(_input: WithdrawalRequestInput): Promise<WithdrawalRequestResult> {
      return {
        providerReference: `DEMO-WD-${crypto.randomUUID()}`,
        status: 'processing' satisfies WithdrawalStatus,
      };
    },

    async getWithdrawalStatus(): Promise<WithdrawalStatus> {
      return 'completed';
    },

    verifyWebhook(): boolean {
      // The demo provider has no external webhook to verify; real providers
      // (Sandbox/Production) must verify an HMAC signature here before trusting
      // any payload. See PaymentProvider — this method exists specifically so
      // that contract is enforced uniformly across every provider.
      return true;
    },
  };
}
