// Shared by the email edge functions: finds the Resend key saved in the admin
// panel (Integrations > Email), wraps content in the branded layout, sends
// through Resend's API and records every attempt in email_log.
//
// The key is read with the service role from integration_secrets, which no
// browser session can read.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const adminClient = (): SupabaseClient => createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export type EmailSettings = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  siteUrl: string;
  siteName: string;
  logoUrl: string | null;
  accent: string;
};

export class EmailNotConfigured extends Error {}

/** The connected email integration plus branding, or EmailNotConfigured. */
export async function loadEmailSettings(db: SupabaseClient): Promise<EmailSettings> {
  const { data: config } = await db
    .from('integration_configs')
    .select('id, config, status')
    .eq('provider_type', 'email')
    .eq('status', 'connected')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!config) throw new EmailNotConfigured('Email is not set up. Add your Resend API key under System > Integrations.');

  const { data: secret } = await db.from('integration_secrets').select('api_key').eq('integration_id', config.id).maybeSingle();
  if (!secret?.api_key) throw new EmailNotConfigured('The email integration has no API key saved.');

  const [{ data: branding }, { data: whiteLabel }] = await Promise.all([
    db.from('branding').select('site_name, logo_light_url, logo_url, primary_color').limit(1).maybeSingle(),
    db.from('white_label_settings').select('application_url, platform_name, support_email').limit(1).maybeSingle(),
  ]);

  const settings = (config.config ?? {}) as Record<string, string | undefined>;
  const siteUrl = (settings.site_url || whiteLabel?.application_url || '').replace(/\/+$/, '');
  const siteName = branding?.site_name || whiteLabel?.platform_name || 'Investo';
  const logoPath = branding?.logo_light_url || branding?.logo_url || null;
  const fromEmail = settings.from_email || whiteLabel?.support_email || '';
  if (!fromEmail) throw new EmailNotConfigured('Set the "send from" address in the email integration settings.');

  return {
    apiKey: secret.api_key,
    fromEmail,
    fromName: settings.from_name || siteName,
    siteUrl,
    siteName,
    logoUrl: logoPath ? (logoPath.startsWith('http') ? logoPath : siteUrl ? `${siteUrl}${logoPath}` : null) : null,
    accent: branding?.primary_color || '#a8442e',
  };
}

export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Branded, table-based layout that renders in every mail client. `body` must already be escaped HTML. */
export function layout(settings: EmailSettings, title: string, body: string, button?: { label: string; url: string }) {
  const header = settings.logoUrl
    ? `<img src="${escapeHtml(settings.logoUrl)}" alt="${escapeHtml(settings.siteName)}" height="36" style="display:block;height:36px;border:0">`
    : `<span style="font-size:20px;font-weight:700;color:#161326">${escapeHtml(settings.siteName)}</span>`;
  const cta = button
    ? `<p style="margin:28px 0"><a href="${escapeHtml(button.url)}" style="background:${escapeHtml(settings.accent)};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p>
       <p style="font-size:12px;color:#6b7280;word-break:break-all">If the button does not work, copy this link into your browser:<br>${escapeHtml(button.url)}</p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="padding:24px 28px;border-bottom:3px solid ${escapeHtml(settings.accent)}">${header}</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px;color:#161326">${escapeHtml(title)}</h1>
${body}${cta}
</td></tr>
<tr><td style="padding:16px 28px;background:#fafafa;font-size:12px;color:#6b7280">This email was sent by ${escapeHtml(settings.siteName)}. If you did not expect it, you can ignore it.</td></tr>
</table></td></tr></table></body></html>`;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string; notConfigured?: boolean };

/** Sends through Resend and logs the attempt. Never throws for delivery failures. */
export async function sendEmail(
  db: SupabaseClient,
  settings: EmailSettings,
  message: { kind: string; to: string; subject: string; html: string; sentBy?: string | null }
): Promise<SendResult> {
  let result: SendResult;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${settings.fromName} <${settings.fromEmail}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    result = response.ok && body.id ? { ok: true, id: body.id } : { ok: false, error: body.message || `Resend returned ${response.status}` };
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : 'Could not reach Resend' };
  }

  await db.from('email_log').insert({
    kind: message.kind,
    to_email: message.to,
    subject: message.subject,
    status: result.ok ? 'sent' : 'failed',
    error: result.ok ? null : result.error,
    provider_id: result.ok ? result.id : null,
    sent_by: message.sentBy ?? null,
  });
  return result;
}

export async function logNotConfigured(db: SupabaseClient, kind: string, to: string, subject: string, error: string, sentBy?: string | null) {
  await db.from('email_log').insert({ kind, to_email: to, subject, status: 'not_configured', error, sent_by: sentBy ?? null });
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
