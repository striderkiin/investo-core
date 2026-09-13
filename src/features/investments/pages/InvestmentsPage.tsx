import { useEffect } from 'react';

/**
 * The real investment plans browser (with its own Invest modal) lives at
 * client-app/crypto.html (styled to match the rest of the client
 * dashboard) rather than here — this route exists only so every existing
 * link to /dashboard/investments keeps working.
 */
export function InvestmentsPage() {
  useEffect(() => {
    window.location.replace('/client-app/crypto.html');
  }, []);

  return null;
}
