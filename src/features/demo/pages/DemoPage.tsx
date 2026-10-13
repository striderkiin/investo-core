import { useEffect, useState } from 'react';
import { IS_DEMO } from '../../../config/env';
import { getSupabaseClient } from '../../../services/supabase/client';
import { DEMO_RETURN_URL, startDemoSession } from '../../../shared/demoSession';

// A pass works once, so the sign-in must run once even when React runs effects twice.
let started = false;

type DemoResponse = { tokenHash?: string; role?: 'client' | 'admin'; expiresAt?: number; error?: string };

/**
 * Landing page for links from MojoX: trades the signed pass for a session as
 * the demo client or demo admin, then opens that side of the platform.
 */
export function DemoPage() {
  const [pass] = useState(() => new URLSearchParams(window.location.search).get('pass'));
  const [error, setError] = useState<string | null>(() =>
    IS_DEMO && pass ? null : 'This demo link is not valid.'
  );

  useEffect(() => {
    if (!IS_DEMO || !pass || started) return;
    started = true;

    (async () => {
      const supabase = getSupabaseClient();
      const { data, error: invokeError } = await supabase.functions.invoke<DemoResponse>('demo-session', {
        body: { pass },
      });
      if (invokeError || !data?.tokenHash || !data.expiresAt) {
        const body = (await (invokeError as { context?: Response } | null)?.context?.json?.().catch(() => null)) as DemoResponse | null;
        setError(body?.error ?? data?.error ?? 'Could not start the demo. Try again.');
        return;
      }

      // Drop any earlier session first so the demo starts clean.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: 'magiclink',
      });
      if (verifyError || !verified.user) {
        setError('Could not start the demo. Try again.');
        return;
      }

      startDemoSession(verified.user.id, data.expiresAt);
      window.location.replace(data.role === 'admin' ? '/admin' : '/client-app/index.html');
    })().catch(() => setError('Could not start the demo. Try again.'));
  }, [pass]);

  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center min-vh-100 p-4">
      {error ? (
        <>
          <h1 className="h4 mb-2">{error}</h1>
          <a className="btn btn-primary mt-3" href={DEMO_RETURN_URL}>
            Back to the demo page
          </a>
        </>
      ) : (
        <>
          <div className="spinner-border mb-3" role="status" aria-hidden="true" />
          <h1 className="h5">Opening the demo…</h1>
        </>
      )}
    </div>
  );
}
