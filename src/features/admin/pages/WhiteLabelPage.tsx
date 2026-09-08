import { useEffect, useState } from 'react';
import { createWhiteLabelService } from '../../../services/api/whiteLabelService';
import type { DomainStatus, WhiteLabelSettings } from '../../../services/api/whiteLabelService';
import { useToast } from '../../../hooks/useToast';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';

const whiteLabelService = createWhiteLabelService();

const DOMAIN_STATUS_VARIANT: Record<DomainStatus, string> = {
  not_configured: 'secondary',
  pending_verification: 'warning',
  verified: 'info',
  active: 'success',
};

const DOMAIN_STATUS_LABEL: Record<DomainStatus, string> = {
  not_configured: 'Not Configured',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  active: 'Active',
};

export function WhiteLabelPage() {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<WhiteLabelSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setForm(await whiteLabelService.get());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load white-label settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function update<K extends keyof WhiteLabelSettings>(key: K, value: WhiteLabelSettings[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    try {
      const { id: _id, ...updates } = form;
      const saved = await whiteLabelService.update(updates);
      setForm(saved);
      showSuccess('White-label settings saved.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingScreen label="Loading white-label settings..." />;
  if (error || !form) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">White-Label Configuration</h2>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">General Identity</h3>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="platformName" className="form-label">
                Platform Name
              </label>
              <input id="platformName" type="text" className="form-control" value={form.platformName} onChange={(e) => update('platformName', e.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="displayName" className="form-label">
                Display Name
              </label>
              <input id="displayName" type="text" className="form-control" value={form.displayName} onChange={(e) => update('displayName', e.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="legalBusinessName" className="form-label">
                Legal Business Name
              </label>
              <input
                id="legalBusinessName"
                type="text"
                className="form-control"
                value={form.legalBusinessName}
                onChange={(e) => update('legalBusinessName', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="website" className="form-label">
                Website
              </label>
              <input id="website" type="text" className="form-control" value={form.website} onChange={(e) => update('website', e.target.value)} />
            </div>
            <div className="col-12">
              <label htmlFor="shortDescription" className="form-label">
                Short Description
              </label>
              <textarea
                id="shortDescription"
                className="form-control"
                rows={2}
                value={form.shortDescription}
                onChange={(e) => update('shortDescription', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="supportName" className="form-label">
                Support Name
              </label>
              <input id="supportName" type="text" className="form-control" value={form.supportName} onChange={(e) => update('supportName', e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="supportEmail" className="form-label">
                Support Email
              </label>
              <input
                id="supportEmail"
                type="email"
                className="form-control"
                value={form.supportEmail}
                onChange={(e) => update('supportEmail', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="supportPhone" className="form-label">
                Support Phone
              </label>
              <input id="supportPhone" type="text" className="form-control" value={form.supportPhone} onChange={(e) => update('supportPhone', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h6 mb-0">Domain Settings</h3>
            <span className={`badge text-bg-${DOMAIN_STATUS_VARIANT[form.domainStatus]}`}>{DOMAIN_STATUS_LABEL[form.domainStatus]}</span>
          </div>
          <p className="text-secondary small">
            DNS verification happens server-side once a real domain provider integration is configured (Phase 7+). For now, this records the intended
            configuration.
          </p>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="primaryDomain" className="form-label">
                Primary Domain
              </label>
              <input
                id="primaryDomain"
                type="text"
                className="form-control"
                placeholder="app.example.com"
                value={form.primaryDomain ?? ''}
                onChange={(e) => update('primaryDomain', e.target.value || null)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="domainStatus" className="form-label">
                Status
              </label>
              <select
                id="domainStatus"
                className="form-select"
                value={form.domainStatus}
                onChange={(e) => update('domainStatus', e.target.value as DomainStatus)}
              >
                <option value="not_configured">Not Configured</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="verified">Verified</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="applicationUrl" className="form-label">
                Application URL
              </label>
              <input
                id="applicationUrl"
                type="text"
                className="form-control"
                value={form.applicationUrl ?? ''}
                onChange={(e) => update('applicationUrl', e.target.value || null)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="apiUrl" className="form-label">
                API URL
              </label>
              <input id="apiUrl" type="text" className="form-control" value={form.apiUrl ?? ''} onChange={(e) => update('apiUrl', e.target.value || null)} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="supportUrl" className="form-label">
                Support URL
              </label>
              <input
                id="supportUrl"
                type="text"
                className="form-control"
                value={form.supportUrl ?? ''}
                onChange={(e) => update('supportUrl', e.target.value || null)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6 mb-3">Business Information</h3>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="businessName" className="form-label">
                Business Name
              </label>
              <input id="businessName" type="text" className="form-control" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="businessRegistrationNumber" className="form-label">
                Business Registration Number
              </label>
              <input
                id="businessRegistrationNumber"
                type="text"
                className="form-control"
                value={form.businessRegistrationNumber}
                onChange={(e) => update('businessRegistrationNumber', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="businessAddress" className="form-label">
                Business Address
              </label>
              <input
                id="businessAddress"
                type="text"
                className="form-control"
                value={form.businessAddress}
                onChange={(e) => update('businessAddress', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label htmlFor="supportAddress" className="form-label">
                Support Address
              </label>
              <input
                id="supportAddress"
                type="text"
                className="form-control"
                value={form.supportAddress}
                onChange={(e) => update('supportAddress', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="country" className="form-label">
                Country
              </label>
              <input id="country" type="text" className="form-control" value={form.country} onChange={(e) => update('country', e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="timezone" className="form-label">
                Timezone
              </label>
              <input id="timezone" type="text" className="form-control" value={form.timezone} onChange={(e) => update('timezone', e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="defaultCurrency" className="form-label">
                Default Currency
              </label>
              <input
                id="defaultCurrency"
                type="text"
                className="form-control"
                value={form.defaultCurrency}
                onChange={(e) => update('defaultCurrency', e.target.value)}
              />
            </div>
            <div className="col-12">
              <label htmlFor="operatingRegions" className="form-label">
                Operating Regions <span className="text-secondary">(comma-separated)</span>
              </label>
              <input
                id="operatingRegions"
                type="text"
                className="form-control"
                value={form.operatingRegions.join(', ')}
                onChange={(e) =>
                  update(
                    'operatingRegions',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
