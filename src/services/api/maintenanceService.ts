import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export interface MaintenanceSettings {
  id: string;
  enabled: boolean;
  pauseYield: boolean;
  disableWithdrawals: boolean;
  disableDeposits: boolean;
  showBanner: boolean;
  restrictClientAccess: boolean;
  allowAdminAccess: boolean;
  bannerTitle: string;
  bannerMessage: string;
}

interface MaintenanceSettingsRow {
  id: string;
  enabled: boolean;
  pause_yield: boolean;
  disable_withdrawals: boolean;
  disable_deposits: boolean;
  show_banner: boolean;
  restrict_client_access: boolean;
  allow_admin_access: boolean;
  banner_title: string;
  banner_message: string;
}

function mapRow(row: MaintenanceSettingsRow): MaintenanceSettings {
  return {
    id: row.id,
    enabled: row.enabled,
    pauseYield: row.pause_yield,
    disableWithdrawals: row.disable_withdrawals,
    disableDeposits: row.disable_deposits,
    showBanner: row.show_banner,
    restrictClientAccess: row.restrict_client_access,
    allowAdminAccess: row.allow_admin_access,
    bannerTitle: row.banner_title,
    bannerMessage: row.banner_message,
  };
}

const FIELD_MAP: Record<keyof Omit<MaintenanceSettings, 'id'>, keyof MaintenanceSettingsRow> = {
  enabled: 'enabled',
  pauseYield: 'pause_yield',
  disableWithdrawals: 'disable_withdrawals',
  disableDeposits: 'disable_deposits',
  showBanner: 'show_banner',
  restrictClientAccess: 'restrict_client_access',
  allowAdminAccess: 'allow_admin_access',
  bannerTitle: 'banner_title',
  bannerMessage: 'banner_message',
};

export function createMaintenanceService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async get(): Promise<MaintenanceSettings> {
      const { data, error } = await client.from('maintenance_settings').select('*').limit(1).single();
      if (error) throw error;
      return mapRow(data as MaintenanceSettingsRow);
    },

    async update(updates: Partial<Omit<MaintenanceSettings, 'id'>>): Promise<MaintenanceSettings> {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        const column = FIELD_MAP[key as keyof Omit<MaintenanceSettings, 'id'>];
        if (column) payload[column] = value;
      }
      const current = await this.get();
      const { data, error } = await client.from('maintenance_settings').update(payload).eq('id', current.id).select('*').single();
      if (error) throw error;
      return mapRow(data as MaintenanceSettingsRow);
    },
  };
}

export type MaintenanceService = ReturnType<typeof createMaintenanceService>;
