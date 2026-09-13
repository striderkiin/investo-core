import { useEffect } from 'react';

/**
 * The real sign-in page lives at client-app/sign-in.html (the actual Critso
 * template page, wired to real auth) rather than here — this route exists
 * only so every existing `<Link to="/login">` across the app keeps working.
 */
export function LoginPage() {
  useEffect(() => {
    window.location.replace(`/client-app/sign-in.html${window.location.search}`);
  }, []);

  return null;
}
