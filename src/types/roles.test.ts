import { describe, expect, it } from 'vitest';
import { isAdminRole, roleHasPermission } from './roles';

describe('role permissions', () => {
  it('grants super_admin every permission', () => {
    expect(roleHasPermission('super_admin', 'integrations.read_secrets')).toBe(true);
    expect(roleHasPermission('super_admin', 'roles.manage')).toBe(true);
  });

  it('grants finance_admin financial permissions but not admin management', () => {
    expect(roleHasPermission('finance_admin', 'withdrawals.approve')).toBe(true);
    expect(roleHasPermission('finance_admin', 'deposits.manage')).toBe(true);
    expect(roleHasPermission('finance_admin', 'admins.manage')).toBe(false);
    expect(roleHasPermission('finance_admin', 'integrations.read_secrets')).toBe(false);
  });

  it('grants support_admin support/user-read permissions but never balance or secrets', () => {
    expect(roleHasPermission('support_admin', 'support.manage')).toBe(true);
    expect(roleHasPermission('support_admin', 'users.read')).toBe(true);
    expect(roleHasPermission('support_admin', 'users.adjust_balance')).toBe(false);
    expect(roleHasPermission('support_admin', 'withdrawals.approve')).toBe(false);
    expect(roleHasPermission('support_admin', 'integrations.read_secrets')).toBe(false);
  });

  it('grants operations_admin branding/announcements/plan management', () => {
    expect(roleHasPermission('operations_admin', 'announcements.manage')).toBe(true);
    expect(roleHasPermission('operations_admin', 'branding.manage')).toBe(true);
    expect(roleHasPermission('operations_admin', 'investments.manage')).toBe(true);
    expect(roleHasPermission('operations_admin', 'users.adjust_balance')).toBe(false);
  });

  it('grants client no admin permissions at all', () => {
    expect(roleHasPermission('client', 'users.read')).toBe(false);
    expect(roleHasPermission('client', 'market.read')).toBe(false);
  });

  it('classifies every non-client role as an admin role', () => {
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('finance_admin')).toBe(true);
    expect(isAdminRole('support_admin')).toBe(true);
    expect(isAdminRole('operations_admin')).toBe(true);
    expect(isAdminRole('client')).toBe(false);
  });
});
