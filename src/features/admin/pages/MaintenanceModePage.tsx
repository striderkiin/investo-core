import { useEffect, useState } from 'react';
import { createMaintenanceService } from '../../../services/api/maintenanceService';
import type { MaintenanceSettings } from '../../../services/api/maintenanceService';
import { useToast } from '../../../hooks/useToast';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';

const maintenanceService = createMaintenanceService();

const TOGGLES: { key: keyof MaintenanceSettings; label: string; description: string }[] = [
  { key: 'pauseYield', label: 'Pause Yield', description: 'Stop investment yield accrual while in maintenance.' },
  { key: 'disableWithdrawals', label: 'Disable Withdrawals', description: 'Block new withdrawal requests (enforced server-side).' },
  { key: 'disableDeposits', label: 'Disable Deposits', description: 'Block new deposit sessions (enforced server-side).' },
  { key: 'showBanner', label: 'Show Banner', description: 'Display the maintenance banner across the app.' },
  { key: 'restrictClientAccess', label: 'Restrict Client Access', description: 'Clients see a maintenance screen instead of their dashboard.' },
  { key: 'allowAdminAccess', label: 'Allow Admin Access', description: 'Admins can still use the platform while clients are restricted.' },
];

export function MaintenanceModePage() {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<MaintenanceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setForm(await maintenanceService.get());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(updates: Partial<MaintenanceSettings>) {
    if (!form) return;
    const optimistic = { ...form, ...updates };
    setForm(optimistic);
    setIsSaving(true);
    try {
      const saved = await maintenanceService.update(updates);
      setForm(saved);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save');
      setForm(form);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading maintenance settings..." />;
  if (error || !form) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Maintenance Control</h2>

      <div className="card ic-card">
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h3 className="h6 mb-1">Maintenance Mode</h3>
            <p className="text-secondary small mb-0">Master switch — every option below only takes effect while this is ON.</p>
          </div>
          <div className="form-check form-switch fs-5 mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="maintenanceEnabled"
              checked={form.enabled}
              disabled={isSaving}
              onChange={(e) => persist({ enabled: e.target.checked }).then(() => showSuccess(e.target.checked ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.'))}
            />
            <label className="form-check-label" htmlFor="maintenanceEnabled">
              {form.enabled ? 'ON' : 'OFF'}
            </label>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {TOGGLES.map((toggle) => (
          <div className="col-12 col-md-6" key={toggle.key}>
            <div className="card ic-card h-100">
              <div className="card-body d-flex justify-content-between align-items-start gap-2">
                <div>
                  <p className="fw-semibold mb-1">{toggle.label}</p>
                  <p className="text-secondary small mb-0">{toggle.description}</p>
                </div>
                <div className="form-check form-switch mb-0 flex-shrink-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    aria-label={toggle.label}
                    checked={form[toggle.key] as boolean}
                    disabled={!form.enabled || isSaving}
                    onChange={(e) => persist({ [toggle.key]: e.target.checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">Banner Message</h3>
          <div className="mb-3">
            <label htmlFor="bannerTitle" className="form-label">
              Title
            </label>
            <input id="bannerTitle" type="text" className="form-control" value={form.bannerTitle} onChange={(e) => setForm({ ...form, bannerTitle: e.target.value })} />
          </div>
          <div className="mb-3">
            <label htmlFor="bannerMessage" className="form-label">
              Message
            </label>
            <textarea
              id="bannerMessage"
              className="form-control"
              rows={2}
              value={form.bannerMessage}
              onChange={(e) => setForm({ ...form, bannerMessage: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isSaving}
            onClick={() => persist({ bannerTitle: form.bannerTitle, bannerMessage: form.bannerMessage }).then(() => showSuccess('Banner text saved.'))}
          >
            Save Banner Text
          </button>
        </div>
      </div>
    </div>
  );
}
