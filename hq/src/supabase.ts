import { createClient } from '@supabase/supabase-js';

// HQ's own Supabase project. The publishable key is meant for browsers:
// every table is locked to signed-in owners who passed 2FA. The values can
// be overridden at build time when HQ moves to another project.
const url = import.meta.env.VITE_HQ_SUPABASE_URL ?? 'https://lhkyrwvaowtyeybmaezg.supabase.co';
const key = import.meta.env.VITE_HQ_SUPABASE_KEY ?? 'sb_publishable_Jnwj3AUYYf-e6tNC5R_kLg_yahAgrtV';

export const supabase = createClient(url, key, {
  auth: { storageKey: 'investo_hq_auth', persistSession: true, autoRefreshToken: true },
});

export const errorText = (error: unknown, fallback: string) =>
  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message ? error.message : fallback;
