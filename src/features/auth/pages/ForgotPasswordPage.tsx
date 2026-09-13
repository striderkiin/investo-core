import { useEffect } from 'react';

/**
 * The real forgot-password page lives at client-app/forgot-password.html
 * (styled to match the rest of the client dashboard) rather than here —
 * this route exists only so every existing link to /forgot-password keeps
 * working.
 */
export function ForgotPasswordPage() {
  useEffect(() => {
    window.location.replace(`/client-app/forgot-password.html${window.location.search}`);
  }, []);

  return null;
}
