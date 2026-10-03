// Shared by the PayRam edge functions: finds the PayRam server saved in the
// admin panel (Integrations > PayRam) and talks to its merchant API.
//
// API (from PayRam's official SDK, npm "payram"):
//   POST {base}/api/v1/payment                       create a payment link
//        body { customerEmail, customerId, amountInUSD } -> { reference_id, url }
//   GET  {base}/api/v1/payment/reference/{reference}  read a payment
//        -> { paymentState, amountInUSD, filledAmountInUSD, ... }
// Every request carries the project API key in the "API-Key" header. PayRam
// sends the same header on its webhook calls.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const adminClient = (): SupabaseClient => createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export type PayramSettings = { integrationId: string; baseUrl: string; apiKey: string };

export class PayramNotConfigured extends Error {}

export async function loadPayram(db: SupabaseClient, requireConnected = true): Promise<PayramSettings> {
  let query = db.from('integration_configs').select('id, config, status').eq('provider_type', 'payment').ilike('provider_name', 'payram');
  if (requireConnected) query = query.eq('status', 'connected');
  const { data: config } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (!config) throw new PayramNotConfigured('PayRam is not connected. Add it under System > Integrations.');

  const baseUrl = String((config.config as Record<string, unknown> | null)?.base_url ?? '').replace(/\/+$/, '');
  if (!baseUrl) throw new PayramNotConfigured('The PayRam server address is missing.');

  const { data: secret } = await db.from('integration_secrets').select('api_key').eq('integration_id', config.id).maybeSingle();
  if (!secret?.api_key) throw new PayramNotConfigured('The PayRam API key is missing.');

  return { integrationId: config.id, baseUrl, apiKey: secret.api_key };
}

export async function payramRequest<T>(settings: PayramSettings, path: string, init: RequestInit = {}): Promise<{ status: number; data: T | null; text: string }> {
  const res = await fetch(`${settings.baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'API-Key': settings.apiKey, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data, text };
}

/** Constant-time comparison for the webhook's API-Key header. */
export function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * PayRam reports webhook states (FILLED, PARTIALLY_FILLED, ...) and payment
 * lookups may use other words (PAID, EXPIRED). Map both to the webhook set.
 */
export function normalizeState(state: unknown): string {
  const s = String(state ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESS') return 'FILLED';
  if (s === 'EXPIRED' || s === 'CANCELED' || s === 'FAILED') return 'CANCELLED';
  if (s === 'PARTIAL' || s === 'PARTIALLY_PAID') return 'PARTIALLY_FILLED';
  if (s === 'OVERPAID') return 'OVER_FILLED';
  return s;
}
