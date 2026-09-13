import { useEffect } from 'react';

/**
 * The real sign-up page lives at client-app/sign-up.html (the actual Critso
 * template page, wired to real auth) rather than here — this route exists
 * only so every existing `<Link to="/register">` across the app keeps
 * working, including the `?ref=` referral links settings.ts generates.
 */
export function RegisterPage() {
  useEffect(() => {
    window.location.replace(`/client-app/sign-up.html${window.location.search}`);
  }, []);

  return null;
}
