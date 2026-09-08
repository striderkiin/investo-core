export type AppEnvironment = 'development' | 'demo' | 'sandbox' | 'production';

const RAW_ENVIRONMENT = import.meta.env.VITE_APP_ENVIRONMENT as string | undefined;

function resolveEnvironment(value: string | undefined): AppEnvironment {
  if (value === 'development' || value === 'demo' || value === 'sandbox' || value === 'production') {
    return value;
  }
  return 'development';
}

export const APP_ENVIRONMENT: AppEnvironment = resolveEnvironment(RAW_ENVIRONMENT);

export const IS_DEMO = APP_ENVIRONMENT === 'demo';
export const IS_SANDBOX = APP_ENVIRONMENT === 'sandbox';
export const IS_PRODUCTION = APP_ENVIRONMENT === 'production';
export const IS_DEVELOPMENT = APP_ENVIRONMENT === 'development';

/**
 * Frontend never chooses providers/credentials directly — it only reads which
 * environment it is in for display purposes (badges, demo labels). Actual
 * environment-gated behavior (which credentials, which provider) is resolved
 * server-side / in the service layer, never by trusting a client toggle.
 */
export const env = {
  environment: APP_ENVIRONMENT,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  serverApiUrl: import.meta.env.SERVER_API_URL ?? '',
};

export function environmentLabel(environment: AppEnvironment): string {
  switch (environment) {
    case 'development':
      return 'DEVELOPMENT';
    case 'demo':
      return 'DEMO';
    case 'sandbox':
      return 'SANDBOX';
    case 'production':
      return 'PRODUCTION';
  }
}
