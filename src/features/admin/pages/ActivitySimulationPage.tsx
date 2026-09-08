import { useEffect, useState } from 'react';
import { createActivityService } from '../../../services/api/activityService';
import type { ActivitySettings, OnlineUserSettings } from '../../../services/api/activityService';
import { useOnlineUserSimulator } from '../../operations/useOnlineUserSimulator';
import { NumericStepper } from '../../../components/controls/NumericStepper';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { useToast } from '../../../hooks/useToast';

const activityService = createActivityService();

const EVENT_TYPES = ['deposit', 'withdrawal', 'investment', 'referral_bonus', 'plan_upgrade'];
const FREQUENCIES: ActivitySettings['frequency'][] = ['low', 'medium', 'high', 'custom'];
const VARIATIONS: ActivitySettings['variationLevel'][] = ['low', 'medium', 'high'];

export function ActivitySimulationPage() {
  const { showSuccess, showError } = useToast();
  const [activity, setActivity] = useState<ActivitySettings | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { count: liveCount } = useOnlineUserSimulator();

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [a, o] = await Promise.all([activityService.getActivitySettings(), activityService.getOnlineUserSettings()]);
      setActivity(a);
      setOnlineUsers(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load simulation settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persistActivity(updates: Partial<ActivitySettings>) {
    if (!activity) return;
    setActivity({ ...activity, ...updates });
    try {
      setActivity(await activityService.updateActivitySettings(updates));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function persistOnlineUsers(updates: Partial<OnlineUserSettings>) {
    if (!onlineUsers) return;
    setOnlineUsers({ ...onlineUsers, ...updates });
    try {
      setOnlineUsers(await activityService.updateOnlineUserSettings(updates));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function toggleEventType(type: string) {
    if (!activity) return;
    const next = activity.eventTypes.includes(type) ? activity.eventTypes.filter((t) => t !== type) : [...activity.eventTypes, type];
    void persistActivity({ eventTypes: next });
  }

  if (isLoading) return <LoadingScreen label="Loading simulation settings..." />;
  if (error || !activity || !onlineUsers) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Activity & Simulation</h2>
      <p className="text-secondary small mb-0">
        <i className="bi bi-info-circle me-1" aria-hidden="true" />
        For Demo Mode only. All events generated here are clearly labeled as simulated — no real balances are affected.
      </p>

      <div className="card ic-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h6 mb-0">Activity Simulation Engine</h3>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="activityEnabled"
                checked={activity.enabled}
                onChange={(e) => persistActivity({ enabled: e.target.checked }).then(() => showSuccess(e.target.checked ? 'Activity simulation enabled.' : 'Activity simulation disabled.'))}
              />
              <label className="form-check-label" htmlFor="activityEnabled">
                {activity.enabled ? 'ON' : 'OFF'}
              </label>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <label htmlFor="frequency" className="form-label small">
                Frequency
              </label>
              <select id="frequency" className="form-select form-select-sm" value={activity.frequency} onChange={(e) => persistActivity({ frequency: e.target.value as ActivitySettings['frequency'] })}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f} className="text-capitalize">
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <NumericStepper label="Events Per Hour" value={activity.eventsPerHour} step={5} min={1} onChange={(v) => persistActivity({ eventsPerHour: v })} />
            </div>
            <div className="col-12 col-md-4">
              <label htmlFor="variation" className="form-label small">
                Variation / Noise Level
              </label>
              <select id="variation" className="form-select form-select-sm" value={activity.variationLevel} onChange={(e) => persistActivity({ variationLevel: e.target.value as ActivitySettings['variationLevel'] })}>
                {VARIATIONS.map((v) => (
                  <option key={v} value={v} className="text-capitalize">
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="form-label small d-block">Event Types</span>
          <div className="d-flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm text-capitalize ${activity.eventTypes.includes(type) ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => toggleEventType(type)}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card ic-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h6 mb-0">Online User Simulator</h3>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="onlineEnabled"
                checked={onlineUsers.enabled}
                onChange={(e) => persistOnlineUsers({ enabled: e.target.checked }).then(() => showSuccess(e.target.checked ? 'Online user simulation enabled.' : 'Online user simulation disabled.'))}
              />
              <label className="form-check-label" htmlFor="onlineEnabled">
                {onlineUsers.enabled ? 'ON' : 'OFF'}
              </label>
            </div>
          </div>

          {onlineUsers.enabled && liveCount !== null && (
            <p className="mb-3">
              <span className="badge text-bg-info fs-6">
                <i className="bi bi-people me-1" aria-hidden="true" />
                {liveCount.toLocaleString()} Simulated Online Users
              </span>
            </p>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-3">
              <NumericStepper label="Base Users" value={onlineUsers.baseUsers} step={50} min={0} onChange={(v) => persistOnlineUsers({ baseUsers: v })} />
            </div>
            <div className="col-12 col-md-3">
              <NumericStepper label="Minimum" value={onlineUsers.minUsers} step={50} min={0} onChange={(v) => persistOnlineUsers({ minUsers: v })} />
            </div>
            <div className="col-12 col-md-3">
              <NumericStepper label="Maximum" value={onlineUsers.maxUsers} step={50} min={onlineUsers.minUsers} onChange={(v) => persistOnlineUsers({ maxUsers: v })} />
            </div>
            <div className="col-12 col-md-3">
              <NumericStepper
                label="Fluctuation Speed (ms)"
                value={onlineUsers.fluctuationSpeedMs}
                step={500}
                min={1000}
                onChange={(v) => persistOnlineUsers({ fluctuationSpeedMs: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
