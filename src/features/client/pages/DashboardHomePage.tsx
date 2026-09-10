import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { createFinancialService } from '../../../services/api/financialService';
import type { PortfolioSummary } from '../../../services/api/financialService';
import { CritsoStatTile } from '../../../components/common/CritsoStatTile';
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
  const isUp = percentageChange >= 0;

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="h4 mb-1">Welcome back, {profile?.fullName || profile?.email}</h2>
        <p className="text-secondary mb-0">Here&apos;s an overview of your portfolio.</p>
      </div>

      <div className="row g-3">
        <div className="col-6 col-lg-4 col-xl-2">
          <CritsoStatTile label="Total Balance" value={summary.totalBalance} icon="bi-wallet2" highlight />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <CritsoStatTile label="Available Balance" value={summary.availableBalance} icon="bi-cash-coin" />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <CritsoStatTile label="Total Invested" value={summary.totalInvested} icon="bi-graph-up" />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <CritsoStatTile
            label="Today's Change"
            value={percentageChange}
            icon={isUp ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}
            prefix=""
            suffix="%"
            decimals={2}
          />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <CritsoStatTile label="Total Earnings" value={summary.totalEarnings} icon="bi-trophy" />
        </div>
        <div className="col-6 col-lg-4 col-xl-2">
          <CritsoStatTile label="Pending Withdrawals" value={summary.pendingWithdrawals} icon="bi-hourglass-split" />
        </div>
      </div>

      <div className="wg-box style-1">
        <div className="title mb-3">
          <div className="label-01">Live Market</div>
          {settings && (
            <ul className="widget-menu-tab mb-0">
              <li className="item-title">
                <span className="inner">
                  <i className="bi bi-broadcast me-1" aria-hidden="true" />
                  {settings.mode === 'manual' ? 'Manual' : 'Live'}
                </span>
              </li>
              <li className="item-title active">
                <span className="inner text-capitalize">{settings.currentTrend}</span>
              </li>
            </ul>
          )}
        </div>
        {settings && (
          <div className="d-flex align-items-center flex-wrap mb-3" style={{ gap: '1.5rem' }}>
            <div>
              <span className="fs-4 fw-bold">${settings.currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="block-legend">
              <div className="dot" style={{ background: isUp ? 'var(--ic-success)' : 'var(--ic-danger)' }} />
              <div className="f12-medium">
                <span className="text-secondary">24h change</span>{' '}
                <span className="f12-bold">
                  {isUp ? '+' : ''}
                  {percentageChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
        {marketLoading ? (
          <LoadingScreen label="Loading market data..." />
        ) : history.length === 0 ? (
          <p className="text-secondary mb-0">No market history yet.</p>
        ) : (
          <MarketChart data={history} />
        )}
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="wg-box h-100">
            <div className="title mb-2">
              <div className="label-01">Investments</div>
            </div>
            <p className="text-secondary small">Review your active, completed, and paused investments.</p>
            <Link to="/dashboard/investments" className="btn btn-sm btn-primary">
              View Investments
            </Link>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="wg-box h-100">
            <div className="title mb-2">
              <div className="label-01">Referral Program</div>
            </div>
            <p className="text-secondary small">Share your referral link and earn rewards.</p>
            <Link to="/dashboard/referral" className="btn btn-sm btn-outline-primary">
              View Referral
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
