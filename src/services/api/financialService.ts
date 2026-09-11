import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export interface FinancialOverview {
  totalUserBalances: number;
  totalInvested: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  treasuryBalance: number;
  userLiabilities: number;
  availablePlatformFunds: number;
  platformRevenue: number;
}

export interface PortfolioSummary {
  totalBalance: number;
  availableBalance: number;
  totalInvested: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  bonusBalance: number;
}

export function createFinancialService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async getOverview(): Promise<FinancialOverview> {
      const [{ data: profiles, error: profilesError }, { data: deposits, error: depositsError }, { data: withdrawals, error: withdrawalsError }, { data: treasury, error: treasuryError }] =
        await Promise.all([
          client.from('profiles').select('total_balance, available_balance, invested_balance'),
          client.from('deposits').select('amount, status'),
          client.from('withdrawals').select('amount, fee, status'),
          client.from('treasury_accounts').select('balance, reserve_balance'),
        ]);

      if (profilesError) throw profilesError;
      if (depositsError) throw depositsError;
      if (withdrawalsError) throw withdrawalsError;
      if (treasuryError) throw treasuryError;

      const totalUserBalances = (profiles ?? []).reduce((sum, p) => sum + Number(p.total_balance), 0);
      const totalInvested = (profiles ?? []).reduce((sum, p) => sum + Number(p.invested_balance), 0);
      const totalDeposits = (deposits ?? [])
        .filter((d) => d.status === 'completed')
        .reduce((sum, d) => sum + Number(d.amount), 0);
      const completedWithdrawals = (withdrawals ?? []).filter((w) => w.status === 'completed');
      const totalWithdrawals = completedWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
      const platformRevenue = completedWithdrawals.reduce((sum, w) => sum + Number(w.fee), 0);
      const pendingWithdrawals = (withdrawals ?? [])
        .filter((w) => ['pending', 'review', 'processing'].includes(w.status))
        .reduce((sum, w) => sum + Number(w.amount), 0);
      const treasuryBalance = (treasury ?? []).reduce((sum, t) => sum + Number(t.balance) + Number(t.reserve_balance), 0);

      return {
        totalUserBalances,
        totalInvested,
        totalDeposits,
        totalWithdrawals,
        pendingWithdrawals,
        treasuryBalance,
        userLiabilities: totalUserBalances,
        availablePlatformFunds: treasuryBalance - totalUserBalances,
        platformRevenue,
      };
    },

    async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
      const [{ data: profile, error: profileError }, { data: investments, error: investmentsError }, { data: withdrawals, error: withdrawalsError }] =
        await Promise.all([
          client.from('profiles').select('total_balance, available_balance, invested_balance, bonus_balance').eq('id', userId).single(),
          client.from('investments').select('current_earnings').eq('user_id', userId),
          client.from('withdrawals').select('amount, status').eq('user_id', userId),
        ]);

      if (profileError) throw profileError;
      if (investmentsError) throw investmentsError;
      if (withdrawalsError) throw withdrawalsError;

      const totalEarnings = (investments ?? []).reduce((sum, i) => sum + Number(i.current_earnings), 0);
      const pendingWithdrawals = (withdrawals ?? [])
        .filter((w) => ['pending', 'review', 'processing'].includes(w.status))
        .reduce((sum, w) => sum + Number(w.amount), 0);

      return {
        totalBalance: Number(profile.total_balance),
        availableBalance: Number(profile.available_balance),
        totalInvested: Number(profile.invested_balance),
        totalEarnings,
        pendingWithdrawals,
        bonusBalance: Number(profile.bonus_balance),
      };
    },
  };
}

export type FinancialService = ReturnType<typeof createFinancialService>;
