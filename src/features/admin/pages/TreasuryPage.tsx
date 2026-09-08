import { useEffect, useState } from 'react';
import { createTreasuryService } from '../../../services/api/treasuryService';
import { createFinancialService } from '../../../services/api/financialService';
import type { FinancialOverview } from '../../../services/api/financialService';
import type { TreasuryAccount } from '../../../types/database';
import { MetricCard } from '../../../components/common/MetricCard';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { useToast } from '../../../hooks/useToast';
import { usePermission } from '../../../hooks/usePermission';
import { IS_PRODUCTION } from '../../../config/env';

const treasuryService = createTreasuryService();
const financialService = createFinancialService();

export function TreasuryPage() {
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('1000');
  const canManage = can('treasury.manage') && !IS_PRODUCTION;

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [accountsData, overviewData] = await Promise.all([treasuryService.list(), financialService.getOverview()]);
      setAccounts(accountsData);
      setOverview(overviewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load treasury');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAddFunds(accountId: string) {
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      showError('Enter a valid amount.');
      return;
    }
    try {
      await treasuryService.addDemoFunds(accountId, value);
      showSuccess('Demo funds added.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add funds');
    }
  }

  async function handleMoveToReserve(accountId: string) {
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      showError('Enter a valid amount.');
      return;
    }
    try {
      await treasuryService.moveToReserve(accountId, value);
      showSuccess('Moved to reserve.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to move funds to reserve');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading treasury..." />;
  if (error || !overview) return <ErrorState message={error ?? 'Unable to load treasury'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Treasury Management</h2>

      <div className="row g-3">
        <div className="col-6 col-lg-3">
          <MetricCard label="Total Platform Assets" value={overview.treasuryBalance} icon="bi-bank" variant="primary" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Total User Liabilities" value={overview.userLiabilities} icon="bi-people" variant="secondary" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Available Operating Balance" value={overview.availablePlatformFunds} icon="bi-cash-coin" variant="success" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Pending Withdrawals" value={overview.pendingWithdrawals} icon="bi-hourglass-split" variant="warning" />
        </div>
      </div>

      {!canManage && (
        <div className="alert alert-info" role="alert">
          <i className="bi bi-info-circle me-2" aria-hidden="true" />
          {IS_PRODUCTION
            ? 'Treasury simulation actions are disabled in Production — operations must go through the provider integration (Phase 7).'
            : 'You do not have permission to manage the treasury.'}
        </div>
      )}

      <div className="row g-3">
        {accounts.map((account) => (
          <div className="col-12 col-md-6" key={account.id}>
            <div className="card ic-card h-100">
              <div className="card-body">
                <h3 className="h6 text-capitalize">{account.name} Account</h3>
                <p className="mb-1">
                  Operating Balance: <strong>${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </p>
                <p className="mb-3">
                  Reserve Balance: <strong>${account.reserveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </p>
                {canManage && (
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ maxWidth: 140 }}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      aria-label="Amount"
                    />
                    <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleAddFunds(account.id)}>
                      Add Demo Funds
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleMoveToReserve(account.id)}>
                      Move To Reserve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
