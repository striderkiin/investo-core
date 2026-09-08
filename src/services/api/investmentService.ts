import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapInvestmentPlanRow, mapInvestmentRow } from '../supabase/mappers';
import type { InvestmentPlanRow, InvestmentRow } from '../supabase/mappers';
import type { Investment, InvestmentPlan } from '../../types/database';

export function createInvestmentService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async listPlans(): Promise<InvestmentPlan[]> {
      const { data, error } = await client.from('investment_plans').select('*').order('min_amount', { ascending: true });
      if (error) throw error;
      return (data as InvestmentPlanRow[]).map(mapInvestmentPlanRow);
    },

    async getPlan(planId: string): Promise<InvestmentPlan | null> {
      const { data, error } = await client.from('investment_plans').select('*').eq('id', planId).maybeSingle();
      if (error) throw error;
      return data ? mapInvestmentPlanRow(data as InvestmentPlanRow) : null;
    },

    async createPlan(input: {
      name: string;
      description: string;
      minAmount: number;
      maxAmount: number;
      rate: number;
      rateType: InvestmentPlan['rateType'];
      durationDays: number;
    }): Promise<InvestmentPlan> {
      const { data, error } = await client
        .from('investment_plans')
        .insert({
          name: input.name,
          description: input.description,
          min_amount: input.minAmount,
          max_amount: input.maxAmount,
          rate: input.rate,
          rate_type: input.rateType,
          duration_days: input.durationDays,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapInvestmentPlanRow(data as InvestmentPlanRow);
    },

    async updatePlan(
      planId: string,
      updates: Partial<{
        name: string;
        description: string;
        minAmount: number;
        maxAmount: number;
        rate: number;
        rateType: InvestmentPlan['rateType'];
        durationDays: number;
        status: InvestmentPlan['status'];
      }>
    ): Promise<InvestmentPlan> {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.minAmount !== undefined) payload.min_amount = updates.minAmount;
      if (updates.maxAmount !== undefined) payload.max_amount = updates.maxAmount;
      if (updates.rate !== undefined) payload.rate = updates.rate;
      if (updates.rateType !== undefined) payload.rate_type = updates.rateType;
      if (updates.durationDays !== undefined) payload.duration_days = updates.durationDays;
      if (updates.status !== undefined) payload.status = updates.status;

      const { data, error } = await client.from('investment_plans').update(payload).eq('id', planId).select('*').single();
      if (error) throw error;
      return mapInvestmentPlanRow(data as InvestmentPlanRow);
    },

    async deletePlan(planId: string): Promise<void> {
      const { error } = await client.from('investment_plans').delete().eq('id', planId);
      if (error) throw error;
    },

    async listMyInvestments(userId: string): Promise<Investment[]> {
      const { data, error } = await client
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as InvestmentRow[]).map(mapInvestmentRow);
    },

    async listAllInvestments(): Promise<Investment[]> {
      const { data, error } = await client.from('investments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as InvestmentRow[]).map(mapInvestmentRow);
    },

    async invest(planId: string, amount: number): Promise<Investment> {
      const { data, error } = await client.rpc('create_investment', { p_plan_id: planId, p_amount: amount });
      if (error) throw error;
      return mapInvestmentRow(data as InvestmentRow);
    },
  };
}

export type InvestmentService = ReturnType<typeof createInvestmentService>;
