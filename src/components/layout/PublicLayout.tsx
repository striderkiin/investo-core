import { Link, Outlet } from 'react-router-dom';
import { EnvironmentBadge } from './EnvironmentBadge';
import { useBranding } from '../../hooks/useBranding';

export function PublicLayout() {
  const { branding } = useBranding();

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="me-2" style={{ height: 28, width: 'auto' }} />
            ) : (
              <i className="bi bi-graph-up-arrow text-primary me-2" aria-hidden="true" />
            )}
            {branding.logoText ?? branding.siteName}
          </Link>
          <div className="d-flex align-items-center gap-2">
            <EnvironmentBadge />
            <Link to="/login" className="btn btn-outline-primary btn-sm ms-2">
              Log In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <footer className="bg-white border-top py-4 mt-5">
        <div className="container d-flex flex-wrap justify-content-between gap-3 text-secondary small">
          <span>&copy; {new Date().getFullYear()} {branding.siteName}. All rights reserved.</span>
          <div className="d-flex gap-3">
            <Link to="/terms" className="link-secondary">
              Terms
            </Link>
            <Link to="/privacy" className="link-secondary">
              Privacy
            </Link>
            <Link to="/risk-disclosure" className="link-secondary">
              Risk Disclosure
            </Link>
            <Link to="/contact" className="link-secondary">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
