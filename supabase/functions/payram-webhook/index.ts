// Receives PayRam payment updates (verify_jwt off: PayRam has no Supabase
// session). Paste this function's URL into PayRam under Settings > Projects >
// your project > Webhook.
//
// Trust: PayRam sends the project API key in the "API-Key" header, and it is
// compared with the key saved in Integrations. The payment state is then read
// back from PayRam itself before the deposit is settled, so a forged body
// cannot credit a balance. If that lookup fails, the verified webhook body is
// used instead.

import { adminClient, json, loadPayram, normalizeState, PayramNotConfigured, payramRequest, sameSecret } from '../_shared/payram.ts';

type WebhookBody = { reference_id?: string; referenceId?: string; status?: string; filled_amount_in_usd?: number };
type PaymentLookup = { paymentState?: string; filledAmountInUSD?: string | number | null; data?: PaymentLookup };

const ACK = { message: 'Webhook received successfully' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const db = adminClient();
  let settings;
  try {
    settings = await loadPayram(db);
  } catch (err) {
    return json({ error: err instanceof PayramNotConfigured ? err.message : 'Not configured' }, 503);
  }

  const headerKey = req.headers.get('API-Key') ?? '';
  if (!headerKey || !sameSecret(headerKey, settings.apiKey)) return json({ error: 'invalid-key' }, 401);

  const body = (await req.json().catch(() => null)) as WebhookBody | null;
  const reference = body?.reference_id ?? body?.referenceId;
  if (!reference) return json({ error: 'missing reference_id' }, 400);

  let state = normalizeState(body?.status);
  let filled = body?.filled_amount_in_usd ?? null;
  try {
    const lookup = await payramRequest<PaymentLookup>(settings, `/api/v1/payment/reference/${encodeURIComponent(reference)}`);
    const payment = lookup.data?.data ?? lookup.data;
    if (lookup.status < 300 && payment?.paymentState) {
      state = normalizeState(payment.paymentState);
      filled = payment.filledAmountInUSD != null ? Number(payment.filledAmountInUSD) : filled;
    } else {
      console.warn(`payram-webhook: lookup for ${reference} returned HTTP ${lookup.status}; using the webhook body`);
    }
  } catch (err) {
    console.warn(`payram-webhook: lookup for ${reference} failed (${err instanceof Error ? err.message : err}); using the webhook body`);
  }

  const { error } = await db.rpc('settle_provider_deposit', {
    p_provider: 'payram',
    p_reference: reference,
    p_state: state,
    p_filled_usd: filled,
  });
  if (error) {
    // Payments created outside this site (for example a link made in the
    // PayRam dashboard) have no deposit here. Acknowledge so PayRam stops retrying.
    if (error.message.includes('deposit not found')) return json({ ...ACK, ignored: true });
    console.error('payram-webhook:', error.message);
    return json({ error: 'could not settle the deposit' }, 500);
  }

  return json(ACK);
});
