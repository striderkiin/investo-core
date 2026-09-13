import { useEffect } from 'react';

/**
 * The real deposit page lives at client-app/deposit.html (styled to match
 * the rest of the client dashboard) rather than here — this route exists
 * only so every existing link to /dashboard/deposit keeps working.
 */
export function DepositPage() {
  useEffect(() => {
    window.location.replace('/client-app/deposit.html');
  }, []);

  return null;
}
