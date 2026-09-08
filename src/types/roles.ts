export type RoleName = 'super_admin' | 'finance_admin' | 'support_admin' | 'operations_admin' | 'client';

export type Permission =
  | 'users.read'
  | 'users.write'
  | 'users.adjust_balance'
  | 'users.manage_status'
  | 'deposits.read'
  | 'deposits.manage'
  | 'withdrawals.read'
  | 'withdrawals.approve'
  | 'transactions.read'
  | 'treasury.read'
  | 'treasury.manage'
  | 'investments.read'
  | 'investments.manage'
  | 'market.read'
  | 'market.manage'
  | 'referrals.read'
  | 'support.read'
  | 'support.manage'
  | 'notifications.send'
  | 'announcements.manage'
  | 'branding.manage'
  | 'white_label.manage'
  | 'integrations.manage'
  | 'integrations.read_secrets'
  | 'compliance.manage'
  | 'security.manage'
  | 'admins.manage'
  | 'roles.manage'
  | 'audit.read'
  | 'settings.manage'
  | 'environment.manage';

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  super_admin: [
    'users.read',
    'users.write',
    'users.adjust_balance',
    'users.manage_status',
    'deposits.read',
    'deposits.manage',
    'withdrawals.read',
    'withdrawals.approve',
    'transactions.read',
    'treasury.read',
    'treasury.manage',
    'investments.read',
    'investments.manage',
    'market.read',
    'market.manage',
    'referrals.read',
    'support.read',
    'support.manage',
    'notifications.send',
    'announcements.manage',
    'branding.manage',
    'white_label.manage',
    'integrations.manage',
    'integrations.read_secrets',
    'compliance.manage',
    'security.manage',
    'admins.manage',
    'roles.manage',
    'audit.read',
    'settings.manage',
    'environment.manage',
  ],
  finance_admin: [
    'users.read',
    'deposits.read',
    'deposits.manage',
    'withdrawals.read',
    'withdrawals.approve',
    'transactions.read',
    'treasury.read',
    'investments.read',
  ],
  support_admin: ['users.read', 'transactions.read', 'support.read', 'support.manage', 'notifications.send'],
  operations_admin: ['announcements.manage', 'investments.read', 'investments.manage', 'branding.manage', 'market.read'],
  client: [],
};

export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(role: RoleName): boolean {
  return role !== 'client';
}

export const ADMIN_NAV_PERMISSIONS: Record<string, Permission | null> = {
  overview: null,
  financial: 'treasury.read',
  market: 'market.read',
  users: 'users.read',
  investments: 'investments.read',
  deposits: 'deposits.read',
  withdrawals: 'withdrawals.read',
  transactions: 'transactions.read',
  treasury: 'treasury.read',
  referrals: 'referrals.read',
  support: 'support.read',
  admins: 'admins.manage',
  audit: 'audit.read',
  settings: 'settings.manage',
};
