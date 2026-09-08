import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { usePermission } from '../../../hooks/usePermission';
import { useMarketData } from '../../../features/market/useMarketData';
import { MarketChart } from '../../../components/charts/MarketChart';
import { MarketArrowControl } from '../../../components/controls/MarketArrowControl';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import type { MarketControlKey } from '../../../features/market/marketEngine';
import type { AutomaticMarketBehavior, MarketTrend, MarketVolatility } from '../../../types/database';

const VALUE_STEP_PRESETS = [1, 5, 10, 50, 100, 500, 1000];
const PERCENTAGE_STEP_PRESETS = [0.01, 0.1, 0.5, 1];

const TOGGLES: { key: MarketControlKey; label: string }[] = [
  { key: 'marketValueControlEnabled', label: 'Market Value' },
  { key: 'percentageControlEnabled', label: 'Percentage Change' },
  { key: 'trendControlEnabled', label: 'Trend Direction' },
  { key: 'volatilityControlEnabled', label: 'Volatility' },
  { key: 'movementControlEnabled', label: 'Chart Movement' },
];

export function MarketControlsPage() {
  const { profile } = useAuth();
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const { settings, history, isLoading, error, marketService, refresh } = useMarketData();
  const [customValueStep, setCustomValueStep] = useState('');
  const [customPercentageStep, setCustomPercentageStep] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<Awaited<ReturnType<NonNullable<typeof marketService>['listPresets']>>>([]);
  const canManage = can('market.manage');

  useEffect(() => {
    marketService?.listPresets().then(setPresets).catch(() => undefined);
  }, [marketService]);

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    if (!canManage) return;
    try {
      await action();
      if (successMessage) showSuccess(successMessage);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Action failed');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading market controls..." />;
  if (error || !settings || !marketService || !profile) return <ErrorState message={error ?? 'Unable to load market controls'} onRetry={refresh} />;

  const adminId = profile.id;
  const manualOn = settings.manualControlEnabled;

  async function handleSavePreset(event: FormEvent) {
    event.preventDefault();
    if (!presetName.trim() || !marketService || !settings) return;
    await run(async () => {
      await marketService.savePreset(presetName.trim(), {
        mode: settings.mode,
        automaticBehavior: settings.automaticBehavior,
        manualControlEnabled: settings.manualControlEnabled,
        marketValueControlEnabled: settings.marketValueControlEnabled,
        percentageControlEnabled: settings.percentageControlEnabled,
        trendControlEnabled: settings.trendControlEnabled,
        volatilityControlEnabled: settings.volatilityControlEnabled,
        movementControlEnabled: settings.movementControlEnabled,
        marketValueStep: settings.marketValueStep,
        percentageStep: settings.percentageStep,
        currentTrend: settings.currentTrend,
        currentVolatility: settings.currentVolatility,
        movementStrength: settings.movementStrength,
      }, adminId);
      setPresetName('');
      setPresets(await marketService.listPresets());
    }, 'Preset saved.');
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Live Market Control Panel</h2>
        <span className={`badge text-bg-${settings.mode === 'manual' ? 'warning' : 'success'} text-capitalize`}>
          {settings.mode === 'manual' ? 'Manual Control Active' : 'Automatic'}
        </span>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          {history.length === 0 ? <p className="text-secondary mb-0">No market history yet.</p> : <MarketChart data={history} height={280} />}
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h3 className="h6 mb-1">Manual Live Chart Control</h3>
            <p className="text-secondary small mb-0">Master switch. When OFF, the chart follows automatic market behavior.</p>
          </div>
          <div className="form-check form-switch fs-5 mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="manualMaster"
              checked={manualOn}
              disabled={!canManage}
              onChange={(e) =>
                run(
                  () => (e.target.checked ? marketService.enableManualControl(adminId) : marketService.returnToAutomatic(adminId)),
                  e.target.checked ? 'Manual control enabled.' : 'Returned to automatic.'
                )
              }
            />
            <label className="form-check-label" htmlFor="manualMaster">
              {manualOn ? 'ON' : 'OFF'}
            </label>
          </div>
        </div>
      </div>

      <div className="row g-2">
        {TOGGLES.map((toggle) => (
          <div className="col-6 col-lg" key={toggle.key}>
            <div className="card ic-card h-100">
              <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                <span className="small">{toggle.label}</span>
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    aria-label={`Toggle ${toggle.label} manual control`}
                    checked={settings[toggle.key]}
                    disabled={!canManage || !manualOn}
                    onChange={(e) => run(() => marketService.setControlToggle(toggle.key, e.target.checked, adminId))}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Market Value</h3>
              <MarketArrowControl
                label="Current Market Value"
                value={`$${settings.currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                disabled={!canManage || !manualOn || !settings.marketValueControlEnabled}
                onIncrease={() => run(() => marketService.increaseMarketValue(adminId))}
                onDecrease={() => run(() => marketService.decreaseMarketValue(adminId))}
              />
              <div className="d-flex flex-wrap gap-2 justify-content-center mb-2">
                {VALUE_STEP_PRESETS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={`btn btn-sm ${settings.marketValueStep === step ? 'btn-primary' : 'btn-outline-secondary'}`}
                    disabled={!canManage}
                    onClick={() => run(() => marketService.setMarketValueStep(step, adminId))}
                  >
                    ${step}
                  </button>
                ))}
              </div>
              <form
                className="d-flex gap-2 justify-content-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = Number(customValueStep);
                  if (value > 0) run(() => marketService.setMarketValueStep(value, adminId));
                }}
              >
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 140 }}
                  placeholder="Custom step ($)"
                  value={customValueStep}
                  onChange={(e) => setCustomValueStep(e.target.value)}
                  disabled={!canManage}
                />
                <button type="submit" className="btn btn-sm btn-outline-primary" disabled={!canManage}>
                  Set
                </button>
              </form>
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary d-block mx-auto mt-2"
                disabled={!canManage}
                onClick={() => run(() => marketService.resetCurrentMetric('marketValueControlEnabled', adminId))}
              >
                Reset This Metric
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Percentage Change</h3>
              <MarketArrowControl
                label="24 Hour Change"
                value={`${settings.currentPercentageChange >= 0 ? '+' : ''}${settings.currentPercentageChange.toFixed(2)}%`}
                disabled={!canManage || !manualOn || !settings.percentageControlEnabled}
                onIncrease={() => run(() => marketService.increasePercentage(adminId))}
                onDecrease={() => run(() => marketService.decreasePercentage(adminId))}
              />
              <div className="d-flex flex-wrap gap-2 justify-content-center mb-2">
                {PERCENTAGE_STEP_PRESETS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={`btn btn-sm ${settings.percentageStep === step ? 'btn-primary' : 'btn-outline-secondary'}`}
                    disabled={!canManage}
                    onClick={() => run(() => marketService.setPercentageStep(step, adminId))}
                  >
                    {step}%
                  </button>
                ))}
              </div>
              <form
                className="d-flex gap-2 justify-content-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = Number(customPercentageStep);
                  if (value > 0) run(() => marketService.setPercentageStep(value, adminId));
                }}
              >
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 140 }}
                  placeholder="Custom step (%)"
                  value={customPercentageStep}
                  onChange={(e) => setCustomPercentageStep(e.target.value)}
                  disabled={!canManage}
                />
                <button type="submit" className="btn btn-sm btn-outline-primary" disabled={!canManage}>
                  Set
                </button>
              </form>
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary d-block mx-auto mt-2"
                disabled={!canManage}
                onClick={() => run(() => marketService.resetCurrentMetric('percentageControlEnabled', adminId))}
              >
                Reset This Metric
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Trend Direction</h3>
              <div className="btn-group w-100" role="group" aria-label="Trend direction">
                {(['bullish', 'stable', 'bearish'] as MarketTrend[]).map((trend) => (
                  <button
                    key={trend}
                    type="button"
                    className={`btn btn-sm ${settings.currentTrend === trend ? 'btn-primary' : 'btn-outline-secondary'}`}
                    disabled={!canManage || !manualOn || !settings.trendControlEnabled}
                    onClick={() => run(() => marketService.setTrend(trend, adminId))}
                  >
                    {trend === 'bullish' ? '▲ Bullish' : trend === 'bearish' ? '▼ Bearish' : '━ Stable'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary d-block mx-auto mt-2"
                disabled={!canManage}
                onClick={() => run(() => marketService.resetCurrentMetric('trendControlEnabled', adminId))}
              >
                Reset This Metric
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Volatility</h3>
              <div className="btn-group w-100 flex-wrap" role="group" aria-label="Volatility">
                {(['low', 'medium', 'high', 'extreme'] as MarketVolatility[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`btn btn-sm text-capitalize ${settings.currentVolatility === level ? 'btn-primary' : 'btn-outline-secondary'}`}
                    disabled={!canManage || !manualOn || !settings.volatilityControlEnabled}
                    onClick={() => run(() => marketService.setVolatility(level, adminId))}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary d-block mx-auto mt-2"
                disabled={!canManage}
                onClick={() => run(() => marketService.resetCurrentMetric('volatilityControlEnabled', adminId))}
              >
                Reset This Metric
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Chart Movement Strength</h3>
              <input
                type="range"
                className="form-range"
                min={1}
                max={5}
                value={settings.movementStrength}
                disabled={!canManage || !manualOn || !settings.movementControlEnabled}
                onChange={(e) => run(() => marketService.setMovementStrength(Number(e.target.value), adminId))}
                aria-label="Movement strength"
              />
              <p className="text-center small text-secondary mb-0">
                {['Very Low', 'Low', 'Medium', 'High', 'Extreme'][settings.movementStrength - 1] ?? 'Medium'}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary d-block mx-auto mt-2"
                disabled={!canManage}
                onClick={() => run(() => marketService.resetCurrentMetric('movementControlEnabled', adminId))}
              >
                Reset This Metric
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="previewMode"
              checked={settings.previewMode}
              disabled={!canManage}
              onChange={(e) => run(() => marketService.setPreviewMode(e.target.checked, adminId))}
            />
            <label className="form-check-label" htmlFor="previewMode">
              Preview Only (changes stay inside Admin until turned off)
            </label>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              disabled={!canManage}
              onClick={() => run(() => marketService.resetAllManualControls(adminId), 'All manual controls reset.')}
            >
              Reset All Manual Controls
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              disabled={!canManage}
              onClick={() => run(() => marketService.returnToAutomatic(adminId), 'Returned to automatic.')}
            >
              Return To Automatic
            </button>
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6">Market Control Presets</h3>
          <form onSubmit={handleSavePreset} className="d-flex gap-2 mb-3">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Preset name (e.g. Demo Growth)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              disabled={!canManage}
            />
            <button type="submit" className="btn btn-sm btn-primary" disabled={!canManage || !presetName.trim()}>
              Save Current as Preset
            </button>
          </form>
          {presets.length === 0 ? (
            <p className="text-secondary small mb-0">No presets saved yet.</p>
          ) : (
            <ul className="list-group">
              {presets.map((preset) => (
                <li key={preset.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{preset.name}</span>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={!canManage}
                      onClick={() => run(() => marketService.applyPreset(preset, adminId), `Applied preset "${preset.name}".`)}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={!canManage}
                      onClick={() =>
                        run(async () => {
                          await marketService.deletePreset(preset.id);
                          setPresets(await marketService.listPresets());
                        }, 'Preset deleted.')
                      }
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6">Automatic Market Engine</h3>
          <p className="text-secondary small">Configures behavior while Manual Control is OFF.</p>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label htmlFor="behavior" className="form-label small">
                Behavior
              </label>
              <select
                id="behavior"
                className="form-select form-select-sm"
                value={settings.automaticBehavior}
                disabled={!canManage}
                onChange={(e) => run(() => marketService.setAutomaticBehavior(e.target.value as AutomaticMarketBehavior, adminId))}
              >
                {(['stable', 'upward', 'downward', 'volatile', 'random'] as AutomaticMarketBehavior[]).map((b) => (
                  <option key={b} value={b} className="text-capitalize">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
