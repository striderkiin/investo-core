import { useEffect, useState } from 'react';
import { createAuditService } from '../../../services/api/auditService';
import type { AdminAuditLog } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';

const auditService = createAuditService();

const MODULES = ['all', 'users', 'withdrawals', 'market', 'settings', 'branding', 'integrations'];

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [module, setModule] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setLogs(await auditService.list(module === 'all' ? undefined : module));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  return (
    <div className="d-flex flex-column gap-4">
      <h2 className="h4 mb-0">Audit Logs</h2>

      <div className="d-flex gap-2 flex-wrap">
        {MODULES.map((m) => (
          <button key={m} type="button" className={`btn btn-sm text-capitalize ${module === m ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setModule(m)}>
            {m}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingScreen label="Loading audit logs..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : logs.length === 0 ? (
        <EmptyState icon="bi-journal-text" title="No audit log entries" />
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Admin</th>
                <th scope="col">Action</th>
                <th scope="col">Module</th>
                <th scope="col">Target</th>
                <th scope="col">Previous</th>
                <th scope="col">New</th>
                <th scope="col">Environment</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="text-secondary small">{log.adminId.slice(0, 8)}</td>
                  <td className="text-capitalize">{log.action.replace(/_/g, ' ')}</td>
                  <td className="text-capitalize">{log.module}</td>
                  <td className="text-secondary small">{log.target ?? '—'}</td>
                  <td className="text-secondary small text-truncate" style={{ maxWidth: 160 }}>
                    {log.previousValue ?? '—'}
                  </td>
                  <td className="text-secondary small text-truncate" style={{ maxWidth: 160 }}>
                    {log.newValue ?? '—'}
                  </td>
                  <td className="text-uppercase small">{log.environment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
