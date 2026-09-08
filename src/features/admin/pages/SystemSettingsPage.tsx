import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createSettingsService } from '../../../services/api/settingsService';
import type { SystemSettings } from '../../../services/api/settingsService';
import { NumericStepper } from '../../../components/controls/NumericStepper';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { useToast } from '../../../hooks/useToast';

const settingsService = createSettingsService();

export function SystemSettingsPage() {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setForm(await settingsService.get());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(updates: Partial<SystemSettings>) {
    if (!form) return;
    setForm({ ...form, ...updates });
    setIsSaving(true);
    try {
      setForm(await settingsService.update(updates));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading system settings..." />;
  if (error || !form) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">System Settings</h2>
      <p className="text-secondary small mb-0">
        Financial limits live in <Link to="/admin/financial">Financial Center</Link>, investment plans in{' '}
        <Link to="/admin/investments">Investments</Link>, and maintenance mode in <Link to="/admin/maintenance">Maintenance</Link>.
      </p>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">General</h3>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="siteName" className="form-label">
                Site Name
              </label>
              <input id="siteName" type="text" className="form-control" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="supportEmail" className="form-label">
                Support Email
              </label>
              <input id="supportEmail" type="email" className="form-control" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="supportPhone" className="form-label">
                Support Phone
              </label>
              <input id="supportPhone" type="text" className="form-control" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="defaultCurrency" className="form-label">
                Default Currency
              </label>
              <input id="defaultCurrency" type="text" className="form-control" value={form.defaultCurrency} onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="timezone" className="form-label">
                Timezone
              </label>
              <input id="timezone" type="text" className="form-control" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="dateFormat" className="form-label">
                Date Format
              </label>
              <input id="dateFormat" type="text" className="form-control" value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            disabled={isSaving}
            onClick={() =>
              persist({
                siteName: form.siteName,
                supportEmail: form.supportEmail,
                supportPhone: form.supportPhone,
                defaultCurrency: form.defaultCurrency,
                timezone: form.timezone,
                dateFormat: form.dateFormat,
              }).then(() => showSuccess('General settings saved.'))
            }
          >
            Save General Settings
          </button>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">Security Policy</h3>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="emailVerification"
                  checked={form.emailVerificationRequired}
                  disabled={isSaving}
                  onChange={(e) => persist({ emailVerificationRequired: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="emailVerification">
                  Require Email Verification
                </label>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="twoFactorRequired"
                  checked={form.twoFactorRequired}
                  disabled={isSaving}
                  onChange={(e) => persist({ twoFactorRequired: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="twoFactorRequired">
                  Require Two-Factor Authentication
                </label>
              </div>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <NumericStepper
                label="Session Timeout (minutes)"
                value={form.sessionTimeoutMinutes}
                step={5}
                min={5}
                onChange={(v) => persist({ sessionTimeoutMinutes: v })}
              />
            </div>
            <div className="col-12 col-md-6">
              <NumericStepper label="Login Attempt Limit" value={form.loginAttemptLimit} step={1} min={1} onChange={(v) => persist({ loginAttemptLimit: v })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
