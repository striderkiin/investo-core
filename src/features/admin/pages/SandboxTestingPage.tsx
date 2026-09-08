import { useEffect, useState } from 'react';
import { createSandboxTestingService } from '../../../services/api/sandboxTestingService';
import type { Deposit } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { useToast } from '../../../hooks/useToast';
import { APP_ENVIRONMENT } from '../../../config/env';

const sandboxTestingService = createSandboxTestingService();

export function SandboxTestingPage() {
  const { showSuccess, showError } = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setDeposits(await sandboxTestingService.listPendingSandboxDeposits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sandbox deposits');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSimulate(deposit: Deposit) {
    setSimulatingId(deposit.id);
    try {
      await sandboxTestingService.simulateWebhook(deposit.id);
      showSuccess('Webhook simulated — deposit confirmed via HMAC-verified signature.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Webhook simulation failed. Is the Edge Function deployed and is a sandbox payment integration configured with a webhook secret?');
    } finally {
      setSimulatingId(null);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading sandbox deposits..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="h4 mb-1">Sandbox Testing</h2>
        <p className="text-secondary small mb-0">
          Exercises the real webhook path: <code>simulate-sandbox-webhook</code> signs a test payload server-side with the configured webhook secret
          and posts it through the same HMAC verification a real provider's webhook would go through. Requires the Edge Functions to be deployed
          (<code>supabase functions deploy</code>) and a Sandbox Payment integration configured with a webhook secret in Integrations.
        </p>
      </div>

      {APP_ENVIRONMENT !== 'sandbox' && (
        <div className="alert alert-info" role="alert">
          <i className="bi bi-info-circle me-2" aria-hidden="true" />
          Current environment is <strong>{APP_ENVIRONMENT}</strong>. Sandbox deposits can still be created and tested here regardless of the active
          environment badge.
        </div>
      )}

      {deposits.length === 0 ? (
        <EmptyState icon="bi-hdd-network" title="No pending sandbox deposits" message="Create one from the client Deposit page while VITE_APP_ENVIRONMENT=sandbox to test this flow." />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">User ID</th>
                <th scope="col">Amount</th>
                <th scope="col">Reference</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td>{new Date(deposit.createdAt).toLocaleString()}</td>
                  <td className="text-secondary small">{deposit.userId.slice(0, 8)}</td>
                  <td>
                    {deposit.amount} {deposit.currency}
                  </td>
                  <td className="text-secondary small">{deposit.providerReference}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={simulatingId === deposit.id}
                      onClick={() => handleSimulate(deposit)}
                    >
                      {simulatingId === deposit.id ? 'Simulating…' : 'Simulate Webhook'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
