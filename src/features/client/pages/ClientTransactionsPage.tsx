import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { createTransactionService } from '../../../services/api/transactionService';
import type { Transaction, TransactionType } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const transactionService = createTransactionService();

const FILTERS: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Deposits', value: 'deposit' },
  { label: 'Withdrawals', value: 'withdrawal' },
  { label: 'Investments', value: 'investment' },
  { label: 'Yield', value: 'yield' },
  { label: 'Bonus', value: 'bonus' },
  { label: 'Referral', value: 'referral' },
];

const STATUS_VARIANT: Record<Transaction['status'], string> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
  rejected: 'danger',
};

export function ClientTransactionsPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await transactionService.list({ userId: profile.id, type: filter === 'all' ? undefined : filter });
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, filter]);

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Transactions</h2>

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
        <LoadingScreen label="Loading transactions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : transactions.length === 0 ? (
        <EmptyState icon="bi-receipt" title="No transactions" message="Nothing to show for this filter yet." />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Amount</th>
                <th scope="col">Balance After</th>
                <th scope="col">Status</th>
                <th scope="col">Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="text-capitalize">{tx.type}</td>
                  <td className={tx.amount >= 0 ? 'text-success' : 'text-danger'}>
                    {tx.amount >= 0 ? '+' : ''}
                    {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td>${tx.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`badge text-bg-${STATUS_VARIANT[tx.status]} text-capitalize`}>{tx.status}</span>
                  </td>
                  <td className="text-secondary small">{tx.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
