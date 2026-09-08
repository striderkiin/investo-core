import { useEffect, useState } from 'react';
import { createDepositService } from '../../../services/api/depositService';
import type { Deposit, DepositStatus } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const depositService = createDepositService();

const STATUS_VARIANT: Record<DepositStatus, string> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
  rejected: 'danger',
};

const FILTERS: { label: string; value: DepositStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Rejected', value: 'rejected' },
];

export function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState<DepositStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setDeposits(await depositService.listAll(filter === 'all' ? undefined : filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deposits');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Deposit Center</h2>

      <div className="d-flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`btn btn-sm ${filter === f.value ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingScreen label="Loading deposits..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : deposits.length === 0 ? (
        <EmptyState icon="bi-arrow-down-circle" title="No deposits" message="Nothing to show for this filter." />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">User ID</th>
                <th scope="col">Amount</th>
                <th scope="col">Network</th>
                <th scope="col">Provider</th>
                <th scope="col">Reference</th>
                <th scope="col">Status</th>
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
                  <td>{deposit.network}</td>
                  <td className="text-capitalize">{deposit.provider}</td>
                  <td className="text-secondary small">{deposit.providerReference}</td>
                  <td>
                    <span className={`badge text-bg-${STATUS_VARIANT[deposit.status]} text-capitalize`}>{deposit.status}</span>
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
