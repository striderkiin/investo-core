import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

let client: SupabaseClient | null = null;

const NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.';

/**
 * Every service factory defaults its `client` parameter to `getSupabaseClient()`,
 * and several pages instantiate their service at module scope (e.g.
 * `const investmentService = createInvestmentService();`) — that call must
 * never throw just because Supabase isn't configured yet, or importing the
 * module (which happens for every route once, since routes aren't code-split)
 * would take down the entire app before any component even renders.
 *
 * So instead of throwing here, we hand back a Proxy that only throws the
 * moment something actually tries to use it (`.from(...)`, `.auth...`, etc).
 * That happens inside a service method call, which every page already wraps
 * in try/catch and turns into a normal ErrorState — exactly the behavior we
 * want for "Supabase isn't configured yet".
 */
function createUnconfiguredClientProxy(): SupabaseClient {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(NOT_CONFIGURED_MESSAGE);
      },
    }
  ) as SupabaseClient;
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  if (!isSupabaseConfigured()) {
    return createUnconfiguredClientProxy();
  }

  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
