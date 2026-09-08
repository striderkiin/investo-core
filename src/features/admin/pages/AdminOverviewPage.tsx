import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createFinancialService } from '../../../services/api/financialService';
import type { FinancialOverview } from '../../../services/api/financialService';
import { MetricCard } from '../../../components/common/MetricCard';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { usePermission } from '../../../hooks/usePermission';

const financialService = createFinancialService();

export function AdminOverviewPage() {
  const { can } = usePermission();
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setOverview(await financialService.getOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (can('treasury.read')) void load();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Platform Overview</h2>

      {can('treasury.read') && (
        <>
          {isLoading ? (
            <LoadingScreen label="Loading platform metrics..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : overview ? (
            <div className="row g-3">
              <div className="col-6 col-lg-3">
                <MetricCard label="Total User Balances" value={overview.totalUserBalances} icon="bi-people" variant="primary" />
              </div>
              <div className="col-6 col-lg-3">
                <MetricCard label="Total Invested" value={overview.totalInvested} icon="bi-graph-up" variant="primary" />
              </div>
              <div className="col-6 col-lg-3">
                <MetricCard label="Total Deposits" value={overview.totalDeposits} icon="bi-arrow-down-circle" variant="success" />
              </div>
              <div className="col-6 col-lg-3">
                <MetricCard label="Total Withdrawals" value={overview.totalWithdrawals} icon="bi-arrow-up-circle" variant="warning" />
              </div>
              <div className="col-6 col-lg-3">
                <MetricCard label="Pending Withdrawals" value={overview.pendingWithdrawals} icon="bi-hourglass-split" variant="warning" />
              </div>
              <div className="col-6 col-lg-3">
                <MetricCard label="Treasury Balance" value={overview.treasuryBalance} icon="bi-safe" variant="primary" />
              </div>
              <div className="col-6 col-lg-3">
                <MetricCard label="Platform Revenue" value={overview.platformRevenue} icon="bi-cash-stack" variant="success" />
              </div>
              <div className="col-6 col-lg-3">
                <MetricCard label="Available Platform Funds" value={overview.availablePlatformFunds} icon="bi-bank2" variant="secondary" />
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Market Controls</h3>
              <p className="text-secondary small">Manage the live market simulation and manual chart controls.</p>
              <Link to="/admin/market" className="btn btn-sm btn-primary">
                Open Market Controls
              </Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Users</h3>
              <p className="text-secondary small">View, edit, and manage user accounts and balances.</p>
              <Link to="/admin/users" className="btn btn-sm btn-primary">
                Open Users
              </Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Withdrawal Queue</h3>
              <p className="text-secondary small">Review and process pending withdrawal requests.</p>
              <Link to="/admin/withdrawals" className="btn btn-sm btn-primary">
                Open Withdrawals
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
