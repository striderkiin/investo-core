import { useEffect, useState } from 'react';
import { createSecurityService } from '../../../services/api/securityService';
import type { SecurityEvent, UserSession } from '../../../services/api/securityService';
import { MetricCard } from '../../../components/common/MetricCard';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const securityService = createSecurityService();

interface Counts {
  blockedUsers: number;
  activeSessions: number;
  adminSessions: number;
  securityEvents: number;
}

export function SecurityCenterPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [countsData, eventsData, sessionsData] = await Promise.all([
        securityService.getSecurityCounts(),
        securityService.listSecurityEvents(50),
        securityService.listActiveSessions(50),
      ]);
      setCounts(countsData);
      setEvents(eventsData);
      setSessions(sessionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security center');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleTerminate(session: UserSession) {
    if (!window.confirm('Terminate this session?')) return;
    try {
      await securityService.terminateSession(session.id);
      await load();
    } catch {
      // surfaced via reload failing silently is acceptable here; list will just not update
    }
  }

  if (isLoading) return <LoadingScreen label="Loading security center..." />;
  if (error || !counts) return <ErrorState message={error ?? 'Unable to load'} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Security Center</h2>

      <div className="row g-3">
        <div className="col-6 col-lg-3">
          <MetricCard label="Blocked Users" value={counts.blockedUsers} icon="bi-person-x" prefix="" decimals={0} variant="danger" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Active Sessions" value={counts.activeSessions} icon="bi-display" prefix="" decimals={0} variant="primary" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Admin Sessions" value={counts.adminSessions} icon="bi-shield-lock" prefix="" decimals={0} variant="warning" />
        </div>
        <div className="col-6 col-lg-3">
          <MetricCard label="Security Events" value={counts.securityEvents} icon="bi-exclamation-triangle" prefix="" decimals={0} variant="secondary" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Active Sessions</h3>
              {sessions.length === 0 ? (
                <EmptyState icon="bi-display" title="No active sessions" />
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th scope="col">User</th>
                        <th scope="col">Device</th>
                        <th scope="col">Last Active</th>
                        <th scope="col" />
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id}>
                          <td className="text-secondary small">{session.userId.slice(0, 8)}</td>
                          <td className="text-truncate small" style={{ maxWidth: 160 }}>
                            {session.isAdminSession && <span className="badge text-bg-warning me-1">Admin</span>}
                            {session.userAgent ?? '—'}
                          </td>
                          <td className="small">{new Date(session.lastActiveAt).toLocaleString()}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleTerminate(session)}>
                              Terminate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card ic-card h-100">
            <div className="card-body">
              <h3 className="h6">Security Events</h3>
              {events.length === 0 ? (
                <EmptyState icon="bi-shield-exclamation" title="No security events recorded" />
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Type</th>
                        <th scope="col">User</th>
                        <th scope="col">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td className="text-capitalize small">{event.eventType.replace(/_/g, ' ')}</td>
                          <td className="text-secondary small">{event.userId?.slice(0, 8) ?? '—'}</td>
                          <td className="small">{new Date(event.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
