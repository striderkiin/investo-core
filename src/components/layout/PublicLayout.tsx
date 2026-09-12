import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useBranding } from '../../hooks/useBranding';
import { SvgSymbols } from '../public/securevest/SvgSymbols';
import { createSocialLinksService } from '../../services/api/socialLinksService';
import { SOCIAL_PLATFORM_META } from '../public/socialPlatforms';
import type { SocialLink } from '../../types/database';

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
  const togglerRef = useRef<HTMLButtonElement>(null);
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
  // in-menu navigation — by clicking the toggler programmatically rather
  // than instantiating our own bootstrap.Collapse here: main.tsx already
  // loads bootstrap.bundle.min.js (which self-inits the data-api collapse
  // instance for this element), and importing Collapse from the 'bootstrap'
  // package separately pulls in a second module instance with its own
  // instance registry — the two then fight over the same element's open/
  // closed state, which is exactly why a second tap on the toggler used to
  // stop closing the menu.
  function closeMobileNav() {
    if (navRef.current?.classList.contains('show')) {
      togglerRef.current?.click();
    }
  }

  return (
    <div className="ic-public d-flex flex-column min-vh-100">
      <SvgSymbols />
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
            ref={togglerRef}
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
      {/* Footer — structure verbatim from Base/style/footer.php lines 38-121 (lines 1-37,
          the "Ready to Scale Your Fintech Vision?" CTA banner, are skipped per the
          brief). The <footer> wrapper itself (opened at line 1, inside the skipped
          range) is recreated here since something has to hold this content.
          Newsletter form dropped (no backend to support it); "Main"/"Links"/"Contact"
          columns recontented to Platform/Legal (fake Contact column dropped — no
          real business address/phone exists); social icons wired to the real
          admin-controlled social_links data instead of literal href="#" placeholders.

          Recolor pass exception (flagged in the brief): every other full-bleed
          bg-secondary section maps to warm white, but the footer stays black —
          it closes the page consistently with the hero and matches Investo's
          footer treatment everywhere else. securevest-components.css pins its
          paragraph_white text back to light-on-black to match. */}
      <footer className="sv-page tw:bg-[#080808] tw:pt-14 tw:md:pt-20 tw:lg:pt-23 tw:relative tw:z-1">
        <div className="tw:container">
          <div className="tw:flex tw:justify-between tw:lg:gap-10 tw:border-y tw:border-white/10 tw:flex-col tw:lg:flex-row">
            <div className="tw:py-10 tw:lg:py-12.5 tw:lg:max-w-100 tw:w-full">
              <Link className="tw:flex tw:items-center tw:gap-2" to="/">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="" className="tw:h-8 tw:w-auto" />
                ) : (
                  <i className="bi bi-graph-up-arrow tw:text-primary tw:text-2xl" aria-hidden="true" />
                )}
                <span className="tw:text-white tw:text-xl tw:font-semibold">{branding.logoText ?? branding.siteName}</span>
              </Link>
              <p className="tw:mt-4 tw:sm:mt-6 tw:text-paragraph_white tw:max-w-100">
                A transparent, server-validated platform for tracking deposits, investments, and withdrawals — all in one dashboard.
              </p>
            </div>
            <div className="tw:w-full tw:lg:w-px tw:h-px tw:lg:h-auto tw:bg-white/10" />
            <div className="tw:py-10 tw:lg:py-12.5 tw:lg:max-w-115 tw:w-full tw:grid tw:grid-cols-2 tw:sm:flex tw:items-start tw:justify-between tw:gap-10">
              <div>
                <h3 className="tw:mb-6 tw:text-white tw:text-xl tw:md:text-2xl tw:font-semibold tw:leading-none!">Platform</h3>
                <ul className="tw:list-none tw:flex tw:flex-col tw:items-start tw:gap-3 tw:sm:gap-5">
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/#pricing">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/#about">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/#faq">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/#contact">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="tw:mb-6 tw:text-white tw:text-xl tw:md:text-2xl tw:font-semibold tw:leading-none!">Legal</h3>
                <ul className="tw:list-none tw:flex tw:flex-col tw:items-start tw:gap-3 tw:sm:gap-5">
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/terms">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/privacy">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/risk-disclosure">
                      Risk Disclosure
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/refund-policy">
                      Refund Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="tw:py-5 tw:md:py-8 tw:lg:py-10.5 tw:flex tw:items-center tw:justify-between tw:gap-4 tw:sm:gap-6 tw:flex-col tw:sm:flex-row">
            <p className="tw:text-paragraph_white tw:text-center tw:sm:text-left">
              © {new Date().getFullYear()} {branding.siteName}. All rights reserved.
            </p>
            {socialLinks.length > 0 && (
              <div className="tw:flex tw:items-center tw:gap-4">
                {socialLinks.map((link) => {
                  const meta = SOCIAL_PLATFORM_META[link.platform];
                  const Icon = meta.icon;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={meta.label}
                      className="tw:w-8.5 tw:h-8.5 tw:bg-white/10 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-white tw:duration-300 hover:tw:bg-primary hover:tw:text-title_white"
                    >
                      <Icon width={16} height={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
