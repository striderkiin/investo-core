import { useEffect, useState } from 'react';
import { createUserService } from '../../../services/api/userService';
import type { AccountStatus, Profile } from '../../../types/database';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { usePermission } from '../../../hooks/usePermission';
import { useToast } from '../../../hooks/useToast';
import { BalanceAdjustmentModal } from '../components/BalanceAdjustmentModal';
import { UserDetailModal } from '../components/UserDetailModal';

const userService = createUserService();

const STATUS_VARIANT: Record<AccountStatus, string> = {
  active: 'success',
  restricted: 'warning',
  withdrawal_freeze: 'warning',
  suspended: 'danger',
  frozen: 'danger',
};

export function UsersPage() {
  const { can } = usePermission();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustingUser, setAdjustingUser] = useState<Profile | null>(null);
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await userService.list(search || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleStatusChange(user: Profile, status: AccountStatus) {
    setOpenMenuId(null);
    try {
      await userService.setAccountStatus(user.id, status);
      showSuccess(`${user.fullName || user.email} is now ${status.replace('_', ' ')}.`);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update account status');
    }
  }

  if (isLoading) return <LoadingScreen label="Loading users..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="h4 mb-0">Users</h2>
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
      </div>

      {users.length === 0 ? (
        <EmptyState icon="bi-people" title="No users found" message="Try a different search." />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Balance</th>
                <th scope="col">Available</th>
                <th scope="col">Invested</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
                <th scope="col" className="text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                        <i className="bi bi-person" aria-hidden="true" />
                      </span>
                      <div>
                        <div className="fw-semibold">{user.fullName || '—'}</div>
                        <div className="text-secondary small">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>${user.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>${user.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>${user.investedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`badge text-bg-${STATUS_VARIANT[user.accountStatus]} text-capitalize`}>
                      {user.accountStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="text-end position-relative">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === user.id}
                    >
                      Actions <i className="bi bi-caret-down-fill" aria-hidden="true" />
                    </button>
                    {openMenuId === user.id && (
                      <div className="dropdown-menu show position-absolute end-0" style={{ zIndex: 5 }}>
                        <button type="button" className="dropdown-item" onClick={() => { setViewingUser(user); setOpenMenuId(null); }}>
                          <i className="bi bi-eye me-2" aria-hidden="true" />
                          View Ledger
                        </button>
                        {can('users.adjust_balance') && (
                          <button type="button" className="dropdown-item" onClick={() => { setAdjustingUser(user); setOpenMenuId(null); }}>
                            <i className="bi bi-cash-coin me-2" aria-hidden="true" />
                            Adjust Balance
                          </button>
                        )}
                        {can('users.manage_status') && (
                          <>
                            <hr className="dropdown-divider" />
                            {user.accountStatus !== 'active' && (
                              <button type="button" className="dropdown-item" onClick={() => handleStatusChange(user, 'active')}>
                                <i className="bi bi-check-circle me-2" aria-hidden="true" />
                                Restore
                              </button>
                            )}
                            {user.accountStatus !== 'restricted' && (
                              <button type="button" className="dropdown-item" onClick={() => handleStatusChange(user, 'restricted')}>
                                <i className="bi bi-shield-exclamation me-2" aria-hidden="true" />
                                Restrict
                              </button>
                            )}
                            {user.accountStatus !== 'withdrawal_freeze' && (
                              <button type="button" className="dropdown-item" onClick={() => handleStatusChange(user, 'withdrawal_freeze')}>
                                <i className="bi bi-snow me-2" aria-hidden="true" />
                                Freeze Withdrawals
                              </button>
                            )}
                            {user.accountStatus !== 'suspended' && (
                              <button type="button" className="dropdown-item text-danger" onClick={() => handleStatusChange(user, 'suspended')}>
                                <i className="bi bi-slash-circle me-2" aria-hidden="true" />
                                Suspend
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustingUser && (
        <BalanceAdjustmentModal user={adjustingUser} show onClose={() => setAdjustingUser(null)} onAdjusted={load} />
      )}
      {viewingUser && <UserDetailModal user={viewingUser} show onClose={() => setViewingUser(null)} />}
    </div>
  );
}
