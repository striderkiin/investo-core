import { useEffect } from 'react';

/**
 * The real reset-password page lives at client-app/reset-password.html
 * (styled to match the rest of the client dashboard) rather than here —
 * this route exists only so a password-reset email sent before this page
 * moved still lands somewhere real. The recovery token Supabase appends
 * lives in the URL hash, so it has to be forwarded along with the redirect.
 */
export function ResetPasswordPage() {
  useEffect(() => {
    window.location.replace(`/client-app/reset-password.html${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
