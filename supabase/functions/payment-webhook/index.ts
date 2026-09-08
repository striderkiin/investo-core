// Sandbox/Production payment-provider webhook receiver (spec section 80).
//
// NOT DEPLOYED OR RUNTIME-TESTED — this environment's session cannot reach
// Supabase's network at all (see docs/SPEC.md history / commit messages for
// why), so this has never actually run against the Deno Edge Runtime.
// Structure follows Supabase's documented Edge Functions conventions
// (Deno.serve, @supabase/supabase-js served from esm.sh, SUPABASE_SERVICE_ROLE_KEY
// from the function's environment). Deploy with:
//   supabase functions deploy payment-webhook
// and verify it end-to-end before relying on it for real money movement.
//
// This is the ONE place in the whole system allowed to call
// complete_sandbox_deposit() — that RPC is revoked from `authenticated`/`anon`
// specifically so that only a service-role caller like this function (never
// the browser) can ever confirm a deposit. The actual HMAC-SHA256 signature
// check happens inside that Postgres function via pgcrypto's hmac(), using
// the webhook secret stored in `integration_secrets` — this function's job is
// only to forward the raw request body and signature header through.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('x-webhook-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'missing x-webhook-signature header' }), { status: 400 });
  }

  const rawBody = await req.text();

  let depositId: string | undefined;
  try {
    const parsed = JSON.parse(rawBody) as { deposit_id?: string };
    depositId = parsed.deposit_id;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400 });
  }

  if (!depositId) {
    return new Response(JSON.stringify({ error: 'missing deposit_id in payload' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc('complete_sandbox_deposit', {
    p_deposit_id: depositId,
    p_raw_payload: rawBody,
    p_signature: signature,
  });

  if (error) {
    // Signature mismatch, deposit already completed, etc. — never leak
    // internals, but do return enough for the provider's retry logic to
    // distinguish "bad signature" from "server error".
    const isSignatureError = error.message?.toLowerCase().includes('signature');
    return new Response(JSON.stringify({ error: error.message }), { status: isSignatureError ? 401 : 400 });
  }

  return new Response(JSON.stringify({ ok: true, deposit: data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
