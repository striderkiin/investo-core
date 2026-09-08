import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

export interface SystemSettings {
  id: string;
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
  depositMin: number;
  depositMax: number;
  depositFeePercent: number;
  depositEnabled: boolean;
  withdrawalMin: number;
  withdrawalMax: number;
  withdrawalFeePercent: number;
  withdrawalDailyLimit: number;
  withdrawalProcessingThreshold: number;
  withdrawalAutoProcessLimit: number;
  withdrawalEnabled: boolean;
  yieldEnabled: boolean;
  defaultDailyRate: number;
  defaultWeeklyRate: number;
  defaultMonthlyRate: number;
  emailVerificationRequired: boolean;
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  loginAttemptLimit: number;
}

interface SystemSettingsRow {
  id: string;
  site_name: string;
  support_email: string;
  support_phone: string;
  default_currency: string;
  timezone: string;
  date_format: string;
  deposit_min: number;
  deposit_max: number;
  deposit_fee_percent: number;
  deposit_enabled: boolean;
  withdrawal_min: number;
  withdrawal_max: number;
  withdrawal_fee_percent: number;
  withdrawal_daily_limit: number;
  withdrawal_processing_threshold: number;
  withdrawal_auto_process_limit: number;
  withdrawal_enabled: boolean;
  yield_enabled: boolean;
  default_daily_rate: number;
  default_weekly_rate: number;
  default_monthly_rate: number;
  email_verification_required: boolean;
  two_factor_required: boolean;
  session_timeout_minutes: number;
  login_attempt_limit: number;
}

function mapRow(row: SystemSettingsRow): SystemSettings {
  return {
    id: row.id,
    siteName: row.site_name,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    defaultCurrency: row.default_currency,
    timezone: row.timezone,
    dateFormat: row.date_format,
    depositMin: Number(row.deposit_min),
    depositMax: Number(row.deposit_max),
    depositFeePercent: Number(row.deposit_fee_percent),
    depositEnabled: row.deposit_enabled,
    withdrawalMin: Number(row.withdrawal_min),
    withdrawalMax: Number(row.withdrawal_max),
    withdrawalFeePercent: Number(row.withdrawal_fee_percent),
    withdrawalDailyLimit: Number(row.withdrawal_daily_limit),
    withdrawalProcessingThreshold: Number(row.withdrawal_processing_threshold),
    withdrawalAutoProcessLimit: Number(row.withdrawal_auto_process_limit),
    withdrawalEnabled: row.withdrawal_enabled,
    yieldEnabled: row.yield_enabled,
    defaultDailyRate: Number(row.default_daily_rate),
    defaultWeeklyRate: Number(row.default_weekly_rate),
    defaultMonthlyRate: Number(row.default_monthly_rate),
    emailVerificationRequired: row.email_verification_required,
    twoFactorRequired: row.two_factor_required,
    sessionTimeoutMinutes: row.session_timeout_minutes,
    loginAttemptLimit: row.login_attempt_limit,
  };
}

const FIELD_MAP: Record<string, keyof SystemSettingsRow> = {
  siteName: 'site_name',
  supportEmail: 'support_email',
  supportPhone: 'support_phone',
  defaultCurrency: 'default_currency',
  timezone: 'timezone',
  dateFormat: 'date_format',
  depositMin: 'deposit_min',
  depositMax: 'deposit_max',
  depositFeePercent: 'deposit_fee_percent',
  depositEnabled: 'deposit_enabled',
  withdrawalMin: 'withdrawal_min',
  withdrawalMax: 'withdrawal_max',
  withdrawalFeePercent: 'withdrawal_fee_percent',
  withdrawalDailyLimit: 'withdrawal_daily_limit',
  withdrawalProcessingThreshold: 'withdrawal_processing_threshold',
  withdrawalAutoProcessLimit: 'withdrawal_auto_process_limit',
  withdrawalEnabled: 'withdrawal_enabled',
  yieldEnabled: 'yield_enabled',
  defaultDailyRate: 'default_daily_rate',
  defaultWeeklyRate: 'default_weekly_rate',
  defaultMonthlyRate: 'default_monthly_rate',
  emailVerificationRequired: 'email_verification_required',
  twoFactorRequired: 'two_factor_required',
  sessionTimeoutMinutes: 'session_timeout_minutes',
  loginAttemptLimit: 'login_attempt_limit',
};

export function createSettingsService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async get(): Promise<SystemSettings> {
      const { data, error } = await client.from('system_settings').select('*').limit(1).single();
      if (error) throw error;
      return mapRow(data as SystemSettingsRow);
    },

    async update(updates: Partial<SystemSettings>): Promise<SystemSettings> {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        const column = FIELD_MAP[key];
        if (column) payload[column] = value;
      }

      const current = await this.get();
      const { data, error } = await client.from('system_settings').update(payload).eq('id', current.id).select('*').single();
      if (error) throw error;
      return mapRow(data as SystemSettingsRow);
    },

    async setAllYieldRatesToZero(): Promise<SystemSettings> {
      return this.update({ defaultDailyRate: 0, defaultWeeklyRate: 0, defaultMonthlyRate: 0 });
    },

    async pauseYield(): Promise<SystemSettings> {
      return this.update({ yieldEnabled: false });
    },

    async resumeYield(): Promise<SystemSettings> {
      return this.update({ yieldEnabled: true });
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
