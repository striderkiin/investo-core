import { useEffect, useRef, useState } from 'react';
import { Collapse } from 'bootstrap';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { EnvironmentBadge } from './EnvironmentBadge';
import { useBranding } from '../../hooks/useBranding';
import { createSocialLinksService } from '../../services/api/socialLinksService';
import type { SocialLink } from '../../types/database';
import { SocialLinksRow } from '../public/SocialLinksRow';

const socialLinksService = createSocialLinksService();

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/#pricing', label: 'Pricing' },
  { to: '/#about', label: 'About' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/#contact', label: 'Contact' },
];

export function PublicLayout() {
  const { branding } = useBranding();
  const navRef = useRef<HTMLDivElement>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    socialLinksService
      .listEnabled()
      .then(setSocialLinks)
      .catch((err) => console.error('Failed to load social links', err));
  }, []);

  // Clicking a Link inside the mobile menu is a client-side route change,
  // not a page load — Bootstrap's own data-bs-toggle collapse never sees a
  // reason to close, so it stays expanded over the next page until the
  // user manually taps the toggler again. Close it explicitly on any
  // in-menu navigation.
  function closeMobileNav() {
    if (navRef.current) {
      Collapse.getOrCreateInstance(navRef.current, { toggle: false }).hide();
    }
  }

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
          <div className="collapse navbar-collapse" id="publicNav" ref={navRef} onClick={closeMobileNav}>
            <ul className="navbar-nav mx-auto my-3 my-lg-0 gap-lg-2">
              {NAV_LINKS.map((link) =>
                link.end ? (
                  <li className="nav-item" key={link.to}>
                    <NavLink to={link.to} end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                      {link.label}
                    </NavLink>
                  </li>
                ) : (
                  <li className="nav-item" key={link.to}>
                    <Link to={link.to} className="nav-link">
                      {link.label}
                    </Link>
                  </li>
                )
              )}
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
      {/* Footer — verbatim from Base/style/footer.php lines 38-121 (the CTA banner at
          lines 1-37 is dropped per the brief). Recolor keeps this section black rather
          than mechanically following the full-bleed-dark-maps-to-warm-white rule from
          §3.6: the footer is the brief's own flagged exception, closing the page to
          match the hero and every other footer in this build. */}
      <footer className="sv-page tw:bg-[#080808] tw:pt-14 md:tw:pt-20 lg:tw:pt-23 tw:relative tw:mt-5">
        <div className="tw:container tw:mx-auto tw:px-4">
          <div className="tw:flex tw:justify-between lg:tw:gap-10 tw:border-y tw:border-white/10 tw:flex-col lg:tw:flex-row">
            <div className="tw:py-10 lg:tw:py-12.5 lg:tw:max-w-87.5 tw:w-full">
              <Link className="tw:inline-flex tw:items-center tw:mb-4" to="/">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="" style={{ height: 24, width: 'auto' }} />
                ) : (
                  <i className="bi bi-graph-up-arrow tw:text-primary" style={{ fontSize: 24 }} aria-hidden="true" />
                )}
                <span className="tw:ml-2 tw:text-title_black tw:text-xl tw:font-semibold">{branding.logoText ?? branding.siteName}</span>
              </Link>
              <p className="tw:text-paragraph_black">Secure, transparent investment management, all in one place.</p>
            </div>
            <div className="tw:w-full lg:tw:w-px tw:h-px lg:tw:h-auto tw:bg-white/10" />
            <div className="tw:py-10 lg:tw:py-12.5 lg:tw:max-w-161.25 tw:w-full tw:grid tw:grid-cols-2 tw:items-start tw:justify-between tw:gap-10">
              <div>
                <h3 className="tw:mb-6 tw:text-title_black tw:text-xl tw:font-semibold tw:leading-none!">Platform</h3>
                <ul className="tw:flex tw:flex-col tw:items-start tw:gap-3 sm:tw:gap-5">
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/#pricing">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/#about">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/#faq">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/#contact">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="tw:mb-6 tw:text-title_black tw:text-xl tw:font-semibold tw:leading-none!">Legal</h3>
                <ul className="tw:flex tw:flex-col tw:items-start tw:gap-3 sm:tw:gap-5">
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/terms">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/privacy">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/risk-disclosure">
                      Risk Disclosure
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_black hover:tw:text-primary" to="/refund-policy">
                      Refund Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="tw:py-5 md:tw:py-8 lg:tw:py-10.5 tw:flex tw:items-center tw:justify-between tw:gap-4 sm:tw:gap-6 tw:flex-col sm:tw:flex-row">
            <p className="tw:text-paragraph_black tw:text-center sm:tw:text-left tw:mb-0">
              &copy; {new Date().getFullYear()} {branding.siteName}. All rights reserved.
            </p>
            {socialLinks.length > 0 && <SocialLinksRow links={socialLinks} />}
          </div>
        </div>
      </footer>
    </div>
  );
}
