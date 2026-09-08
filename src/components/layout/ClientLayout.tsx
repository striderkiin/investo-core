import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { SidebarNavItem } from './Sidebar';
import { Topbar } from './Topbar';
import { useBranding } from '../../hooks/useBranding';
import { useMaintenanceStatus } from '../../features/operations/useMaintenanceStatus';
import { MaintenanceBanner } from '../notifications/MaintenanceBanner';
import { MaintenanceScreen } from '../../features/operations/MaintenanceScreen';
import { AnnouncementBanner } from '../notifications/AnnouncementBanner';

const NAV_ITEMS: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
  { to: '/dashboard/investments', label: 'Investments', icon: 'bi-graph-up' },
  { to: '/dashboard/deposit', label: 'Deposit', icon: 'bi-arrow-down-circle' },
  { to: '/dashboard/withdraw', label: 'Withdraw', icon: 'bi-arrow-up-circle' },
  { to: '/dashboard/transactions', label: 'Transactions', icon: 'bi-receipt' },
  { to: '/dashboard/referral', label: 'Referral', icon: 'bi-people' },
  { to: '/dashboard/notifications', label: 'Notifications', icon: 'bi-bell' },
  { to: '/dashboard/support', label: 'Support', icon: 'bi-life-preserver' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'bi-gear' },
];

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/investments': 'Investments',
  '/dashboard/deposit': 'Deposit',
  '/dashboard/withdraw': 'Withdraw',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/referral': 'Referral',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/support': 'Support',
  '/dashboard/settings': 'Settings',
};

export function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = TITLES[location.pathname] ?? 'Dashboard';
  const { branding } = useBranding();
  const { settings: maintenance } = useMaintenanceStatus();

  if (maintenance?.enabled && maintenance.restrictClientAccess) {
    return <MaintenanceScreen settings={maintenance} />;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <MaintenanceBanner />
      <AnnouncementBanner />
      <div className="d-flex flex-grow-1">
        <Sidebar
          brand={branding.siteName}
          logoUrl={branding.logoUrl}
          items={NAV_ITEMS}
          show={sidebarOpen}
          onNavigate={() => setSidebarOpen(false)}
        />
        <div className="flex-grow-1 d-flex flex-column">
          <Topbar title={title} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
          <main className="p-3 p-lg-4 flex-grow-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
