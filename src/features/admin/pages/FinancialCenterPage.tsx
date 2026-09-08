import { useEffect, useState } from 'react';
import { createFinancialService } from '../../../services/api/financialService';
import type { FinancialOverview } from '../../../services/api/financialService';
import { createSettingsService } from '../../../services/api/settingsService';
import type { SystemSettings } from '../../../services/api/settingsService';
import { MetricCard } from '../../../components/common/MetricCard';
import { NumericStepper } from '../../../components/controls/NumericStepper';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { useToast } from '../../../hooks/useToast';

const financialService = createFinancialService();
const settingsService = createSettingsService();

export function FinancialCenterPage() {
  const { showSuccess, showError } = useToast();
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, settingsData] = await Promise.all([financialService.getOverview(), settingsService.get()]);
      setOverview(overviewData);
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial center');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(updates: Partial<SystemSettings>) {
    if (!settings) return;
    const next = { ...settings, ...updates };
    setSettings(next);
    setIsSaving(true);
    try {
      const saved = await settingsService.update(updates);
      setSettings(saved);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save setting');
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleYieldAction(action: 'pause' | 'resume' | 'zero' | 'restore') {
    try {
      if (action === 'pause') await persist({ yieldEnabled: false });
      else if (action === 'resume') await persist({ yieldEnabled: true });
      else if (action === 'zero') await persist({ defaultDailyRate: 0, defaultWeeklyRate: 0, defaultMonthlyRate: 0 });
      else await persist({ defaultDailyRate: 1, defaultWeeklyRate: 7, defaultMonthlyRate: 30 });
      showSuccess('Yield settings updated.');
    } catch {
      // error already surfaced by persist()
    }
  }

  if (isLoading) return <LoadingScreen label="Loading financial center..." />;
  if (error || !overview || !settings) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Financial Center</h2>

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
          <MetricCard label="Platform Revenue" value={overview.platformRevenue} icon="bi-cash-stack" variant="success" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Treasury Balance" value={overview.treasuryBalance} icon="bi-safe" variant="primary" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="User Liabilities" value={overview.userLiabilities} icon="bi-exclamation-diamond" variant="secondary" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Available Platform Funds" value={overview.availablePlatformFunds} icon="bi-bank2" variant="secondary" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h6 mb-0">Deposit Settings</h3>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="depositEnabled"
                    checked={settings.depositEnabled}
                    disabled={isSaving}
                    onChange={(e) => persist({ depositEnabled: e.target.checked })}
                  />
                  <label className="form-check-label small" htmlFor="depositEnabled">
                    Deposits {settings.depositEnabled ? 'Enabled' : 'Disabled'}
                  </label>
                </div>
              </div>
              <div className="d-flex flex-column gap-3">
                <NumericStepper label="Minimum Deposit" value={settings.depositMin} step={10} min={0} suffix="$" onChange={(v) => persist({ depositMin: v })} />
                <NumericStepper label="Maximum Deposit" value={settings.depositMax} step={1000} min={0} suffix="$" onChange={(v) => persist({ depositMax: v })} />
                <NumericStepper label="Deposit Fee" value={settings.depositFeePercent} step={0.1} min={0} max={100} suffix="%" onChange={(v) => persist({ depositFeePercent: v })} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h6 mb-0">Withdrawal Settings</h3>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="withdrawalEnabled"
                    checked={settings.withdrawalEnabled}
                    disabled={isSaving}
                    onChange={(e) => persist({ withdrawalEnabled: e.target.checked })}
                  />
                  <label className="form-check-label small" htmlFor="withdrawalEnabled">
                    Withdrawals {settings.withdrawalEnabled ? 'Enabled' : 'Disabled'}
                  </label>
                </div>
              </div>
              <div className="d-flex flex-column gap-3">
                <NumericStepper label="Minimum Withdrawal" value={settings.withdrawalMin} step={10} min={0} suffix="$" onChange={(v) => persist({ withdrawalMin: v })} />
                <NumericStepper label="Maximum Withdrawal" value={settings.withdrawalMax} step={1000} min={0} suffix="$" onChange={(v) => persist({ withdrawalMax: v })} />
                <NumericStepper label="Withdrawal Fee" value={settings.withdrawalFeePercent} step={0.1} min={0} max={100} suffix="%" onChange={(v) => persist({ withdrawalFeePercent: v })} />
                <NumericStepper label="Daily Limit" value={settings.withdrawalDailyLimit} step={500} min={0} suffix="$" onChange={(v) => persist({ withdrawalDailyLimit: v })} />
                <NumericStepper label="Processing Threshold" value={settings.withdrawalProcessingThreshold} step={100} min={0} suffix="$" onChange={(v) => persist({ withdrawalProcessingThreshold: v })} />
                <NumericStepper label="Automatic Processing Limit" value={settings.withdrawalAutoProcessLimit} step={50} min={0} suffix="$" onChange={(v) => persist({ withdrawalAutoProcessLimit: v })} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h3 className="h6 mb-0">Global Yield Control Center</h3>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="yieldEnabled"
                checked={settings.yieldEnabled}
                disabled={isSaving}
                onChange={(e) => persist({ yieldEnabled: e.target.checked })}
              />
              <label className="form-check-label small" htmlFor="yieldEnabled">
                Global Yield {settings.yieldEnabled ? 'Enabled' : 'Paused'}
              </label>
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <NumericStepper label="Default Daily Rate" value={settings.defaultDailyRate} step={0.1} min={0} suffix="%" onChange={(v) => persist({ defaultDailyRate: v })} />
            </div>
            <div className="col-12 col-md-4">
              <NumericStepper label="Default Weekly Rate" value={settings.defaultWeeklyRate} step={0.5} min={0} suffix="%" onChange={(v) => persist({ defaultWeeklyRate: v })} />
            </div>
            <div className="col-12 col-md-4">
              <NumericStepper label="Default Monthly Rate" value={settings.defaultMonthlyRate} step={1} min={0} suffix="%" onChange={(v) => persist({ defaultMonthlyRate: v })} />
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => handleYieldAction('pause')}>
              Pause All
            </button>
            <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleYieldAction('resume')}>
              Resume All
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleYieldAction('zero')}>
              Set All To Zero
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleYieldAction('restore')}>
              Restore Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
