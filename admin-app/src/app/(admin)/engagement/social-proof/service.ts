import { supabase } from '@/investo/services'
import { createSocialProofService } from '../../../../../../src/services/api/socialProofService'

export const socialProofService = createSocialProofService(supabase)

export const EVENT_TYPE_LABELS: Record<string, string> = {
  new_account: 'New accounts',
  plan_activation: 'Plan activations',
  deposit_confirmed: 'Confirmed deposits',
  withdrawal_completed: 'Completed withdrawals',
  referral_joined: 'Referrals',
  milestone: 'Milestones',
}
export const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS)

export const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
