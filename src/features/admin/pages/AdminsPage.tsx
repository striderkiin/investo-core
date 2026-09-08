import { useEffect, useState } from 'react';
import { createUserService } from '../../../services/api/userService';
import type { Profile } from '../../../types/database';
import type { RoleName } from '../../../types/roles';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/modals/Modal';

const userService = createUserService();

const ADMIN_ROLES: RoleName[] = ['super_admin', 'finance_admin', 'support_admin', 'operations_admin'];

const ROLE_VARIANT: Record<RoleName, string> = {
  super_admin: 'danger',
  finance_admin: 'primary',
  support_admin: 'info',
  operations_admin: 'success',
  client: 'secondary',
};

export function AdminsPage() {
  const { profile: currentProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromote, setShowPromote] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleName>('support_admin');

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setAdmins(await userService.listAdmins());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!showPromote || search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      userService
        .list(search)
        .then((results) => setSearchResults(results.filter((r) => r.role === 'client')))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, showPromote]);

  async function handleAssignRole(userId: string, role: RoleName) {
    try {
      await userService.setRole(userId, role);
      showSuccess('Role updated.');
      setShowPromote(false);
      setSearch('');
      setSearchResults([]);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleDeactivate(admin: Profile) {
    if (!window.confirm(`Suspend admin access for ${admin.fullName || admin.email}?`)) return;
    try {
      await userService.setAccountStatus(admin.id, 'suspended');
      showSuccess('Admin suspended.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to suspend admin');
    }
  }

  async function handleReactivate(admin: Profile) {
    try {
      await userService.setAccountStatus(admin.id, 'active');
      showSuccess('Admin reactivated.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to reactivate admin');
    }
  }

  async function handleDemote(admin: Profile) {
    if (!window.confirm(`Remove admin access from ${admin.fullName || admin.email}? They will become a regular client.`)) return;
    try {
      await userService.setRole(admin.id, 'client');
      showSuccess('Admin access removed.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to demote admin');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading admins..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Admins & Roles</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowPromote(true)}>
          <i className="bi bi-person-plus me-1" aria-hidden="true" />
          Assign Admin Role
        </button>
      </div>

      {admins.length === 0 ? (
        <EmptyState icon="bi-person-badge" title="No admin accounts yet" />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">Admin</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div className="fw-semibold">{admin.fullName || '—'}</div>
                    <div className="text-secondary small">{admin.email}</div>
                  </td>
                  <td>
                    <span className={`badge text-bg-${ROLE_VARIANT[admin.role]} text-capitalize`}>{admin.role.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <span className={`badge text-bg-${admin.accountStatus === 'active' ? 'success' : 'danger'} text-capitalize`}>
                      {admin.accountStatus}
                    </span>
                  </td>
                  <td className="text-end">
                    {admin.id === currentProfile?.id ? (
                      <span className="text-secondary small">You</span>
                    ) : (
                      <div className="d-flex gap-1 justify-content-end flex-wrap">
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 150 }}
                          value={admin.role}
                          onChange={(e) => handleAssignRole(admin.id, e.target.value as RoleName)}
                          aria-label={`Change role for ${admin.fullName || admin.email}`}
                        >
                          {ADMIN_ROLES.map((r) => (
                            <option key={r} value={r} className="text-capitalize">
                              {r.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                        {admin.accountStatus === 'active' ? (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeactivate(admin)}>
                            Suspend
                          </button>
                        ) : (
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleReactivate(admin)}>
                            Reactivate
                          </button>
                        )}
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleDemote(admin)}>
                          Remove Access
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Assign Admin Role" show={showPromote} onClose={() => setShowPromote(false)}>
        <div className="mb-3">
          <label htmlFor="adminSearch" className="form-label">
            Search existing users by name or email
          </label>
          <input id="adminSearch" type="search" className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type at least 2 characters…" />
        </div>
        <div className="mb-3">
          <label htmlFor="roleSelect" className="form-label">
            Assign Role
          </label>
          <select id="roleSelect" className="form-select" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as RoleName)}>
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r} className="text-capitalize">
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        {isSearching ? (
          <LoadingScreen label="Searching…" />
        ) : searchResults.length === 0 ? (
          search.trim().length >= 2 && <p className="text-secondary small">No matching client accounts found.</p>
        ) : (
          <div className="list-group">
            {searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => handleAssignRole(user.id, selectedRole)}
              >
                <span>
                  {user.fullName || '—'} <span className="text-secondary small">{user.email}</span>
                </span>
                <span className="badge text-bg-primary text-capitalize">Make {selectedRole.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
