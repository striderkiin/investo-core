import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { SidebarNavItem } from './Sidebar';
import { Topbar } from './Topbar';
import { usePermission } from '../../hooks/usePermission';
import { useBranding } from '../../hooks/useBranding';
import { MaintenanceBanner } from '../notifications/MaintenanceBanner';
import { AnnouncementBanner } from '../notifications/AnnouncementBanner';
import type { Permission } from '../../types/roles';

const ALL_NAV_ITEMS: (SidebarNavItem & { permission?: Permission })[] = [
  { to: '/admin', label: 'Overview', icon: 'bi-grid-1x2', end: true },
  { to: '/admin/financial', label: 'Financial Center', icon: 'bi-bank', permission: 'treasury.read' },
  { to: '/admin/market', label: 'Market Controls', icon: 'bi-graph-up-arrow', permission: 'market.read' },
  { to: '/admin/users', label: 'Users', icon: 'bi-people', permission: 'users.read' },
  { to: '/admin/investments', label: 'Investments', icon: 'bi-piggy-bank', permission: 'investments.read' },
  { to: '/admin/deposits', label: 'Deposits', icon: 'bi-arrow-down-circle', permission: 'deposits.read' },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: 'bi-arrow-up-circle', permission: 'withdrawals.read' },
  { to: '/admin/transactions', label: 'Transactions', icon: 'bi-receipt', permission: 'transactions.read' },
  { to: '/admin/treasury', label: 'Treasury', icon: 'bi-safe', permission: 'treasury.read' },
  { to: '/admin/referrals', label: 'Referrals', icon: 'bi-diagram-3', permission: 'referrals.read' },
  { to: '/admin/announcements', label: 'Announcements', icon: 'bi-megaphone', permission: 'announcements.manage' },
  { to: '/admin/social-proof', label: 'Social Proof', icon: 'bi-emoji-smile', permission: 'social_proof.manage' },
  { to: '/admin/maintenance', label: 'Maintenance', icon: 'bi-cone-striped', permission: 'settings.manage' },
  { to: '/admin/activity', label: 'Activity', icon: 'bi-activity', permission: 'settings.manage' },
  { to: '/admin/support', label: 'Support', icon: 'bi-life-preserver', permission: 'support.read' },
  { to: '/admin/white-label', label: 'White Label', icon: 'bi-tags', permission: 'white_label.manage' },
  { to: '/admin/branding', label: 'Branding', icon: 'bi-palette', permission: 'branding.manage' },
  { to: '/admin/integrations', label: 'Integrations', icon: 'bi-plug', permission: 'integrations.manage' },
  { to: '/admin/sandbox-testing', label: 'Sandbox Testing', icon: 'bi-hdd-network', permission: 'integrations.manage' },
  { to: '/admin/security', label: 'Security', icon: 'bi-shield-lock', permission: 'security.manage' },
  { to: '/admin/admins', label: 'Admins & Roles', icon: 'bi-person-badge', permission: 'admins.manage' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'bi-journal-text', permission: 'audit.read' },
  { to: '/admin/settings', label: 'System Settings', icon: 'bi-gear', permission: 'settings.manage' },
];

const TITLES: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/financial': 'Financial Center',
  '/admin/market': 'Market Controls',
  '/admin/users': 'Users',
  '/admin/investments': 'Investments',
  '/admin/deposits': 'Deposits',
  '/admin/withdrawals': 'Withdrawals',
  '/admin/transactions': 'Transactions',
  '/admin/treasury': 'Treasury',
  '/admin/referrals': 'Referrals',
  '/admin/announcements': 'Announcements',
  '/admin/social-proof': 'Social Proof & Activity',
  '/admin/maintenance': 'Maintenance',
  '/admin/activity': 'Activity & Simulation',
  '/admin/support': 'Support',
  '/admin/white-label': 'White Label',
  '/admin/branding': 'Branding',
  '/admin/integrations': 'Integrations',
  '/admin/sandbox-testing': 'Sandbox Testing',
  '/admin/security': 'Security',
  '/admin/admins': 'Admins & Roles',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/settings': 'System Settings',
};

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { can } = usePermission();
  const { branding } = useBranding();
  const title = TITLES[location.pathname] ?? 'Admin';

  const items = ALL_NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="d-flex flex-column min-vh-100">
      <MaintenanceBanner />
      <AnnouncementBanner />
      <div className="d-flex flex-grow-1">
        <Sidebar
          brand={`${branding.siteName} Admin`}
          logoUrl={branding.logoUrl}
          items={items}
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
