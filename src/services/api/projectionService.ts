import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import {
  mapProjectionRow,
  type CustomerProjection,
  type CustomerProjectionRow,
  type ProjectionChart,
  type ProjectionMode,
  type ProjectionParams,
} from '../../shared/projection';

export function createProjectionService(client: SupabaseClient = getSupabaseClient()) {
  return {
    /** Admins: every projection saved for a customer, on or off. Customers: only their live ones (RLS). */
    async listForUser(userId: string): Promise<CustomerProjection[]> {
      const { data, error } = await client.from('customer_projections').select('*').eq('user_id', userId);
      if (error) throw error;
      return (data as CustomerProjectionRow[]).map(mapProjectionRow);
    },

    /** The signed-in customer's live projection for one chart, if an admin has switched it on. */
    async getMine(userId: string, chart: ProjectionChart): Promise<CustomerProjection | null> {
      const { data, error } = await client
        .from('customer_projections')
        .select('*')
        .eq('user_id', userId)
        .eq('chart', chart)
        .eq('enabled', true)
        .maybeSingle();
      if (error) throw error;
      return data ? mapProjectionRow(data as CustomerProjectionRow) : null;
    },

    async set(userId: string, chart: ProjectionChart, enabled: boolean, mode: ProjectionMode, params?: ProjectionParams): Promise<CustomerProjection> {
      const { data, error } = await client.rpc('admin_set_projection', {
        p_user_id: userId,
        p_chart: chart,
        p_enabled: enabled,
        p_mode: mode,
        p_params: params ?? null,
      });
      if (error) throw error;
      return mapProjectionRow(data as CustomerProjectionRow);
    },
  };
}
