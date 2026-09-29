import { getSupabaseClient } from '../../src/services/supabase/client';

/**
 * True when the signed-in user has a verified authenticator but this
 * session has only passed the password step (aal1). Such a session must
 * enter a code before seeing any account data.
 */
export async function needsMfaCode(): Promise<boolean> {
  const { data, error } = await getSupabaseClient().auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

/** Checks a 6-digit code against the user's verified authenticator, raising the session to aal2. */
export async function verifyMfaCode(code: string): Promise<void> {
  const client = getSupabaseClient();
  const { data: factors, error: listError } = await client.auth.mfa.listFactors();
  if (listError) throw listError;
  const factor = factors.totp[0];
  if (!factor) throw new Error('No authenticator is set up on this account.');
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await client.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
  if (verifyError) throw verifyError;
}
