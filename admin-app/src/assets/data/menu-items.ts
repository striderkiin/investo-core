import type { MenuItemType } from '@/types/menu'

// Sections not yet rebuilt in this panel carry a "soon" badge. Ones with a
// template page link to it; the rest stay inert until their stage ships.
const SOON = { text: 'soon', variant: 'secondary' }

export const MENU_ITEMS: MenuItemType[] = [
  { key: 'main', label: 'Main', isTitle: true },
  { key: 'dashboard', icon: 'iconoir:home-simple', label: 'Dashboard', url: '/dashboard' },

  { key: 'customers-title', label: 'Customers', isTitle: true },
  { key: 'customers', icon: 'iconoir:group', label: 'Customers', url: '/customers', badge: SOON, permission: 'users.read' },
  { key: 'kyc', icon: 'iconoir:user-badge-check', label: 'KYC Reviews', url: '#', badge: SOON, permission: 'compliance.manage' },

  { key: 'money-title', label: 'Money', isTitle: true },
  { key: 'deposits', icon: 'iconoir:download-circle', label: 'Deposits', url: '/deposits', badge: SOON, permission: 'deposits.read' },
  { key: 'withdrawals', icon: 'iconoir:upload-square', label: 'Withdrawals', url: '#', badge: SOON, permission: 'withdrawals.read' },
  { key: 'investments', icon: 'iconoir:graph-up', label: 'Investments', url: '#', badge: SOON, permission: 'investments.read' },
  { key: 'plans', icon: 'iconoir:page-star', label: 'Investment Plans', url: '/plans', badge: SOON, permission: 'investments.manage' },
  { key: 'treasury', icon: 'iconoir:bank', label: 'Treasury', url: '#', badge: SOON, permission: 'treasury.read' },
  { key: 'referrals', icon: 'iconoir:share-android', label: 'Referrals', url: '#', badge: SOON, permission: 'referrals.read' },

  { key: 'engage-title', label: 'Support & Engagement', isTitle: true },
  { key: 'support', icon: 'iconoir:chat-bubble', label: 'Support Chat', url: '/support', badge: SOON, permission: 'support.read' },
  { key: 'contact-messages', icon: 'iconoir:mail', label: 'Contact Messages', url: '#', badge: SOON, permission: 'support.read' },
  { key: 'notifications', icon: 'iconoir:bell', label: 'Notifications', url: '/notifications', badge: SOON, permission: 'announcements.manage' },
  { key: 'social-proof', icon: 'iconoir:megaphone', label: 'Social Proof', url: '#', badge: SOON, permission: 'social_proof.manage' },
  { key: 'market', icon: 'iconoir:candlestick-chart', label: 'Market Controls', url: '#', badge: SOON, permission: 'market.read' },

  { key: 'system-title', label: 'System', isTitle: true },
  {
    key: 'system',
    icon: 'iconoir:settings',
    label: 'System',
    children: [
      { key: 'admins', label: 'Admins', url: '#', parentKey: 'system', badge: SOON, permission: 'admins.manage' },
      { key: 'security', label: 'Security Center', url: '#', parentKey: 'system', badge: SOON, permission: 'security.manage' },
      { key: 'audit-logs', label: 'Audit Logs', url: '#', parentKey: 'system', badge: SOON, permission: 'audit.read' },
      { key: 'integrations', label: 'Integrations', url: '#', parentKey: 'system', badge: SOON, permission: 'integrations.manage' },
      { key: 'branding', label: 'Branding', url: '#', parentKey: 'system', badge: SOON, permission: 'branding.manage' },
      { key: 'settings', label: 'Settings', url: '#', parentKey: 'system', badge: SOON, permission: 'settings.manage' },
      { key: 'maintenance', label: 'Maintenance', url: '#', parentKey: 'system', badge: SOON, permission: 'settings.manage' },
      { key: 'sandbox', label: 'Sandbox Testing', url: '#', parentKey: 'system', badge: SOON, permission: 'integrations.manage' },
      { key: 'activity', label: 'Activity Simulation', url: '#', parentKey: 'system', badge: SOON, permission: 'settings.manage' },
    ],
  },
]
