import type { AccountStatus } from '../../../src/types/database'

export const ACCOUNT_STATUSES: { value: AccountStatus; label: string; variant: string; action: string }[] = [
  { value: 'active', label: 'Active', variant: 'success', action: 'Restore' },
  { value: 'restricted', label: 'Restricted', variant: 'warning', action: 'Restrict' },
  { value: 'withdrawal_freeze', label: 'Withdrawals frozen', variant: 'warning', action: 'Freeze withdrawals' },
  { value: 'suspended', label: 'Suspended', variant: 'danger', action: 'Suspend' },
  { value: 'frozen', label: 'Frozen', variant: 'danger', action: 'Freeze account' },
]

export const accountStatus = (value: AccountStatus) => ACCOUNT_STATUSES.find((s) => s.value === value) ?? ACCOUNT_STATUSES[0]
