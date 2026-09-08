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
 * Models a real test-network payment gateway. Unlike DemoPaymentProvider,
 * a Sandbox deposit does NOT self-confirm — it stays `pending` until
 * `complete_sandbox_deposit()` is called with a valid HMAC-SHA256 signature
 * over the webhook payload, verified against the secret configured for this
 * integration (Integrations Center, Phase 7). That RPC is deliberately
 * unreachable by `authenticated`/`anon` (see migration 0014) — only a
 * service-role-authenticated webhook receiver could ever call it, so
 * verifyWebhook() here always fails: the frontend has no business holding
 * that secret, let alone using it to confirm its own deposit.
 */
export function createSandboxPaymentProvider(client: SupabaseClient = getSupabaseClient()): PaymentProvider {
  return {
    name: 'sandbox',

    async createDeposit({ amount, currency, network }: CreateDepositInput): Promise<DepositSession> {
      const { data, error } = await client.rpc('create_sandbox_deposit', {
        p_amount: amount,
        p_currency: currency,
        p_network: network,
      });
      if (error) throw error;

      const deposit = mapDepositRow(data as DepositRow);

      return {
        deposit,
        address: `sandbox-${network.toLowerCase()}-address-${deposit.id.slice(0, 8)}`,
        qrCodeData: `sandbox:${currency}:${network}:${amount}:${deposit.id}`,
      };
    },

    async getDepositStatus(depositId: string): Promise<DepositStatus> {
      const { data, error } = await client.from('deposits').select('status').eq('id', depositId).single();
      if (error) throw error;
      return data.status as DepositStatus;
    },

    async requestWithdrawal(_input: WithdrawalRequestInput): Promise<WithdrawalRequestResult> {
      return {
        providerReference: `SANDBOX-WD-${crypto.randomUUID()}`,
        status: 'processing' satisfies WithdrawalStatus,
      };
    },

    async getWithdrawalStatus(): Promise<WithdrawalStatus> {
      return 'processing';
    },

    verifyWebhook(): boolean {
      // Real verification happens inside complete_sandbox_deposit() in Postgres
      // (HMAC-SHA256 over the raw payload, checked against the integration's
      // stored webhook secret via pgcrypto's hmac()) — a function the frontend
      // cannot even call. This client-side stub always fails on purpose.
      return false;
    },
  };
}
