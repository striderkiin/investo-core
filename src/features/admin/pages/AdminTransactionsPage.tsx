import { useEffect, useState } from 'react';
import { createTransactionService } from '../../../services/api/transactionService';
import type { Transaction, TransactionStatus, TransactionType } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const transactionService = createTransactionService();

const TYPE_FILTERS: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Deposit', value: 'deposit' },
  { label: 'Withdrawal', value: 'withdrawal' },
  { label: 'Investment', value: 'investment' },
  { label: 'Yield', value: 'yield' },
  { label: 'Bonus', value: 'bonus' },
  { label: 'Referral', value: 'referral' },
  { label: 'Adjustment', value: 'adjustment' },
];

const STATUS_FILTERS: { label: string; value: TransactionStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_VARIANT: Record<TransactionStatus, string> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
  rejected: 'danger',
};

export function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await transactionService.list({
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      });
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, search]);

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Transaction Center</h2>

      <div className="d-flex flex-wrap gap-2 align-items-center">
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: 260 }}
          placeholder="Search by reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search transactions by reference"
        />
        <select className="form-select" style={{ maxWidth: 180 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}>
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select className="form-select" style={{ maxWidth: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | 'all')}>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingScreen label="Loading transactions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : transactions.length === 0 ? (
        <EmptyState icon="bi-receipt" title="No transactions" message="Try adjusting your filters." />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">User ID</th>
                <th scope="col">Type</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="text-secondary small">{tx.userId.slice(0, 8)}</td>
                  <td className="text-capitalize">{tx.type}</td>
                  <td className={tx.amount >= 0 ? 'text-success' : 'text-danger'}>{tx.amount.toFixed(2)}</td>
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
