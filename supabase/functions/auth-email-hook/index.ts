// Supabase Auth "Send Email" hook (verify_jwt off; requests are signed).
// Once enabled in the Supabase dashboard (Authentication > Hooks), every auth
// email (sign-up confirmation, password reset, magic link, invite, email
// change) is sent through the Resend key saved in the admin panel instead of
// Supabase's rate-limited built-in sender.
//
// Setup: in Supabase, Authentication > Hooks > Send Email > HTTPS, point it at
// this function, then copy the generated secret into this function's
// secrets as SEND_EMAIL_HOOK_SECRET.

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { adminClient, EmailNotConfigured, escapeHtml, layout, loadEmailSettings, sendEmail, SUPABASE_URL } from '../_shared/email.ts';

const HOOK_SECRET = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace(/^v1,whsec_/, '');

type HookPayload = {
  user: { email: string; new_email?: string; user_metadata?: { full_name?: string } };
  email_data: { token: string; token_hash: string; redirect_to: string; email_action_type: string; site_url: string; token_hash_new?: string };
};

const COPY: Record<string, { subject: string; title: string; text: string; button: string }> = {
  signup: { subject: 'Confirm your email', title: 'Confirm your email address', text: 'Thanks for signing up. Confirm your email address to activate your account.', button: 'Confirm email' },
  recovery: { subject: 'Reset your password', title: 'Reset your password', text: 'We received a request to reset your password. If it was you, choose a new password below.', button: 'Reset password' },
  magiclink: { subject: 'Your sign-in link', title: 'Sign in', text: 'Use the button below to sign in.', button: 'Sign in' },
  invite: { subject: 'You have been invited', title: 'You have been invited', text: 'You have been invited to create an account.', button: 'Accept invitation' },
  email_change: { subject: 'Confirm your new email', title: 'Confirm your new email address', text: 'Confirm this address to finish changing the email on your account.', button: 'Confirm new email' },
  reauthentication: { subject: 'Your verification code', title: 'Verification code', text: 'Enter this code to continue:', button: '' },
};

const failure = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: { http_code: status, message } }), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return failure('Method not allowed', 405);
  if (!HOOK_SECRET) return failure('SEND_EMAIL_HOOK_SECRET is not set on the auth-email-hook function.');

  const raw = await req.text();
  let payload: HookPayload;
  try {
    payload = new Webhook(HOOK_SECRET).verify(raw, Object.fromEntries(req.headers)) as HookPayload;
  } catch {
    return failure('Invalid signature', 401);
  }

  const { user, email_data: data } = payload;
  const action = data.email_action_type;
  const copy = COPY[action] ?? COPY.magiclink;
  const to = action === 'email_change' && user.new_email ? user.new_email : user.email;

  const db = adminClient();
  let settings;
  try {
    settings = await loadEmailSettings(db);
  } catch (error) {
    return failure(error instanceof EmailNotConfigured ? error.message : 'Email settings could not be loaded.');
  }

  const link = `${SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(data.token_hash)}&type=${encodeURIComponent(action)}&redirect_to=${encodeURIComponent(data.redirect_to || data.site_url)}`;
  const greeting = user.user_metadata?.full_name ? `<p>Hello ${escapeHtml(user.user_metadata.full_name)},</p>` : '';
  const body =
    action === 'reauthentication'
      ? `${greeting}<p>${escapeHtml(copy.text)}</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${escapeHtml(data.token)}</p>`
      : `${greeting}<p>${escapeHtml(copy.text)}</p><p style="color:#6b7280;font-size:13px">Or enter this code: <strong>${escapeHtml(data.token)}</strong></p>`;

  const result = await sendEmail(db, settings, {
    kind: `auth_${action}`,
    to,
    subject: `${copy.subject} | ${settings.siteName}`,
    html: layout(settings, copy.title, body, copy.button ? { label: copy.button, url: link } : undefined),
  });
  if (!result.ok) return failure(result.error);

  return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
