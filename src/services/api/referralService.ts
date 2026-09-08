import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapProfileRow, mapReferralRow } from '../supabase/mappers';
import type { ProfileRow, ReferralRow } from '../supabase/mappers';
import type { Referral } from '../../types/database';

export interface ReferredUserSummary {
  id: string;
  fullName: string;
  email: string;
  investedBalance: number;
  totalBalance: number;
  joinedAt: string;
}

export function createReferralService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async listMyReferrals(userId: string): Promise<Referral[]> {
      const { data, error } = await client
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ReferralRow[]).map(mapReferralRow);
    },

    async getReferredUsers(userId: string): Promise<ReferredUserSummary[]> {
      const { data, error } = await client
        .from('referrals')
        .select('created_at, referred:profiles!referrals_referred_id_fkey(*)')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return ((data ?? []) as unknown as { created_at: string; referred: ProfileRow }[]).map((row) => {
        const profile = mapProfileRow(row.referred);
        return {
          id: profile.id,
          fullName: profile.fullName,
          email: profile.email,
          investedBalance: profile.investedBalance,
          totalBalance: profile.totalBalance,
          joinedAt: row.created_at,
        };
      });
    },

    async getTotalEarnings(userId: string): Promise<number> {
      const { data, error } = await client
        .from('referral_rewards')
        .select('amount, referral:referrals!inner(referrer_id)')
        .eq('referral.referrer_id', userId);
      if (error) throw error;
      return ((data ?? []) as { amount: number }[]).reduce((sum, row) => sum + Number(row.amount), 0);
    },

    async getAdminAnalytics() {
      const [{ data: referrals, error: referralsError }, { data: rewards, error: rewardsError }] = await Promise.all([
        client.from('referrals').select('referrer_id'),
        client.from('referral_rewards').select('amount, referral_id'),
      ]);
      if (referralsError) throw referralsError;
      if (rewardsError) throw rewardsError;

      const referrerCounts = new Map<string, number>();
      for (const row of referrals ?? []) {
        referrerCounts.set(row.referrer_id, (referrerCounts.get(row.referrer_id) ?? 0) + 1);
      }

      const totalReferrals = referrals?.length ?? 0;
      const activeReferrers = referrerCounts.size;
      const referralEarnings = (rewards ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

      const topReferrerIds = [...referrerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      let topReferrers: { profile: ProfileRow; count: number }[] = [];
      if (topReferrerIds.length > 0) {
        const { data: profiles, error: profilesError } = await client
          .from('profiles')
          .select('*')
          .in('id', topReferrerIds.map(([id]) => id));
        if (profilesError) throw profilesError;
        const profileById = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));
        topReferrers = topReferrerIds
          .map(([id, count]) => {
            const profile = profileById.get(id);
            return profile ? { profile, count } : null;
          })
          .filter((row): row is { profile: ProfileRow; count: number } => row !== null);
      }

      return {
        totalReferrals,
        activeReferrers,
        referralEarnings,
        topReferrers: topReferrers.map(({ profile, count }) => ({ user: mapProfileRow(profile), referralCount: count })),
      };
    },
  };
}

export type ReferralService = ReturnType<typeof createReferralService>;
