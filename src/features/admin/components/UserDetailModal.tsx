import { useEffect, useState } from 'react';
import { Modal } from '../../../components/modals/Modal';
import { createTransactionService } from '../../../services/api/transactionService';
import type { Profile, Transaction } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { EmptyState } from '../../../components/common/EmptyState';

const transactionService = createTransactionService();

interface UserDetailModalProps {
  user: Profile;
  show: boolean;
  onClose: () => void;
}

export function UserDetailModal({ user, show, onClose }: UserDetailModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!show) return;
    setIsLoading(true);
    transactionService
      .list({ userId: user.id })
      .then(setTransactions)
      .finally(() => setIsLoading(false));
  }, [show, user.id]);

  const totalDeposited = transactions.filter((t) => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = transactions.filter((t) => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <Modal title={`${user.fullName || user.email} — Ledger`} show={show} onClose={onClose} size="lg">
      <div className="row g-3 mb-3 text-center">
        <div className="col-4">
          <p className="text-secondary small mb-0">Total Balance</p>
          <p className="fw-bold mb-0">${user.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="col-4">
          <p className="text-secondary small mb-0">Total Deposited</p>
          <p className="fw-bold mb-0">${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="col-4">
          <p className="text-secondary small mb-0">Total Withdrawn</p>
          <p className="fw-bold mb-0">${totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingScreen label="Loading ledger..." />
      ) : transactions.length === 0 ? (
        <EmptyState icon="bi-receipt" title="No transactions" />
      ) : (
        <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Amount</th>
                <th scope="col">Balance After</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td className="text-capitalize">{tx.type}</td>
                  <td className={tx.amount >= 0 ? 'text-success' : 'text-danger'}>{tx.amount.toFixed(2)}</td>
                  <td>{tx.balanceAfter.toFixed(2)}</td>
                  <td className="text-capitalize">{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
