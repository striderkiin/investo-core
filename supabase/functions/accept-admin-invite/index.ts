// Public endpoint (verify_jwt off): turns a valid admin invite into an account.
// The browser sends only the invite token, a name and a password. The email
// and role come from the invite row; claim_admin_invite re-checks the token
// inside the database and burns it, so a link works once.

import { adminClient, cors, json } from '../_shared/email.ts';

type Body = { token?: string; fullName?: string; password?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const { token, fullName, password } = (await req.json().catch(() => ({}))) as Body;
  if (!token || typeof token !== 'string' || token.length < 32) return json({ error: 'This invite link is not valid.' }, 400);
  if (!fullName?.trim()) return json({ error: 'Enter your full name.' }, 400);
  if (!password || password.length < 10) return json({ error: 'Use a password of at least 10 characters.' }, 400);

  const db = adminClient();
  const { data: invites, error: peekError } = await db.rpc('peek_admin_invite', { p_token: token });
  const invite = Array.isArray(invites) ? invites[0] : null;
  if (peekError || !invite) return json({ error: 'This invite link is invalid, used or expired. Ask for a new one.' }, 400);

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName.trim() },
  });
  if (createError || !created.user) {
    return json({ error: createError?.message?.includes('already') ? 'An account with this email already exists.' : 'Could not create the account.' }, 400);
  }

  const { error: claimError } = await db.rpc('claim_admin_invite', { p_token: token, p_user_id: created.user.id });
  if (claimError) {
    // Don't leave a half-made account behind if the invite was used meanwhile.
    await db.auth.admin.deleteUser(created.user.id);
    return json({ error: 'This invite link is invalid, used or expired. Ask for a new one.' }, 400);
  }

  return json({ ok: true, email: invite.email });
});
