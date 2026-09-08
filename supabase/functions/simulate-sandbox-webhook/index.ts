// Admin-only convenience for Phase 10 ("test webhooks, test payment
// workflows"): builds a correctly-signed test webhook payload for a
// pending sandbox deposit and posts it straight to `payment-webhook`,
// server-side — exactly what a real sandbox gateway would send, without
// ever putting the webhook secret in the browser. Callable only by an
// admin holding `integrations.manage` (checked against the caller's own
// JWT via a normal, RLS-respecting Supabase client — not the service role).
//
// NOT DEPLOYED OR RUNTIME-TESTED, same caveat as ../payment-webhook/index.ts.
// Deploy with: supabase functions deploy simulate-sandbox-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });

  const { data: hasPermission, error: permError } = await callerClient.rpc('has_permission', { p_permission_key: 'integrations.manage' });
  if (permError || !hasPermission) {
    return new Response(JSON.stringify({ error: 'not authorized' }), { status: 403 });
  }

  const { deposit_id: depositId } = (await req.json()) as { deposit_id?: string };
  if (!depositId) {
    return new Response(JSON.stringify({ error: 'missing deposit_id' }), { status: 400 });
  }

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: secretRow, error: secretError } = await serviceClient
    .from('integration_secrets')
    .select('webhook_secret, integration_configs!inner(provider_type, environment)')
    .eq('integration_configs.provider_type', 'payment')
    .eq('integration_configs.environment', 'sandbox')
    .single();

  if (secretError || !secretRow?.webhook_secret) {
    return new Response(JSON.stringify({ error: 'no sandbox payment webhook secret configured' }), { status: 400 });
  }

  const payload = JSON.stringify({ deposit_id: depositId, event: 'deposit.completed', test: true });
  const signature = await hmacHex(payload, secretRow.webhook_secret);

  const { data, error } = await serviceClient.rpc('complete_sandbox_deposit', {
    p_deposit_id: depositId,
    p_raw_payload: payload,
    p_signature: signature,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ ok: true, deposit: data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
