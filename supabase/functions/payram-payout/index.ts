// Sends an approved withdrawal through PayRam (verify_jwt on, admins with
// withdrawals.approve only):
//   { withdrawalId, action: 'send' }     approve (if still pending) and ask
//                                        PayRam to send amount minus fee
//   { withdrawalId, action: 'refresh' }  read the payout back from PayRam
// PayRam pays USDT on Tron (TRC20) or Ethereum (ERC20) from its hot wallet.
// When PayRam reports the payout as sent, the withdrawal is completed with
// the transaction hash. A failed payout stays in processing so the admin can
// retry, pay by hand or reject and refund.
//
// API (PayRam SDK): POST /api/v1/withdrawal/merchant
//   { email, blockchainCode: TRX|ETH, currencyCode: USDT, amount, toAddress, customerID }
//   GET /api/v1/withdrawal/{id}/merchant -> { id, status, txHash, failureReason, ... }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { adminClient, cors, json, loadPayram, PayramNotConfigured, payramRequest, SUPABASE_URL } from '../_shared/payram.ts';

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

type Body = { withdrawalId?: string; action?: 'send' | 'refresh' };
type Payout = { id?: number | string; status?: string; txHash?: string | null; failureReason?: string | null; data?: Payout };

const CHAINS: Record<string, string> = { TRC20: 'TRX', TRON: 'TRX', ERC20: 'ETH', ETHEREUM: 'ETH' };
const DONE = new Set(['SENT', 'SUCCESS', 'SUCCEEDED', 'COMPLETED', 'COMPLETE', 'CONFIRMED', 'PROCESSED', 'DONE', 'PAID']);
const FAILED = new Set(['FAILED', 'FAILURE', 'REJECTED', 'CANCELLED', 'CANCELED', 'ERROR', 'DECLINED']);

const classify = (status: string) => (DONE.has(status) ? 'done' : FAILED.has(status) ? 'failed' : 'pending');
const reply = (text: string) => text.replace(/\s+/g, ' ').slice(0, 300);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return json({ error: 'Sign in again.' }, 401);
  const { data: allowed } = await userClient.rpc('has_permission', { p_permission_key: 'withdrawals.approve' });
  if (allowed !== true) return json({ error: 'Your role cannot send payouts.' }, 403);

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.withdrawalId) return json({ error: 'Missing withdrawal.' }, 400);
  const db = adminClient();

  let settings;
  try {
    settings = await loadPayram(db);
  } catch (err) {
    return json({ error: err instanceof PayramNotConfigured ? err.message : 'PayRam is not available.' }, 503);
  }

  const load = async () => {
    const { data } = await db.from('withdrawals').select('*').eq('id', body.withdrawalId).maybeSingle();
    return data as Record<string, unknown> | null;
  };
  let withdrawal = await load();
  if (!withdrawal) return json({ error: 'Withdrawal not found.' }, 404);

  // Applies a payout state from PayRam and completes the withdrawal when sent.
  const apply = async (payout: Payout | null, httpStatus: number, raw: string) => {
    const p = payout?.data ?? payout;
    // A 5xx reply may come after PayRam queued the payout, so treat it as unknown, never as safe to resend.
    if (httpStatus >= 500) {
      const message = `PayRam answered HTTP ${httpStatus}: ${reply(raw)}. Check the Withdraw page in PayRam before doing anything else: if the payout is not there, pay this withdrawal by hand.`;
      await db.rpc('record_withdrawal_payout', { p_withdrawal_id: body.withdrawalId, p_provider: 'payram', p_reference: null, p_status: 'UNKNOWN', p_error: message });
      return json({ ok: false, status: 'UNKNOWN', message });
    }
    const status = String(p?.status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_') || (httpStatus < 300 ? 'QUEUED' : 'FAILED');
    const outcome = httpStatus >= 300 ? 'failed' : classify(status);
    const error = outcome === 'failed' ? (p?.failureReason ?? reply(raw)) || 'PayRam did not send the payout.' : null;
    await db.rpc('record_withdrawal_payout', {
      p_withdrawal_id: body.withdrawalId,
      p_provider: 'payram',
      p_reference: p?.id != null ? String(p.id) : null,
      p_status: status,
      p_error: error,
    });
    if (outcome === 'done') {
      await db.rpc('settle_withdrawal_payout', { p_withdrawal_id: body.withdrawalId, p_tx_hash: p?.txHash ?? null });
      return json({ ok: true, status, message: 'PayRam sent the payout. The withdrawal is completed.' });
    }
    if (outcome === 'failed') return json({ ok: false, status, message: `PayRam did not send it: ${error}` });
    const hint = status.includes('APPROV') ? ' It may be waiting for approval in the PayRam dashboard (Withdraw).' : '';
    return json({ ok: true, status, message: `PayRam accepted the payout (status: ${status}).${hint} Click Check payout status to update it.` });
  };

  if (body.action === 'refresh') {
    const reference = withdrawal.payout_reference as string | null;
    if (!reference) return json({ error: 'This withdrawal was not sent through PayRam.' }, 400);
    try {
      const res = await payramRequest<Payout>(settings, `/api/v1/withdrawal/${encodeURIComponent(reference)}/merchant`);
      if (res.status >= 300) return json({ ok: false, message: `PayRam answered HTTP ${res.status}: ${reply(res.text)}` });
      return await apply(res.data, res.status, res.text);
    } catch (err) {
      return json({ ok: false, message: `Could not reach PayRam: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // action 'send'
  const currency = String(withdrawal.currency ?? '').toUpperCase();
  const chain = CHAINS[String(withdrawal.network ?? '').toUpperCase()];
  if (currency !== 'USDT' || !chain) {
    return json({ error: `PayRam sends USDT on TRC20 or ERC20 only. This one is ${currency} (${withdrawal.network}); pay it by hand.` }, 400);
  }
  if ((withdrawal.payout_reference || withdrawal.payout_status === 'UNKNOWN') && !FAILED.has(String(withdrawal.payout_status ?? ''))) {
    return json({ error: 'This withdrawal was already sent to PayRam. Use Check payout status.' }, 409);
  }

  if (['pending', 'review'].includes(String(withdrawal.status))) {
    const { error } = await userClient.rpc('review_withdrawal', { p_withdrawal_id: body.withdrawalId, p_action: 'approve', p_notes: 'Sent with PayRam' });
    if (error) return json({ error: error.message }, 400);
    withdrawal = await load();
  }
  if (!withdrawal || withdrawal.status !== 'processing') return json({ error: 'Only pending or approved withdrawals can be sent.' }, 400);

  const { data: customer } = await db.from('profiles').select('email').eq('id', withdrawal.user_id).maybeSingle();
  const amount = (Number(withdrawal.amount) - Number(withdrawal.fee ?? 0)).toFixed(2);

  try {
    const res = await payramRequest<Payout>(settings, '/api/v1/withdrawal/merchant', {
      method: 'POST',
      body: JSON.stringify({
        email: customer?.email ?? '',
        blockchainCode: chain,
        currencyCode: 'USDT',
        amount,
        toAddress: withdrawal.destination,
        customerID: String(withdrawal.user_id),
      }),
    });
    return await apply(res.data, res.status, res.text);
  } catch (err) {
    // The request may still have reached PayRam, so this is not marked as
    // failed: a second send could pay the customer twice.
    const message = `The connection to PayRam failed (${err instanceof Error ? err.message : String(err)}). Check the Withdraw page in PayRam before doing anything else: if the payout is not there, pay this withdrawal by hand.`;
    await db.rpc('record_withdrawal_payout', { p_withdrawal_id: body.withdrawalId, p_provider: 'payram', p_reference: null, p_status: 'UNKNOWN', p_error: message });
    return json({ ok: false, message });
  }
});
