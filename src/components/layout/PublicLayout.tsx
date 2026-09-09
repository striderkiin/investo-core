import { Link, NavLink, Outlet } from 'react-router-dom';
import { EnvironmentBadge } from './EnvironmentBadge';
import { useBranding } from '../../hooks/useBranding';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/pricing', label: 'Pricing' },
  { to: '/mission-vision', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export function PublicLayout() {
  const { branding } = useBranding();

  return (
    <div className="ic-public d-flex flex-column min-vh-100">
      <nav className="ic-public-nav navbar navbar-expand-lg sticky-top py-3">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="me-2" style={{ height: 28, width: 'auto' }} />
            ) : (
              <i className="bi bi-graph-up-arrow me-2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
            )}
            {branding.logoText ?? branding.siteName}
          </Link>
          <button
            className="navbar-toggler border-0 text-white"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#publicNav"
            aria-controls="publicNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <i className="bi bi-list fs-3" aria-hidden="true" />
          </button>
          <div className="collapse navbar-collapse" id="publicNav">
            <ul className="navbar-nav mx-auto my-3 my-lg-0 gap-lg-2">
              {NAV_LINKS.map((link) => (
                <li className="nav-item" key={link.to}>
                  <NavLink to={link.to} end={link.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="d-flex align-items-center gap-2">
              <EnvironmentBadge />
              <Link to="/login" className="btn ic-public-btn-outline btn-sm">
                Log In
              </Link>
              <Link to="/register" className="btn ic-public-btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <footer className="ic-public-footer py-5 mt-5">
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between gap-4 mb-4">
            <div style={{ maxWidth: 320 }}>
              <Link className="navbar-brand fw-bold d-flex align-items-center mb-2" to="/">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="" className="me-2" style={{ height: 24, width: 'auto' }} />
                ) : (
                  <i className="bi bi-graph-up-arrow me-2" style={{ color: 'var(--pub-accent)' }} aria-hidden="true" />
                )}
                {branding.logoText ?? branding.siteName}
              </Link>
              <p className="small mb-0">Secure, transparent investment management, all in one place.</p>
            </div>
            <div className="d-flex gap-5 flex-wrap">
              <div>
                <p className="small fw-semibold text-white mb-2">Platform</p>
                <ul className="list-unstyled small d-flex flex-column gap-2">
                  <li>
                    <Link to="/pricing">Pricing</Link>
                  </li>
                  <li>
                    <Link to="/mission-vision">About</Link>
                  </li>
                  <li>
                    <Link to="/faq">FAQ</Link>
                  </li>
                  <li>
                    <Link to="/contact">Contact</Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="small fw-semibold text-white mb-2">Legal</p>
                <ul className="list-unstyled small d-flex flex-column gap-2">
                  <li>
                    <Link to="/terms">Terms</Link>
                  </li>
                  <li>
                    <Link to="/privacy">Privacy</Link>
                  </li>
                  <li>
                    <Link to="/risk-disclosure">Risk Disclosure</Link>
                  </li>
                  <li>
                    <Link to="/refund-policy">Refund Policy</Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-4 border-top small" style={{ borderColor: 'var(--pub-border)' }}>
            &copy; {new Date().getFullYear()} {branding.siteName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
