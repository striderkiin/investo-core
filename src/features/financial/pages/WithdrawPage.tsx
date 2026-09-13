import { useEffect } from 'react';

/**
 * The real withdraw page lives at client-app/withdraw.html (styled to match
 * the rest of the client dashboard) rather than here — this route exists
 * only so every existing link to /dashboard/withdraw keeps working.
 */
export function WithdrawPage() {
  useEffect(() => {
    window.location.replace('/client-app/withdraw.html');
  }, []);

  return null;
}
