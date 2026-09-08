import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { createFinancialService } from '../../../services/api/financialService';
import type { PortfolioSummary } from '../../../services/api/financialService';
import { MetricCard } from '../../../components/common/MetricCard';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { MarketChart } from '../../../components/charts/MarketChart';
import { useMarketData } from '../../../features/market/useMarketData';

export function DashboardHomePage() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings, history, isLoading: marketLoading } = useMarketData();

  async function load() {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const financialService = createFinancialService();
      const data = await financialService.getPortfolioSummary(profile.id);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your portfolio');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (isLoading) return <LoadingScreen label="Loading your portfolio..." />;
  if (error || !summary) return <ErrorState message={error ?? 'Unable to load portfolio'} onRetry={load} />;

  const percentageChange = settings?.currentPercentageChange ?? 0;
  const trendVariant = percentageChange >= 0 ? 'success' : 'danger';

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="h4 mb-1">Welcome back, {profile?.fullName || profile?.email}</h2>
        <p className="text-secondary mb-0">Here&apos;s an overview of your portfolio.</p>
      </div>

      <div className="row g-3">
        <div className="col-6 col-lg-4 col-xl-2">
          <MetricCard label="Total Balance" value={summary.totalBalance} icon="bi-wallet2" variant="primary" />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <MetricCard label="Available Balance" value={summary.availableBalance} icon="bi-cash-coin" variant="success" />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <MetricCard label="Total Invested" value={summary.totalInvested} icon="bi-graph-up" variant="primary" />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <MetricCard
            label="Today's Change"
            value={percentageChange}
            icon={percentageChange >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}
            prefix=""
            suffix="%"
            variant={trendVariant}
          />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <MetricCard label="Total Earnings" value={summary.totalEarnings} icon="bi-trophy" variant="success" />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <MetricCard label="Pending Withdrawals" value={summary.pendingWithdrawals} icon="bi-hourglass-split" variant="warning" />
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div>
              <h3 className="h6 mb-1">Live Market</h3>
              {settings && (
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="fs-4 fw-bold">
                    ${settings.currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`badge text-bg-${trendVariant}`}>
                    {percentageChange >= 0 ? '+' : ''}
                    {percentageChange.toFixed(2)}% (24h)
                  </span>
                  <span className="text-secondary small text-capitalize">
                    <i className="bi bi-signpost-2 me-1" aria-hidden="true" />
                    Trend: {settings.currentTrend}
                  </span>
                  <span className="text-secondary small">
                    <i className="bi bi-broadcast me-1" aria-hidden="true" />
                    Market Status: {settings.mode === 'manual' ? 'Manually Controlled' : 'Live'}
                  </span>
                </div>
              )}
            </div>
          </div>
          {marketLoading ? (
            <LoadingScreen label="Loading market data..." />
          ) : history.length === 0 ? (
            <p className="text-secondary mb-0">No market history yet.</p>
          ) : (
            <MarketChart data={history} />
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Investments</h3>
              <p className="text-secondary small">Review your active, completed, and paused investments.</p>
              <Link to="/dashboard/investments" className="btn btn-sm btn-primary">
                View Investments
              </Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Referral Program</h3>
              <p className="text-secondary small">Share your referral link and earn rewards.</p>
              <Link to="/dashboard/referral" className="btn btn-sm btn-outline-primary">
                View Referral
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
