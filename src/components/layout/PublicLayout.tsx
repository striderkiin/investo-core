import { useRef } from 'react';
import { Collapse } from 'bootstrap';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { EnvironmentBadge } from './EnvironmentBadge';
import { useBranding } from '../../hooks/useBranding';
import { SvgSymbols } from '../public/securevest/SvgSymbols';

const S = '/securevest';

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
      {/* Footer — verbatim from Base/style/footer.php lines 38-121 only (lines 1-37,
          the "Ready to Scale Your Fintech Vision?" CTA banner, are skipped per the
          brief). The <footer> wrapper itself (opened at line 1, inside the skipped
          range) is recreated here since something has to hold this content.

          Recolor pass exception (flagged in the brief): every other full-bleed
          bg-secondary section maps to warm white, but the footer stays black —
          it closes the page consistently with the hero and matches Investo's
          footer treatment everywhere else. securevest-components.css pins its
          paragraph_white text back to light-on-black to match. */}
      <footer className="sv-page tw:bg-[#080808] tw:pt-14 tw:md:pt-20 tw:lg:pt-23 tw:relative tw:z-1">
        <div className="tw:container">
          <div className="tw:flex tw:justify-between tw:lg:gap-10 tw:border-y tw:border-white/10 tw:flex-col tw:lg:flex-row">
            <div className="tw:py-10 tw:lg:py-12.5 tw:lg:max-w-87.5 tw:w-full tw:flex tw:flex-col tw:sm:flex-row tw:lg:flex-col tw:justify-between tw:gap-6 tw:sm:items-end">
              <div className="tw:sm:max-w-100 tw:lg:mx-none tw:w-full">
                <img className="tw:w-[70%] tw:md:w-auto tw:max-[350px]" src={`${S}/img/footer-logo.svg`} alt="footer-logo" />
                <p className="tw:mt-4 tw:sm:mt-6 tw:md:mt-8 tw:text-paragraph_white">
                  Streamline your global operations, automate compliance, and drive financial innovation with our all-in-one institutional-grade platform.
                </p>
              </div>
              <form className="tw:relative tw:w-full tw:max-w-95 tw:sm:max-w-100 tw:lg:max-w-none" id="footer-newsletter-form" onSubmit={(e) => e.preventDefault()} noValidate>
                <input
                  className="tw:w-full tw:h-12 tw:border tw:border-paragraph_white tw:rounded-[100px] tw:p-4 tw:pr-11 tw:text-white tw:duration-300 focus:tw:border-primary placeholder:tw:text-paragraph_white tw:outline-0 focus:tw:bg-white/10 focus:tw:backdrop-blur-2xl"
                  type="email"
                  id="newsletter-email"
                  placeholder="Enter your email"
                  required
                />
                <button type="submit" className="tw:w-8 tw:h-8 tw:bg-primary tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-title_white tw:absolute tw:right-2 tw:top-2">
                  <svg className="tw:w-5 tw:h-4 tw:fill-current">
                    <use href="#tabArrow" />
                  </svg>
                </button>
              </form>
            </div>
            <div className="tw:w-full tw:lg:w-px tw:h-px tw:lg:h-auto tw:bg-white/10" />
            <div className="tw:py-10 tw:lg:py-12.5 tw:lg:max-w-161.25 tw:w-full tw:grid tw:grid-cols-2 tw:sm:flex tw:items-start tw:justify-between tw:gap-10">
              <div>
                <h3 className="tw:mb-6 tw:text-white tw:text-xl tw:md:text-2xl tw:font-semibold tw:leading-none!">Main</h3>
                <ul className="tw:flex tw:flex-col tw:items-start tw:gap-3 tw:sm:gap-5">
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/">
                      Wealth Insights
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/">
                      Digital-First Bank
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/">
                      Institutional Trust Bank
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/#contact">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" to="/#pricing">
                      Service
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="tw:mb-6 tw:text-white tw:text-xl tw:md:text-2xl tw:font-semibold tw:leading-none!">Links</h3>
                <ul className="tw:flex tw:flex-col tw:items-start tw:gap-3 tw:sm:gap-5">
                  <li>
                    <a className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" href="#">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" href="#">
                      Blog Details
                    </a>
                  </li>
                  <li>
                    <a className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" href="#">
                      Case Studies
                    </a>
                  </li>
                  <li>
                    <a className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:block" href="#">
                      Case Study Details
                    </a>
                  </li>
                </ul>
              </div>
              <div className="tw:col-span-2 tw:sm:max-w-57.5 tw:w-full">
                <h3 className="tw:mb-6 tw:text-white tw:text-xl tw:md:text-2xl tw:font-semibold tw:leading-none!">Contact</h3>
                <ul className="tw:flex tw:flex-col tw:items-start tw:gap-3 tw:sm:gap-5">
                  <li>
                    <a className="tw:text-paragraph_white tw:leading-snug tw:duration-300 hover:tw:text-primary tw:flex tw:items-start tw:gap-2.5" href="https://www.google.com/maps" target="_blank" rel="noreferrer">
                      <img className="tw:w-4" src={`${S}/img/footer/map.svg`} alt="map" />
                      <span className="tw:flex-1">55 Main Street, 2nd block Melbourne, Australia</span>
                    </a>
                  </li>
                  <li>
                    <a className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:flex tw:items-center tw:gap-2.5" href="mailto:support@gmail.com">
                      <img className="tw:w-4" src={`${S}/img/footer/mail.svg`} alt="mail" />
                      <span className="tw:flex-1">support@gmail.com</span>
                    </a>
                  </li>
                  <li>
                    <a className="tw:text-paragraph_white tw:leading-none tw:duration-300 hover:tw:text-primary tw:flex tw:items-center tw:gap-2.5" href="tel:+0001234455">
                      <img className="tw:w-4" src={`${S}/img/footer/phone.svg`} alt="phone" />
                      <span className="tw:flex-1">+0001234455</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="tw:py-5 tw:md:py-8 tw:lg:py-10.5 tw:flex tw:items-center tw:justify-between tw:gap-4 tw:sm:gap-6 tw:flex-col tw:sm:flex-row">
            <p className="tw:text-paragraph_white tw:text-center tw:sm:text-left">
              © {new Date().getFullYear()} SecureVest. Developed by{' '}
              <a href="https://shreethemes.in/" target="_blank" rel="noreferrer" className="tw:text-paragraph_white">
                Shreethemes
              </a>
              .
            </p>
            <div className="tw:flex tw:items-center tw:gap-4">
              <a href="#" className="tw:w-8.5 tw:h-8.5 tw:bg-white/10 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-white tw:duration-300 hover:tw:bg-primary hover:tw:text-title_white" rel="noopener noreferrer" aria-label="Pinterest">
                <svg className="tw:w-4 tw:h-4 tw:fill-current">
                  <use href="#pinterest" />
                </svg>
              </a>
              <a href="#" className="tw:w-8.5 tw:h-8.5 tw:bg-white/10 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-white tw:duration-300 hover:tw:bg-primary hover:tw:text-title_white" rel="noopener noreferrer" aria-label="Vimeo">
                <svg className="tw:w-4 tw:h-4 tw:fill-current">
                  <use href="#vimeo" />
                </svg>
              </a>
              <a href="#" className="tw:w-8.5 tw:h-8.5 tw:bg-white/10 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-white tw:duration-300 hover:tw:bg-primary hover:tw:text-title_white" rel="noopener noreferrer" aria-label="Twitter">
                <svg className="tw:w-4 tw:h-4 tw:fill-current">
                  <use href="#twitter" />
                </svg>
              </a>
              <a href="#" className="tw:w-8.5 tw:h-8.5 tw:bg-white/10 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-white tw:duration-300 hover:tw:bg-primary hover:tw:text-title_white" rel="noopener noreferrer" aria-label="Facebook">
                <svg className="tw:w-4 tw:h-4 tw:fill-current">
                  <use href="#facebook" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
