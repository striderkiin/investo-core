import { APP_ENVIRONMENT } from '../../config/env';
import { createDemoPaymentProvider } from './DemoPaymentProvider';
import type { PaymentProvider } from './PaymentProvider';

let cachedProvider: PaymentProvider | null = null;

/**
 * Resolves the active PaymentProvider for the current environment. Only the
 * Demo provider is implemented so far (Phase 1-5 scope); Sandbox and
 * Production providers are added in Phase 7 behind this same interface, so
 * nothing above this factory (UI, depositService, withdrawalService) will need
 * to change when they land.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  switch (APP_ENVIRONMENT) {
    case 'development':
    case 'demo':
      cachedProvider = createDemoPaymentProvider();
      return cachedProvider;
    case 'sandbox':
      throw new Error('Sandbox payment provider is not configured yet (Phase 7).');
    case 'production':
      throw new Error('Production payment provider is not configured yet (Phase 7).');
  }
}
