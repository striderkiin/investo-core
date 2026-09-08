import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapAdminAuditLogRow } from '../supabase/mappers';
import type { AdminAuditLogRow } from '../supabase/mappers';
import type { AdminAuditLog } from '../../types/database';

export function createAuditService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async list(module?: string, limit = 100): Promise<AdminAuditLog[]> {
      let query = client.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (module) query = query.eq('module', module);
      const { data, error } = await query;
      if (error) throw error;
      return (data as AdminAuditLogRow[]).map(mapAdminAuditLogRow);
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
