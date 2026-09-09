import * as Sentry from '@sentry/react';
import { env, IS_PRODUCTION, IS_SANDBOX } from './env';

/** No-ops when VITE_SENTRY_DSN isn't set (e.g. local dev) so nothing is sent anywhere by default. */
export function initMonitoring(): void {
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.environment,
    tracesSampleRate: IS_PRODUCTION || IS_SANDBOX ? 0.2 : 1.0,
  });
}
