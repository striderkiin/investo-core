// Sends platform emails for signed-in admins (verify_jwt on):
//   test          -> a test message to the admin's own address
//   statement     -> a customer's account statement, to that customer only
//   admin_invite  -> the invite link, to the invited address only
// Recipients and contents are decided here from the database, never taken
// from the browser, so the endpoint cannot be used to email arbitrary people.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  adminClient,
  cors,
  EmailNotConfigured,
  escapeHtml,
  json,
  layout,
  loadEmailSettings,
  logNotConfigured,
  sendEmail,
  SUPABASE_URL,
} from '../_shared/email.ts';

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Body = { kind?: string; customerId?: string; from?: string; to?: string; inviteId?: string; token?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: 'Sign in again.' }, 401);

  const can = async (permission: string) => {
    const { data } = await userClient.rpc('has_permission', { p_permission_key: permission });
    return data === true;
  };

  const body = (await req.json().catch(() => ({}))) as Body;
  const db = adminClient();

  const kind = body.kind ?? '';
  let to = '';
  let subject = '';
  let build: (settings: Awaited<ReturnType<typeof loadEmailSettings>>) => string;

  if (kind === 'test') {
    if (!(await can('integrations.manage'))) return json({ error: 'Not allowed.' }, 403);
    to = user.email ?? '';
    subject = 'Test email';
    build = (s) => layout(s, 'Your email is working', `<p>This test message was sent from the ${escapeHtml(s.siteName)} admin panel through Resend.</p>`);
  } else if (kind === 'statement') {
    if (!(await can('users.read'))) return json({ error: 'Not allowed.' }, 403);
    if (!body.customerId || !body.from || !body.to) return json({ error: 'Choose a customer and a period.' }, 400);
    const { data: customer } = await db.from('profiles').select('id, email, full_name, total_balance, available_balance, invested_balance, bonus_balance, role').eq('id', body.customerId).maybeSingle();
    if (!customer || customer.role !== 'client') return json({ error: 'Customer not found.' }, 404);
    const fromIso = new Date(`${body.from}T00:00:00Z`).toISOString();
    const toIso = new Date(`${body.to}T23:59:59.999Z`).toISOString();
    const { data: rows } = await db
      .from('transactions')
      .select('type, amount, balance_after, status, reference, description, created_at')
      .eq('user_id', customer.id)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .order('created_at', { ascending: true });
    const txns = rows ?? [];
    const completed = txns.filter((t) => t.status === 'completed');
    const credits = completed.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const debits = completed.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    to = customer.email;
    subject = `Your account statement, ${day(fromIso)} to ${day(toIso)}`;
    build = (s) => {
      const lines = txns.length
        ? txns
            .map(
              (t) => `<tr>
<td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(day(t.created_at))}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-transform:capitalize">${escapeHtml(t.type)}${t.description ? `<br><span style="color:#6b7280;font-size:12px">${escapeHtml(t.description)}</span>` : ''}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:${Number(t.amount) >= 0 ? '#15803d' : '#b91c1c'}">${Number(t.amount) >= 0 ? '+' : '-'}${escapeHtml(money(Math.abs(Number(t.amount))))}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(money(Number(t.balance_after)))}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-transform:capitalize">${escapeHtml(t.status)}</td></tr>`
            )
            .join('')
        : '<tr><td colspan="5" style="padding:12px;color:#6b7280">No transactions in this period.</td></tr>';
      return layout(
        s,
        'Account statement',
        `<p>Hello ${escapeHtml(customer.full_name || 'there')},</p>
<p>Here is your statement for ${escapeHtml(day(fromIso))} to ${escapeHtml(day(toIso))}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">
<tr><td style="padding:4px 0;color:#6b7280">Money in</td><td style="text-align:right">${escapeHtml(money(credits))}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280">Money out</td><td style="text-align:right">${escapeHtml(money(debits))}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280">Current total balance</td><td style="text-align:right;font-weight:700">${escapeHtml(money(Number(customer.total_balance)))}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280">Available to withdraw</td><td style="text-align:right">${escapeHtml(money(Number(customer.available_balance)))}</td></tr>
<tr><td style="padding:4px 0;color:#6b7280">Invested</td><td style="text-align:right">${escapeHtml(money(Number(customer.invested_balance)))}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">
<tr style="background:#f4f5f7"><th align="left" style="padding:8px">Date</th><th align="left" style="padding:8px">Type</th><th align="right" style="padding:8px">Amount</th><th align="right" style="padding:8px">Balance</th><th align="left" style="padding:8px">Status</th></tr>
${lines}</table>`,
        s.siteUrl ? { label: 'Open your dashboard', url: `${s.siteUrl}/client-app/index.html` } : undefined
      );
    };
  } else if (kind === 'admin_invite') {
    if (!(await can('admins.manage'))) return json({ error: 'Not allowed.' }, 403);
    if (!body.inviteId || !body.token) return json({ error: 'Missing invite.' }, 400);
    const { data: invite } = await db.from('admin_invites').select('id, email, role, token_hash, accepted_at, revoked_at, expires_at').eq('id', body.inviteId).maybeSingle();
    if (!invite || invite.token_hash !== (await sha256Hex(body.token)) || invite.accepted_at || invite.revoked_at || new Date(invite.expires_at) <= new Date()) {
      return json({ error: 'That invite is no longer valid.' }, 400);
    }
    to = invite.email;
    subject = 'You have been invited to the admin panel';
    const origin = (req.headers.get('origin') ?? '').replace(/\/+$/, '');
    build = (s) => {
      const base = s.siteUrl || origin;
      const link = `${base}/admin-app/auth/register?token=${encodeURIComponent(body.token!)}`;
      return layout(
        s,
        `Join the ${s.siteName} admin team`,
        `<p>You have been invited to help run ${escapeHtml(s.siteName)} as <strong>${escapeHtml(String(invite.role).replace(/_/g, ' '))}</strong>.</p>
<p>Use the button below to create your account. You will set a password and then an authenticator app. The link works once and expires on ${escapeHtml(day(invite.expires_at))}.</p>`,
        { label: 'Accept invitation', url: link }
      );
    };
  } else {
    return json({ error: 'Unknown email type.' }, 400);
  }

  if (!to) return json({ error: 'No recipient address.' }, 400);

  let settings;
  try {
    settings = await loadEmailSettings(db);
  } catch (error) {
    if (error instanceof EmailNotConfigured) {
      await logNotConfigured(db, kind, to, subject, error.message, user.id);
      return json({ error: error.message, notConfigured: true }, 409);
    }
    throw error;
  }

  const result = await sendEmail(db, settings, { kind, to, subject, html: build(settings), sentBy: user.id });
  if (!result.ok) return json({ error: result.error }, 502);

  await db.from('admin_audit_logs').insert({
    admin_id: user.id,
    action: `email_${kind}`,
    module: 'email',
    target: to,
    new_value: result.id,
    environment: 'production',
  });
  return json({ sent: true, to, id: result.id });
});
