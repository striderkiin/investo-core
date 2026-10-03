import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_ENVIRONMENT } from '../../config/env';
import { getSupabaseClient } from '../supabase/client';
import { createDemoPaymentProvider } from './DemoPaymentProvider';
import { createManualPaymentProvider } from './ManualPaymentProvider';
import { createPayramPaymentProvider } from './PayramPaymentProvider';
import { createSandboxPaymentProvider } from './SandboxPaymentProvider';
import type { PaymentProvider } from './PaymentProvider';

let cachedProvider: PaymentProvider | null = null;

/**
 * The provider for the current environment when no automatic gateway is
 * connected: Demo and Sandbox simulate payments; Production uses the admin's
 * own wallet addresses with manual confirmation.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  switch (APP_ENVIRONMENT) {
    case 'development':
    case 'demo':
      cachedProvider = createDemoPaymentProvider();
      return cachedProvider;
    case 'sandbox':
      cachedProvider = createSandboxPaymentProvider();
      return cachedProvider;
    case 'production':
      cachedProvider = createManualPaymentProvider();
      return cachedProvider;
  }
}

/** 'payram' when an admin has connected PayRam under Integrations, otherwise null. */
export async function getActiveGateway(client: SupabaseClient = getSupabaseClient()): Promise<'payram' | null> {
  const { data, error } = await client.rpc('active_payment_provider');
  if (error) return null;
  return data === 'payram' ? 'payram' : null;
}

/** The provider a new deposit should use: PayRam when connected, else the environment default. */
export async function resolveDepositProvider(client: SupabaseClient = getSupabaseClient()): Promise<PaymentProvider> {
  return (await getActiveGateway(client)) === 'payram' ? createPayramPaymentProvider(client) : getPaymentProvider();
}
