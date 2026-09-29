import type { Permission, RoleName } from '../../../src/types/roles'

const ROLE_LABELS: Record<RoleName, string> = {
  super_admin: 'Super Admin',
  finance_admin: 'Finance Admin',
  support_admin: 'Support Admin',
  operations_admin: 'Operations Admin',
  demo_admin: 'Demo Admin',
  client: 'Customer',
}

export const roleLabel = (role: RoleName) => ROLE_LABELS[role] ?? role

const PERMISSION_LABELS: Record<Permission, string> = {
  'users.read': 'View customers',
  'users.write': 'Edit customers',
  'users.adjust_balance': 'Adjust balances',
  'users.manage_status': 'Suspend customers',
  'deposits.read': 'View deposits',
  'deposits.manage': 'Approve deposits',
  'withdrawals.read': 'View withdrawals',
  'withdrawals.approve': 'Approve withdrawals',
  'transactions.read': 'View transactions',
  'treasury.read': 'View treasury',
  'treasury.manage': 'Manage treasury',
  'investments.read': 'View investments',
  'investments.manage': 'Manage plans',
  'market.read': 'View market',
  'market.manage': 'Control market',
  'referrals.read': 'View referrals',
  'support.read': 'View support',
  'support.manage': 'Answer support',
  'notifications.send': 'Send notifications',
  'announcements.manage': 'Announcements',
  'social_proof.manage': 'Social proof',
  'branding.manage': 'Branding',
  'white_label.manage': 'White label',
  'integrations.manage': 'Integrations',
  'integrations.read_secrets': 'View integration secrets',
  'compliance.manage': 'KYC reviews',
  'security.manage': 'Security center',
  'admins.manage': 'Manage admins',
  'roles.manage': 'Manage roles',
  'audit.read': 'Audit logs',
  'settings.manage': 'System settings',
  'environment.manage': 'Environment',
}

export const permissionLabel = (permission: Permission) => PERMISSION_LABELS[permission] ?? permission
