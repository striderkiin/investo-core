import { useEffect, useState } from 'react';
import { createSocialProofService } from '../../../services/api/socialProofService';
import type { SocialProofEvent, SocialProofMetric, SocialProofSettings, SocialProofTemplate } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { useToast } from '../../../hooks/useToast';
import { usePermission } from '../../../hooks/usePermission';

const socialProofService = createSocialProofService();

const EVENT_TYPE_LABELS: Record<string, string> = {
  new_account: 'New Accounts',
  plan_activation: 'Plan Activations',
  deposit_confirmed: 'Confirmed Deposits',
  withdrawal_completed: 'Completed Withdrawals',
  referral_joined: 'Referrals',
  milestone: 'Milestones',
};
const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS);

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function SocialProofPage() {
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const canManage = can('social_proof.manage');

  const [settings, setSettings] = useState<SocialProofSettings | null>(null);
  const [templates, setTemplates] = useState<SocialProofTemplate[]>([]);
  const [metrics, setMetrics] = useState<SocialProofMetric[]>([]);
  const [previewEvent, setPreviewEvent] = useState<SocialProofEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [s, t, m] = await Promise.all([socialProofService.getSettings(), socialProofService.listTemplates(), socialProofService.getAnalytics()]);
      setSettings(s);
      setTemplates(t);
      setMetrics(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social proof settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(updates: Partial<SocialProofSettings>) {
    if (!settings || !canManage) return;
    try {
      setSettings(await socialProofService.updateSettings(settings.id, updates));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function saveTemplate(id: string, template: string) {
    try {
      const updated = await socialProofService.updateTemplate(id, template);
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
      showSuccess('Template updated.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save template');
    }
  }

  function buildPreview(eventType: string): SocialProofEvent {
    const template = templates.find((t) => t.eventType === eventType)?.template ?? '{name} — ' + eventType;
    const vars: Record<string, string> = { name: 'Alex K.', siteName: 'the platform', planName: 'Growth Plan', amount: '$500' };
    const message = Object.entries(vars).reduce((msg, [key, value]) => msg.replace(`{${key}}`, value), template);
    return {
      id: 'preview',
      eventType,
      source: 'admin_test',
      displayName: vars.name,
      message,
      amount: null,
      planName: null,
      referenceTable: null,
      referenceId: null,
      generatedByAdminId: null,
      environment: 'development',
      broadcastScope: 'production',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };
  }

  async function sendToClientTestStream(eventType: string) {
    if (!settings?.testModeEnabled) {
      showError('Enable Live-Looking Test Notifications first.');
      return;
    }
    try {
      await socialProofService.sendTestEventToClientStream(eventType, { name: 'Alex K.', siteName: 'the platform', planName: 'Growth Plan', amount: '$500' }, 500, 'Growth Plan');
      showSuccess('Test notification sent to connected client dashboards.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to send test notification');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading social proof settings..." />;
  if (error || !settings) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Social Proof &amp; Activity</h2>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6">Settings</h3>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3 d-flex align-items-center gap-2">
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="spEnabled"
                  checked={settings.enabled}
                  disabled={!canManage}
                  onChange={(e) => persist({ enabled: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="spEnabled">
                  Enable Social Proof
                </label>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="popupPosition" className="form-label small">
                Popup Position
              </label>
              <select
                id="popupPosition"
                className="form-select form-select-sm"
                value={settings.popupPosition}
                disabled={!canManage}
                onChange={(e) => persist({ popupPosition: e.target.value as SocialProofSettings['popupPosition'] })}
              >
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6 col-md-2">
              <label className="form-label small">Display Duration (s)</label>
              <input type="number" className="form-control form-control-sm" value={settings.displayDurationSeconds} disabled={!canManage} onChange={(e) => persist({ displayDurationSeconds: Number(e.target.value) })} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">Min Delay (s)</label>
              <input type="number" className="form-control form-control-sm" value={settings.minDelaySeconds} disabled={!canManage} onChange={(e) => persist({ minDelaySeconds: Number(e.target.value) })} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">Max Delay (s)</label>
              <input type="number" className="form-control form-control-sm" value={settings.maxDelaySeconds} disabled={!canManage} onChange={(e) => persist({ maxDelaySeconds: Number(e.target.value) })} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">Max Queue</label>
              <input type="number" className="form-control form-control-sm" value={settings.maxQueue} disabled={!canManage} onChange={(e) => persist({ maxQueue: Number(e.target.value) })} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">Max / Session</label>
              <input type="number" className="form-control form-control-sm" value={settings.maxPerSession} disabled={!canManage} onChange={(e) => persist({ maxPerSession: Number(e.target.value) })} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">Max / Minute</label>
              <input type="number" className="form-control form-control-sm" value={settings.maxPerMinute} disabled={!canManage} onChange={(e) => persist({ maxPerMinute: Number(e.target.value) })} />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <label className="form-label small">Privacy — Display Name As</label>
              <select className="form-select form-select-sm" value={settings.privacyMode} disabled={!canManage} onChange={(e) => persist({ privacyMode: e.target.value as SocialProofSettings['privacyMode'] })}>
                <option value="first_name">First Name Only</option>
                <option value="first_initial">First Name + Initial</option>
                <option value="anonymous">Anonymous ("A member")</option>
              </select>
            </div>
            <div className="col-6 col-md-2 d-flex align-items-end">
              <div className="form-check form-switch mb-0">
                <input className="form-check-input" type="checkbox" role="switch" id="spSound" checked={settings.enableSound} disabled={!canManage} onChange={(e) => persist({ enableSound: e.target.checked })} />
                <label className="form-check-label" htmlFor="spSound">
                  Sound
                </label>
              </div>
            </div>
            <div className="col-6 col-md-2 d-flex align-items-end">
              <div className="form-check form-switch mb-0">
                <input className="form-check-input" type="checkbox" role="switch" id="spClose" checked={settings.showCloseButton} disabled={!canManage} onChange={(e) => persist({ showCloseButton: e.target.checked })} />
                <label className="form-check-label" htmlFor="spClose">
                  Close Button
                </label>
              </div>
            </div>
          </div>

          <span className="form-label small d-block">Production Event Types</span>
          <div className="d-flex flex-wrap gap-2 mb-1">
            {ALL_EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm ${settings.enabledEventTypes.includes(type) ? 'btn-primary' : 'btn-outline-secondary'}`}
                disabled={!canManage}
                onClick={() => persist({ enabledEventTypes: toggleInArray(settings.enabledEventTypes, type) })}
              >
                {EVENT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <p className="text-secondary small mb-0">
            These apply to real, confirmed activity. "New Accounts" and "Verified Accounts"-style events only fire for genuine signups —
            nothing here is ever generated in production mode.
          </p>
        </div>
      </div>

      <div className="card ic-card border-warning">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="h6 mb-0">Live-Looking Test Notifications</h3>
            <span className={`badge text-bg-${settings.testModeEnabled ? 'warning' : 'success'}`}>
              {settings.testModeEnabled ? '● ON — Client-Facing Test Activity Enabled' : '● OFF — Production Activity Only'}
            </span>
          </div>
          <p className="small text-secondary">
            This setting displays generated activity notifications to connected client dashboards for testing and video simulation. It
            does not create financial records. <strong>Disable before production launch.</strong>
          </p>
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="spTestMode"
              checked={settings.testModeEnabled}
              disabled={!canManage}
              onChange={(e) => persist({ testModeEnabled: e.target.checked }).then(() => showSuccess(e.target.checked ? 'Live-looking test notifications enabled.' : 'Live-looking test notifications disabled.'))}
            />
            <label className="form-check-label" htmlFor="spTestMode">
              {settings.testModeEnabled ? 'ON' : 'OFF'}
            </label>
          </div>

          <span className="form-label small d-block">Event types allowed in the test stream</span>
          <div className="d-flex flex-wrap gap-2">
            {ALL_EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm ${settings.testEventTypes.includes(type) ? 'btn-warning' : 'btn-outline-secondary'}`}
                disabled={!canManage}
                onClick={() => persist({ testEventTypes: toggleInArray(settings.testEventTypes, type) })}
              >
                {EVENT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6">Templates</h3>
          <p className="text-secondary small">Variables: {'{name} {city} {country} {planName} {siteName} {timeAgo} {amount}'}</p>
          {templates.map((t) => (
            <div className="mb-2 d-flex gap-2 align-items-center" key={t.id}>
              <span className="badge text-bg-secondary text-capitalize" style={{ minWidth: 160 }}>
                {EVENT_TYPE_LABELS[t.eventType] ?? t.eventType}
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                defaultValue={t.template}
                disabled={!canManage}
                onBlur={(e) => e.target.value !== t.template && saveTemplate(t.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6">Social Proof Preview &amp; Test Tool</h3>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {ALL_EVENT_TYPES.map((type) => (
              <button key={type} type="button" className="btn btn-sm btn-outline-primary" onClick={() => setPreviewEvent(buildPreview(type))}>
                Preview: {EVENT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {previewEvent && (
            <div className="ic-social-proof-popup ic-social-proof-enter position-relative mb-3" style={{ position: 'static' }}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="ic-social-proof-dot" aria-hidden="true" />
                <span className="small fw-semibold">Recent Activity</span>
              </div>
              <p className="mb-1 small">{previewEvent.message}</p>
              <p className="mb-0 text-secondary" style={{ fontSize: '0.75rem' }}>
                Just now
              </p>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!previewEvent} onClick={() => setPreviewEvent(previewEvent ? buildPreview(previewEvent.eventType) : null)}>
              Preview Only
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              disabled={!canManage || !previewEvent || !settings.testModeEnabled}
              title={!settings.testModeEnabled ? 'Enable Live-Looking Test Notifications first' : undefined}
              onClick={() => previewEvent && sendToClientTestStream(previewEvent.eventType)}
            >
              Send To Client Test Stream
            </button>
          </div>
          {!settings.testModeEnabled && <p className="text-secondary small mt-2 mb-0">Client Test Stream is disabled while Live-Looking Test Notifications is OFF.</p>}
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <h3 className="h6">Analytics</h3>
          {metrics.length === 0 ? (
            <p className="text-secondary small mb-0">No activity recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event Type</th>
                    <th>Source</th>
                    <th>Shown</th>
                    <th>Clicked</th>
                    <th>Click Rate</th>
                    <th>Dismissed</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={`${m.metricDate}-${m.eventType}-${m.source}`}>
                      <td>{m.metricDate}</td>
                      <td>{EVENT_TYPE_LABELS[m.eventType] ?? m.eventType}</td>
                      <td>
                        <span className={`badge text-bg-${m.source === 'production' ? 'success' : 'warning'}`}>{m.source === 'production' ? 'Production' : 'Admin Test'}</span>
                      </td>
                      <td>{m.shownCount}</td>
                      <td>{m.clickedCount}</td>
                      <td>{m.shownCount > 0 ? `${((m.clickedCount / m.shownCount) * 100).toFixed(2)}%` : '—'}</td>
                      <td>{m.dismissedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
