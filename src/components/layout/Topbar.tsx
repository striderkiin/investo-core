import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { EnvironmentBadge } from './EnvironmentBadge';

interface TopbarProps {
  title: string;
  onToggleSidebar: () => void;
  extra?: ReactNode;
}

export function Topbar({ title, onToggleSidebar, extra }: TopbarProps) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="bg-white border-bottom px-3 py-2 d-flex align-items-center justify-content-between sticky-top">
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-lg-none"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <i className="bi bi-list" aria-hidden="true" />
        </button>
        <h1 className="h5 mb-0">{title}</h1>
      </div>
      <div className="d-flex align-items-center gap-3">
        {extra}
        <EnvironmentBadge />
        <div className="dropdown">
          <button
            type="button"
            className="btn btn-light btn-sm d-flex align-items-center gap-2"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-person-circle fs-5" aria-hidden="true" />
            <span className="d-none d-md-inline">{profile?.fullName || profile?.email}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <span className="dropdown-item-text small text-secondary text-capitalize">
                {profile?.role.replace('_', ' ')}
              </span>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button type="button" className="dropdown-item" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
                Log Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
