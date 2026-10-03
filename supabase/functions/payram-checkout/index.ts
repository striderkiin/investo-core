// Starts a PayRam deposit for the signed-in customer (verify_jwt on):
//   { amount }          -> opens a pending deposit, creates a PayRam payment
//                          link for it and returns { deposit, checkoutUrl }
//   { action: 'test' }  -> admins only: checks the saved server address and key
// The amount is validated by open_provider_deposit (limits, maintenance,
// account status). The customer's email and id come from their session,
// never from the request body.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { adminClient, cors, json, loadPayram, PayramNotConfigured, payramRequest, SUPABASE_URL } from '../_shared/payram.ts';

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

type Body = { amount?: number; action?: string };
type CreatedPayment = { reference_id?: string; url?: string; referenceId?: string; checkoutUrl?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: 'Sign in again.' }, 401);

  const body = (await req.json().catch(() => ({}))) as Body;
  const db = adminClient();

  if (body.action === 'test') {
    const { data: allowed } = await userClient.rpc('has_permission', { p_permission_key: 'integrations.manage' });
    if (allowed !== true) return json({ error: 'Not allowed.' }, 403);
    try {
      const settings = await loadPayram(db, false);
      // An empty "create payment" request: PayRam refuses it without creating
      // anything. A wrong key gets 401, a working key gets a validation error.
      const res = await payramRequest(settings, '/api/v1/payment', { method: 'POST', body: '{}' });
      const reply = res.text.replace(/\s+/g, ' ').slice(0, 200);
      const keyRejected = res.status === 401;
      if (!keyRejected && res.data === null) {
        return json({ ok: false, message: `The address answered (HTTP ${res.status}), but not like the PayRam API. Check the server address. Reply: ${reply}` });
      }
      await db
        .from('integration_configs')
        .update({ status: keyRejected ? 'error' : 'connected', last_tested_at: new Date().toISOString() })
        .eq('id', settings.integrationId);
      if (keyRejected) return json({ ok: false, message: `PayRam rejected the API key (HTTP 401). Copy the key again from PayRam. Reply: ${reply}` });
      return json({ ok: true, message: `PayRam answered and accepted the API key (HTTP ${res.status}). Reply: ${reply}` });
    } catch (err) {
      const message = err instanceof PayramNotConfigured ? err.message : `Could not reach the PayRam server: ${err instanceof Error ? err.message : String(err)}`;
      return json({ ok: false, message });
    }
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Enter a valid amount.' }, 400);

  let settings;
  try {
    settings = await loadPayram(db);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Payments are not available right now.' }, 503);
  }

  const { data: deposit, error: openError } = await db.rpc('open_provider_deposit', { p_user_id: user.id, p_amount: amount, p_provider: 'payram' });
  if (openError || !deposit) return json({ error: openError?.message ?? 'Could not start the deposit.' }, 400);

  const fail = async (message: string) => {
    await db.from('deposits').update({ status: 'failed', admin_notes: message }).eq('id', deposit.id);
    console.error('payram-checkout:', message);
    return json({ error: 'The payment page could not be created. Please try again in a few minutes.' }, 502);
  };

  let created;
  try {
    created = await payramRequest<CreatedPayment>(settings, '/api/v1/payment', {
      method: 'POST',
      body: JSON.stringify({ customerEmail: user.email ?? '', customerId: user.id, amountInUSD: Number(deposit.amount) }),
    });
  } catch (err) {
    return fail(`PayRam could not be reached: ${err instanceof Error ? err.message : String(err)}`);
  }

  const reference = created.data?.reference_id ?? created.data?.referenceId;
  const checkoutUrl = created.data?.url ?? created.data?.checkoutUrl;
  if (created.status >= 300 || !reference || !checkoutUrl) {
    return fail(`PayRam returned HTTP ${created.status}: ${created.text.slice(0, 300)}`);
  }

  const { data: attached, error: attachError } = await db.rpc('attach_provider_checkout', {
    p_deposit_id: deposit.id,
    p_reference: reference,
    p_checkout_url: checkoutUrl,
  });
  if (attachError) return fail(`Could not save the PayRam reference: ${attachError.message}`);

  return json({ deposit: attached, checkoutUrl });
});
