import { Icon } from '@iconify/react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth';

const MENU = [
  { label: 'Dashboard', to: '/', icon: 'iconoir:home-simple' },
  { label: 'Buyers', to: '/buyers', icon: 'iconoir:group' },
  { label: 'Sites', to: '/sites', icon: 'iconoir:globe' },
  { label: 'Settings', to: '/settings', icon: 'iconoir:settings' },
];

const wide = () => window.innerWidth > 1440;

// Same structure and classes as the admin panel's layout, so HQ looks the same.
const Layout = () => {
  const { signOut, session } = useAuth();
  const [open, setOpen] = useState(wide);
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    document.documentElement.setAttribute('data-startbar', 'light');
    const onResize = () => setOpen(wide());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-sidebar-size', open ? 'default' : 'collapsed');
  }, [open]);

  // On smaller screens the open menu covers the page, so close it after navigating.
  useEffect(() => {
    if (!wide()) setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="topbar d-print-none">
        <div className="container-xxl">
          <nav className="topbar-custom d-flex justify-content-between" id="topbar-custom">
            <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
              <li>
                <button className="nav-link mobile-menu-btn nav-icon" id="togglemenu" onClick={() => setOpen((v) => !v)}>
                  <Icon height={20} width={20} icon="iconoir:menu-scale" />
                </button>
              </li>
              <li className="mx-3 welcome-text">
                <h3 className="mb-0 fw-bold text-truncate">Investo HQ</h3>
              </li>
            </ul>
            <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
              <li className="d-none d-md-block text-muted me-3 fs-13">{session?.user.email}</li>
              <li>
                <button className="btn btn-light btn-sm" onClick={() => void signOut()}>
                  <Icon icon="iconoir:log-out" className="me-1" />
                  Sign out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="startbar d-print-none">
        <div className="brand">
          <Link to="/" className="logo">
            <span>
              <img src="/brand/investo-mark.png" alt="Investo" width={38} height={38} className="logo-sm" />
            </span>
            <span>
              <img src="/brand/investo-logo-light.png" alt="Investo" className="logo-lg logo-light" />
              <img src="/brand/investo-logo-dark.png" alt="Investo" className="logo-lg logo-dark" />
            </span>
          </Link>
        </div>
        <div className="startbar-menu">
          <div className="startbar-collapse" id="startbarCollapse">
            <div className="d-flex align-items-start flex-column w-100">
              <ul className="navbar-nav mb-auto w-100">
                <li className="menu-label pt-0 mt-0">
                  <span>Owner</span>
                </li>
                {MENU.map((item) => (
                  <li className="nav-item" key={item.to}>
                    <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
                      <i className="menu-icon">
                        <Icon icon={item.icon} />
                      </i>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="startbar-overlay d-print-none" onClick={() => setOpen(false)} />

      <div className="page-wrapper">
        <div className="page-content">
          <div className="container-xxl">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
