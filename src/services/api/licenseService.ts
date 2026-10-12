import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export type LicenseStatus = 'active' | 'grace' | 'locked';

export interface LicenseState {
  status: LicenseStatus;
  paidUntil: string | null;
  locksOn: string | null;
  message: string | null;
  payUrl: string | null;
}

const ACTIVE: LicenseState = { status: 'active', paidUntil: null, locksOn: null, message: null, payUrl: null };

/** The site's subscription state, set by HQ. Sites not run from HQ are always active. */
export function createLicenseService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async get(): Promise<LicenseState> {
      const { data, error } = await client.from('license_state').select('*').eq('id', 1).maybeSingle();
      // A site that has not received the license table yet behaves as active.
      if (error || !data) return ACTIVE;
      return { status: data.status as LicenseStatus, paidUntil: data.paid_until, locksOn: data.locks_on, message: data.message, payUrl: data.pay_url ?? null };
    },
  };
}
