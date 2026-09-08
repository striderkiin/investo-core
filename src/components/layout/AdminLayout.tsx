import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { SidebarNavItem } from './Sidebar';
import { Topbar } from './Topbar';
import { usePermission } from '../../hooks/usePermission';
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
  { to: '/admin/support', label: 'Support', icon: 'bi-life-preserver', permission: 'support.read' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'bi-journal-text', permission: 'audit.read' },
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
  '/admin/support': 'Support',
  '/admin/audit-logs': 'Audit Logs',
};

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { can } = usePermission();
  const title = TITLES[location.pathname] ?? 'Admin';

  const items = ALL_NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="d-flex">
      <Sidebar brand="Investo Admin" items={items} show={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex-grow-1 min-vh-100 d-flex flex-column">
        <Topbar title={title} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="p-3 p-lg-4 flex-grow-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
