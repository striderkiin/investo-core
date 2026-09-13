import { Outlet } from 'react-router-dom';
import { useBranding } from '../../hooks/useBranding';

/**
 * Minimal chrome for the handful of authenticated actions (deposit, withdraw,
 * invest) that live in this React app rather than the client-app static
 * pages — see client-app/README.md. Auth itself is enforced by ProtectedRoute
 * around this layout; there is no marketing nav here since these pages are
 * reached only by a logged-in client clicking out of client-app.
 */
export function ClientActionLayout() {
  const { branding } = useBranding();

  return (
    <div className="ic-public d-flex flex-column min-vh-100">
      <nav className="ic-public-nav navbar py-3">
        <div className="container d-flex align-items-center justify-content-between">
          <span className="navbar-brand fw-bold d-flex align-items-center mb-0">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="me-2" style={{ height: 28, width: 'auto' }} />
            ) : (
              <i className="bi bi-graph-up-arrow me-2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
            )}
            {branding.logoText ?? branding.siteName}
          </span>
          <a href="/client-app/index.html" className="btn ic-public-btn-outline btn-sm">
            <i className="bi bi-arrow-left me-1" aria-hidden="true" />
            Back to Dashboard
          </a>
        </div>
      </nav>
      <main className="flex-grow-1">
        <Outlet />
      </main>
    </div>
  );
}
