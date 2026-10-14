// Public endpoint (verify_jwt off), demo builds only: trades a pass signed by
// MojoX for a one-time sign-in token for the shared demo client or demo admin.
//
// The pass is base64url(JSON {role, minutes, nonce, exp}) + "." + base64url
// HMAC-SHA256 of that JSON, signed with DEMO_SESSION_SECRET (the same value is
// set on MojoX). Each nonce is recorded in demo_passes so a pass works once.
//
// Secrets: DEMO_SESSION_SECRET, DEMO_CLIENT_EMAIL, DEMO_ADMIN_EMAIL.
// The admin account must have the demo_admin role and the client account the
// client role; anything else is refused, so a mistyped email can never hand
// out a real admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const adminClient = () =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SECRET = Deno.env.get('DEMO_SESSION_SECRET') ?? '';
const ACCOUNTS = {
  client: { email: Deno.env.get('DEMO_CLIENT_EMAIL') ?? '', role: 'client' },
  admin: { email: Deno.env.get('DEMO_ADMIN_EMAIL') ?? '', role: 'demo_admin' },
} as const;
const MAX_MINUTES = 30;

type Pass = { role: 'client' | 'admin'; minutes: number; nonce: string; exp: number };

const fromBase64Url = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function readPass(pass: string): Promise<Pass | null> {
  const [payload, signature] = pass.split('.');
  if (!payload || !signature) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let valid = false;
  try {
    valid = await crypto.subtle.verify('HMAC', key, fromBase64Url(signature), new TextEncoder().encode(payload));
  } catch {
    return null;
  }
  if (!valid) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Pass;
    if (data.role !== 'client' && data.role !== 'admin') return null;
    if (typeof data.nonce !== 'string' || typeof data.exp !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SECRET) return json({ error: 'The demo is not set up yet.' }, 503);

  const { pass } = (await req.json().catch(() => ({}))) as { pass?: string };
  const data = typeof pass === 'string' ? await readPass(pass) : null;
  if (!data) return json({ error: 'This demo link is not valid.' }, 400);
  if (data.exp < Date.now() / 1000) return json({ error: 'This demo link has expired. Open the demo again.' }, 400);

  const account = ACCOUNTS[data.role];
  if (!account.email) return json({ error: 'The demo is not set up yet.' }, 503);

  const db = adminClient();
  const { error: claimError } = await db.from('demo_passes').insert({ nonce: data.nonce, role: data.role });
  if (claimError) return json({ error: 'This demo link was already used. Open the demo again.' }, 400);

  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email: account.email });
  const userId = link?.user?.id;
  if (linkError || !userId || !link.properties?.hashed_token) return json({ error: 'Could not start the demo.' }, 500);

  const { data: profile } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile?.role !== account.role) return json({ error: 'The demo account is not set up correctly.' }, 500);

  // A visitor may have turned on 2FA for the shared client, which would lock
  // everyone else out of the client demo. Clear it before each demo session.
  // (The demo admin is let in without 2FA by the demo build itself.)
  if (data.role === 'client') {
    const { data: mfa } = await db.auth.admin.mfa.listFactors({ userId });
    for (const factor of mfa?.factors ?? []) {
      await db.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    }
  }

  const minutes = Math.min(Math.max(Number(data.minutes) || 5, 1), MAX_MINUTES);
  return json({ tokenHash: link.properties.hashed_token, role: data.role, expiresAt: Date.now() + minutes * 60_000 });
});
