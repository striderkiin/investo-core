import { useEffect, useState } from 'react';
import { createWithdrawalService } from '../../../services/api/withdrawalService';
import type { WithdrawalReviewAction } from '../../../services/api/withdrawalService';
import type { Withdrawal, WithdrawalStatus } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { useToast } from '../../../hooks/useToast';
import { usePermission } from '../../../hooks/usePermission';

const withdrawalService = createWithdrawalService();

const STATUS_VARIANT: Record<WithdrawalStatus, string> = {
  pending: 'warning',
  review: 'info',
  processing: 'info',
  completed: 'success',
  rejected: 'danger',
  failed: 'danger',
};

const FILTERS: { label: string; value: WithdrawalStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Review', value: 'review' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
];

const ACTION_LABEL: Record<WithdrawalReviewAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  hold: 'Hold',
  complete: 'Mark Completed',
};

export function AdminWithdrawalsPage() {
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<WithdrawalStatus | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canApprove = can('withdrawals.approve');

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setWithdrawals(await withdrawalService.listAll(filter === 'all' ? undefined : filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load withdrawals');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleAction(withdrawal: Withdrawal, action: WithdrawalReviewAction) {
    if ((action === 'reject' || action === 'complete') && !window.confirm(`${ACTION_LABEL[action]} this withdrawal of ${withdrawal.amount} ${withdrawal.currency}?`)) {
      return;
    }
    try {
      await withdrawalService.review(withdrawal.id, action);
      showSuccess(`Withdrawal ${action}d.`);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update withdrawal');
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Withdrawal Queue</h2>

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
        <LoadingScreen label="Loading withdrawals..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : withdrawals.length === 0 ? (
        <EmptyState icon="bi-arrow-up-circle" title="No withdrawals" message="Nothing to show for this filter." />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Requested</th>
                <th scope="col">User ID</th>
                <th scope="col">Amount</th>
                <th scope="col">Destination</th>
                <th scope="col">Status</th>
                {canApprove && (
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td>{new Date(withdrawal.createdAt).toLocaleString()}</td>
                  <td className="text-secondary small">{withdrawal.userId.slice(0, 8)}</td>
                  <td>
                    {withdrawal.amount} {withdrawal.currency}
                    <div className="text-secondary small">fee: {withdrawal.fee}</div>
                  </td>
                  <td className="text-truncate" style={{ maxWidth: 160 }}>
                    {withdrawal.destination}
                  </td>
                  <td>
                    <span className={`badge text-bg-${STATUS_VARIANT[withdrawal.status]} text-capitalize`}>{withdrawal.status}</span>
                  </td>
                  {canApprove && (
                    <td className="text-end">
                      {['pending', 'review'].includes(withdrawal.status) && (
                        <div className="d-flex gap-1 justify-content-end flex-wrap">
                          <button type="button" className="btn btn-sm btn-outline-info" onClick={() => handleAction(withdrawal, 'hold')}>
                            Hold
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleAction(withdrawal, 'approve')}>
                            Approve
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleAction(withdrawal, 'reject')}>
                            Reject
                          </button>
                        </div>
                      )}
                      {withdrawal.status === 'processing' && (
                        <button type="button" className="btn btn-sm btn-success" onClick={() => handleAction(withdrawal, 'complete')}>
                          Mark Completed
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
