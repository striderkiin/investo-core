import { useState } from 'react';
import { useMarketProvider } from '../../market/useMarketProvider';
import { MarketChart } from '../../../components/charts/MarketChart';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { useToast } from '../../../hooks/useToast';
import { usePermission } from '../../../hooks/usePermission';
import type { MarketCapabilityKey, MarketProviderHistoryPoint } from '../../../types/database';

const FIXED_PRESETS = [1, 10, 100, 500, 1000];
const PERCENTAGE_PRESETS = [0.1, 0.5, 1, 5];

type AdjustmentTab = 'fixed' | 'percentage' | 'direct';

const CAPABILITY_TOGGLES: { key: MarketCapabilityKey; label: string }[] = [
  { key: 'manualIncreaseEnabled', label: 'Manual Increase Controls' },
  { key: 'manualDecreaseEnabled', label: 'Manual Decrease Controls' },
  { key: 'directValueEntryEnabled', label: 'Direct Value Entry' },
  { key: 'percentageAdjustmentEnabled', label: 'Percentage Adjustment' },
];

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Adapts provider history points into the shape MarketChart already knows how to render. */
function toChartPoints(points: MarketProviderHistoryPoint[]) {
  return points.map((p) => ({ id: p.id, value: p.value, percentageChange: 0, trend: 'stable' as const, isManual: p.isManual, recordedAt: p.recordedAt }));
}

export function MarketOverridePanel() {
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const canManage = can('market.manage');
  const { assets, selectedAssetId, selectAsset, state, history, overrideHistory, isLoading, error, refresh, marketProviderService } = useMarketProvider();

  const [tab, setTab] = useState<AdjustmentTab>('fixed');
  const [fixedAmount, setFixedAmount] = useState(100);
  const [customFixedAmount, setCustomFixedAmount] = useState('');
  const [percentAmount, setPercentAmount] = useState(1);
  const [customPercentAmount, setCustomPercentAmount] = useState('');
  const [directValue, setDirectValue] = useState('');
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    if (!canManage) return;
    try {
      await action();
      if (successMessage) showSuccess(successMessage);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Action failed');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading live provider data..." />;
  if (error || !state || !marketProviderService) return <ErrorState message={error ?? 'Live Provider Temporarily Unavailable'} onRetry={refresh} />;

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const hasOverride = state.manualOffset !== 0;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Live Provider &amp; Manual Override</h2>
        <div className="btn-group" role="group" aria-label="Select asset">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={`btn btn-sm ${asset.id === selectedAssetId ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => selectAsset(asset.id)}
            >
              {asset.symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">{history.length === 0 ? <p className="text-secondary mb-0">No provider history yet.</p> : <MarketChart data={toChartPoints(history)} height={240} />}</div>
      </div>

      <div className="row g-3">
        <div className="col-6 col-md-3">
          <div className="card ic-card h-100">
            <div className="card-body py-2">
              <div className="text-secondary small">Effective Price</div>
              <div className="ic-metric-value fs-4">{formatMoney(state.effectivePrice)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card ic-card h-100">
            <div className="card-body py-2">
              <div className="text-secondary small">Live Provider Price</div>
              <div className="fs-5">{formatMoney(state.providerPrice)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card ic-card h-100">
            <div className="card-body py-2">
              <div className="text-secondary small">Manual Offset</div>
              <div className={`fs-5 ${state.manualOffset > 0 ? 'text-success' : state.manualOffset < 0 ? 'text-danger' : ''}`}>
                {state.manualOffset >= 0 ? '+' : ''}
                {formatMoney(state.manualOffset)}
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card ic-card h-100">
            <div className="card-body py-2">
              <div className="text-secondary small">Status</div>
              <div className="fs-6">
                <span className={`badge text-bg-${hasOverride ? 'warning' : 'success'}`}>
                  {hasOverride ? '● Manual Override Active' : '● Live Provider'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <ul className="nav nav-tabs mb-3">
            {(['fixed', 'percentage', 'direct'] as AdjustmentTab[]).map((t) => (
              <li className="nav-item" key={t}>
                <button type="button" className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'fixed' ? 'Fixed Amount' : t === 'percentage' ? 'Percentage' : 'Direct Entry'}
                </button>
              </li>
            ))}
          </ul>

          {tab === 'fixed' && (
            <div>
              <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
                {FIXED_PRESETS.map((step) => (
                  <button key={step} type="button" className={`btn btn-sm ${fixedAmount === step ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFixedAmount(step)}>
                    ${step}
                  </button>
                ))}
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 120 }}
                  placeholder="Custom $"
                  value={customFixedAmount}
                  onChange={(e) => {
                    setCustomFixedAmount(e.target.value);
                    const n = Number(e.target.value);
                    if (n > 0) setFixedAmount(n);
                  }}
                />
              </div>
              <div className="d-flex align-items-center justify-content-center gap-4 py-2">
                <button
                  type="button"
                  className="btn btn-outline-danger ic-arrow-btn"
                  aria-label="Decrease effective price"
                  disabled={!canManage || !state.manualDecreaseEnabled || fixedAmount <= 0}
                  onClick={() => run(() => marketProviderService.applyFixedAdjustment(state.assetId, 'decrease', fixedAmount).then(refresh))}
                >
                  <i className="bi bi-caret-down-fill" aria-hidden="true" />
                </button>
                <div className="text-center" style={{ minWidth: 160 }}>
                  <div className="ic-metric-value fs-3">{formatMoney(state.effectivePrice)}</div>
                  <div className="text-secondary small">Step: ${fixedAmount.toLocaleString()}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-success ic-arrow-btn"
                  aria-label="Increase effective price"
                  disabled={!canManage || !state.manualIncreaseEnabled || fixedAmount <= 0}
                  onClick={() => run(() => marketProviderService.applyFixedAdjustment(state.assetId, 'increase', fixedAmount).then(refresh))}
                >
                  <i className="bi bi-caret-up-fill" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {tab === 'percentage' && (
            <div>
              <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
                {PERCENTAGE_PRESETS.map((step) => (
                  <button key={step} type="button" className={`btn btn-sm ${percentAmount === step ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPercentAmount(step)}>
                    {step}%
                  </button>
                ))}
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 120 }}
                  placeholder="Custom %"
                  value={customPercentAmount}
                  onChange={(e) => {
                    setCustomPercentAmount(e.target.value);
                    const n = Number(e.target.value);
                    if (n > 0) setPercentAmount(n);
                  }}
                />
              </div>
              <div className="d-flex align-items-center justify-content-center gap-4 py-2">
                <button
                  type="button"
                  className="btn btn-outline-danger ic-arrow-btn"
                  aria-label="Decrease by percentage"
                  disabled={!canManage || !state.percentageAdjustmentEnabled || percentAmount <= 0}
                  onClick={() => run(() => marketProviderService.applyPercentageAdjustment(state.assetId, 'decrease', percentAmount).then(refresh))}
                >
                  <i className="bi bi-caret-down-fill" aria-hidden="true" />
                </button>
                <div className="text-center" style={{ minWidth: 160 }}>
                  <div className="ic-metric-value fs-3">{formatMoney(state.effectivePrice)}</div>
                  <div className="text-secondary small">{percentAmount}% of effective price</div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-success ic-arrow-btn"
                  aria-label="Increase by percentage"
                  disabled={!canManage || !state.percentageAdjustmentEnabled || percentAmount <= 0}
                  onClick={() => run(() => marketProviderService.applyPercentageAdjustment(state.assetId, 'increase', percentAmount).then(refresh))}
                >
                  <i className="bi bi-caret-up-fill" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {tab === 'direct' && (
            <form
              className="d-flex gap-2 justify-content-center align-items-end"
              onSubmit={(e) => {
                e.preventDefault();
                const target = Number(directValue);
                if (target >= 0) run(() => marketProviderService.setDirectPrice(state.assetId, target).then(refresh), `Effective price set to ${formatMoney(target)}.`);
              }}
            >
              <div>
                <label htmlFor="directValue" className="form-label small">
                  Set Effective Price
                </label>
                <input
                  id="directValue"
                  type="number"
                  className="form-control"
                  placeholder={state.effectivePrice.toString()}
                  value={directValue}
                  onChange={(e) => setDirectValue(e.target.value)}
                  disabled={!canManage || !state.directValueEntryEnabled}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!canManage || !state.directValueEntryEnabled || directValue === ''}>
                Apply
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={!canManage}
              onClick={() => run(() => marketProviderService.undoLastOverride(state.assetId).then(refresh), 'Last override undone.')}
            >
              Undo Last
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              disabled={!canManage}
              onClick={() => run(() => marketProviderService.resetToProvider(state.assetId).then(refresh), 'Reset to live provider price.')}
            >
              Reset To Live Price
            </button>
          </div>
          {!confirmResetAll ? (
            <button type="button" className="btn btn-sm btn-outline-danger" disabled={!canManage} onClick={() => setConfirmResetAll(true)}>
              Reset All Market Overrides
            </button>
          ) : (
            <div className="d-flex gap-2 align-items-center">
              <span className="small text-secondary">Clear overrides for every asset?</span>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() =>
                  run(() => marketProviderService.resetAllOverrides().then(refresh), 'All market overrides reset.').finally(() => setConfirmResetAll(false))
                }
              >
                Confirm
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmResetAll(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="row g-2">
        {CAPABILITY_TOGGLES.map((toggle) => (
          <div className="col-6 col-lg-3" key={toggle.key}>
            <div className="card ic-card h-100">
              <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                <span className="small">{toggle.label}</span>
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    aria-label={`Toggle ${toggle.label}`}
                    checked={state[toggle.key]}
                    disabled={!canManage}
                    onChange={(e) => run(() => marketProviderService.setCapabilityToggle(state.assetId, toggle.key, e.target.checked).then(refresh))}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6">Override History{selectedAsset ? ` — ${selectedAsset.symbol}` : ''}</h3>
          {overrideHistory.length === 0 ? (
            <p className="text-secondary small mb-0">No overrides recorded yet.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {overrideHistory.map((entry) => (
                <li key={entry.id} className={`list-group-item d-flex justify-content-between align-items-center ${entry.undone ? 'text-decoration-line-through text-secondary' : ''}`}>
                  <span className="small text-capitalize">
                    {entry.adjustmentType.replace('_', ' ')} {entry.direction !== 'set' ? entry.direction : ''}
                    {entry.inputValue !== null ? ` (${entry.inputValue})` : ''}
                  </span>
                  <span className="small">
                    {formatMoney(entry.previousEffectivePrice)} → {formatMoney(entry.newEffectivePrice)}
                  </span>
                  <span className="small text-secondary">{new Date(entry.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
