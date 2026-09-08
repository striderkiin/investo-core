import { APP_ENVIRONMENT } from '../../config/env';
import { createDemoPaymentProvider } from './DemoPaymentProvider';
import { createSandboxPaymentProvider } from './SandboxPaymentProvider';
import type { PaymentProvider } from './PaymentProvider';

let cachedProvider: PaymentProvider | null = null;

/**
 * Resolves the active PaymentProvider for the current environment. Demo and
 * Sandbox are both implemented; Production requires a real payment gateway
 * account and its credentials configured through the Integrations Center —
 * nothing above this factory (UI, depositService, withdrawalService) needs
 * to change once that lands.
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
      throw new Error('Production payment provider is not configured yet — connect a real provider in the Integrations Center.');
  }
}
