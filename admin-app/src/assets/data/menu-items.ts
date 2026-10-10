import type { MenuItemType } from '@/types/menu'

export const MENU_ITEMS: MenuItemType[] = [
  { key: 'main', label: 'Main', isTitle: true },
  { key: 'dashboard', icon: 'iconoir:home-simple', label: 'Dashboard', url: '/dashboard' },

  { key: 'customers-title', label: 'Customers', isTitle: true },
  { key: 'customers', icon: 'iconoir:group', label: 'Customers', url: '/customers', permission: 'users.read' },
  { key: 'statements', icon: 'iconoir:page', label: 'Statements', url: '/statement', permission: 'users.read' },
  { key: 'kyc', icon: 'iconoir:user-badge-check', label: 'KYC Reviews', url: '/kyc', permission: 'compliance.manage' },

  { key: 'money-title', label: 'Money', isTitle: true },
  { key: 'deposits', icon: 'iconoir:download-circle', label: 'Deposits', url: '/deposits', permission: 'deposits.read' },
  { key: 'withdrawals', icon: 'iconoir:upload-square', label: 'Withdrawals', url: '/withdrawals', permission: 'withdrawals.read' },
  { key: 'investments', icon: 'iconoir:graph-up', label: 'Investments', url: '/investments', permission: 'investments.read' },
  { key: 'transactions', icon: 'iconoir:list', label: 'Transactions', url: '/transactions', permission: 'transactions.read' },
  { key: 'plans', icon: 'iconoir:page-star', label: 'Investment Plans', url: '/plans', permission: 'investments.manage' },
  { key: 'treasury', icon: 'iconoir:bank', label: 'Treasury', url: '/treasury', permission: 'treasury.read' },
  { key: 'referrals', icon: 'iconoir:share-android', label: 'Referrals', url: '/referrals', permission: 'referrals.read' },

  { key: 'engage-title', label: 'Support & Engagement', isTitle: true },
  { key: 'support', icon: 'iconoir:chat-bubble', label: 'Support Chat', url: '/support', permission: 'support.read' },
  { key: 'contact-messages', icon: 'iconoir:mail', label: 'Contact Messages', url: '/contact-messages', permission: 'support.read' },
  { key: 'notifications', icon: 'iconoir:bell', label: 'Notifications', url: '/notifications', permission: ['notifications.send', 'announcements.manage'] },
  { key: 'social-proof', icon: 'iconoir:megaphone', label: 'Social Proof', url: '/social-proof', permission: 'social_proof.manage' },
  { key: 'market', icon: 'iconoir:candlestick-chart', label: 'Market Controls', url: '/market', permission: 'market.read' },

  { key: 'system-title', label: 'System', isTitle: true },
  {
    key: 'system',
    icon: 'iconoir:settings',
    label: 'System',
    children: [
      { key: 'setup', label: 'Setup Checklist', url: '/system/setup', parentKey: 'system', permission: 'settings.manage' },
      { key: 'admins', label: 'Admins', url: '/system/admins', parentKey: 'system', permission: 'admins.manage' },
      { key: 'security', label: 'Security Center', url: '/system/security', parentKey: 'system', permission: 'security.manage' },
      { key: 'audit-logs', label: 'Audit Logs', url: '/system/audit-logs', parentKey: 'system', permission: 'audit.read' },
      { key: 'integrations', label: 'Integrations', url: '/system/integrations', parentKey: 'system', permission: 'integrations.manage' },
      { key: 'branding', label: 'Branding', url: '/system/branding', parentKey: 'system', permission: ['branding.manage', 'white_label.manage'] },
      { key: 'website', label: 'Landing Page', url: '/system/website', parentKey: 'system', permission: 'branding.manage' },
      { key: 'settings', label: 'Settings', url: '/system/settings', parentKey: 'system', permission: 'settings.manage' },
      { key: 'maintenance', label: 'Maintenance', url: '/system/maintenance', parentKey: 'system', permission: 'settings.manage' },
      { key: 'sandbox', label: 'Sandbox Testing', url: '/system/sandbox', parentKey: 'system', permission: 'integrations.manage' },
    ],
  },
]
