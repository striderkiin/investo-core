import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { mapMarketControlPresetRow, mapMarketDataRow, mapMarketSettingsRow } from '../supabase/mappers';
import type { MarketControlPresetRow, MarketDataRow, MarketSettingsRow } from '../supabase/mappers';
import type { MarketControlPreset, MarketDataPoint, MarketSettings, MarketTrend, MarketVolatility } from '../../types/database';
import { APP_ENVIRONMENT } from '../../config/env';
import * as engine from '../../features/market/marketEngine';
import type { MarketControlKey } from '../../features/market/marketEngine';

function toRow(state: MarketSettings): Partial<MarketSettingsRow> {
  return {
    mode: state.mode,
    automatic_behavior: state.automaticBehavior,
    update_interval_ms: state.updateIntervalMs,
    min_movement: state.minMovement,
    max_movement: state.maxMovement,
    starting_value: state.startingValue,
    manual_control_enabled: state.manualControlEnabled,
    market_value_control_enabled: state.marketValueControlEnabled,
    percentage_control_enabled: state.percentageControlEnabled,
    trend_control_enabled: state.trendControlEnabled,
    volatility_control_enabled: state.volatilityControlEnabled,
    movement_control_enabled: state.movementControlEnabled,
    market_value_step: state.marketValueStep,
    percentage_step: state.percentageStep,
    current_market_value: state.currentMarketValue,
    current_percentage_change: state.currentPercentageChange,
    current_trend: state.currentTrend,
    current_volatility: state.currentVolatility,
    movement_strength: state.movementStrength,
    preview_mode: state.previewMode,
  };
}

export function createMarketService(client: SupabaseClient = getSupabaseClient()) {
  async function getCurrent(): Promise<MarketSettings> {
    const { data, error } = await client.from('market_settings').select('*').limit(1).single();
    if (error) throw error;
    return mapMarketSettingsRow(data as MarketSettingsRow);
  }

  async function persist(before: MarketSettings, after: MarketSettings, action: string, adminId?: string): Promise<MarketSettings> {
    const { data, error } = await client.from('market_settings').update(toRow(after)).eq('id', before.id).select('*').single();
    if (error) throw error;
    const saved = mapMarketSettingsRow(data as MarketSettingsRow);

    const valueChanged = before.currentMarketValue !== after.currentMarketValue;
    const percentageChanged = before.currentPercentageChange !== after.currentPercentageChange;
    if (!after.previewMode && (valueChanged || percentageChanged)) {
      await client.from('market_data').insert({
        value: saved.currentMarketValue,
        percentage_change: saved.currentPercentageChange,
        trend: saved.currentTrend,
        is_manual: true,
      });
    }

    if (adminId) {
      await client.from('admin_audit_logs').insert({
        admin_id: adminId,
        action,
        module: 'market',
        target: null,
        previous_value: JSON.stringify({ value: before.currentMarketValue, percentage: before.currentPercentageChange, trend: before.currentTrend }),
        new_value: JSON.stringify({ value: saved.currentMarketValue, percentage: saved.currentPercentageChange, trend: saved.currentTrend }),
        environment: APP_ENVIRONMENT,
      });
    }

    return saved;
  }

  return {
    getCurrent,

    async getHistory(limit = 100): Promise<MarketDataPoint[]> {
      const { data, error } = await client
        .from('market_data')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as MarketDataRow[]).map(mapMarketDataRow).reverse();
    },

    /** Advances the automatic random walk server-side. Safe to call from any connected client; a no-op in manual mode. */
    async tickAutomatic(): Promise<MarketSettings> {
      const { data, error } = await client.rpc('advance_market_automatic');
      if (error) throw error;
      return mapMarketSettingsRow(data as MarketSettingsRow);
    },

    async enableManualControl(adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.enableManualControl(before), 'enable_manual_control', adminId);
    },

    async returnToAutomatic(adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.returnToAutomatic(before), 'return_to_automatic', adminId);
    },

    async setControlToggle(key: MarketControlKey, enabled: boolean, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.setControlToggle(before, key, enabled), `toggle_${key}`, adminId);
    },

    async setMarketValueStep(step: number, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.setMarketValueStep(before, step), 'set_market_value_step', adminId);
    },

    async increaseMarketValue(adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.increaseMarketValue(before), 'increase_market_value', adminId);
    },

    async decreaseMarketValue(adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.decreaseMarketValue(before), 'decrease_market_value', adminId);
    },

    async setPercentageStep(step: number, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.setPercentageStep(before, step), 'set_percentage_step', adminId);
    },

    async increasePercentage(adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.increasePercentage(before), 'increase_percentage', adminId);
    },

    async decreasePercentage(adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.decreasePercentage(before), 'decrease_percentage', adminId);
    },

    async setTrend(trend: MarketTrend, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.setTrend(before, trend), 'set_trend', adminId);
    },

    async setVolatility(volatility: MarketVolatility, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.setVolatility(before, volatility), 'set_volatility', adminId);
    },

    async setMovementStrength(strength: number, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.setMovementStrength(before, strength), 'set_movement_strength', adminId);
    },

    async resetCurrentMetric(key: MarketControlKey, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.resetCurrentMetric(before, key), `reset_${key}`, adminId);
    },

    async resetAllManualControls(adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.resetAllManualControls(before), 'reset_all_manual_controls', adminId);
    },

    async setPreviewMode(preview: boolean, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.setPreviewMode(before, preview), 'set_preview_mode', adminId);
    },

    async setAutomaticBehavior(behavior: MarketSettings['automaticBehavior'], adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, { ...before, automaticBehavior: behavior }, 'set_automatic_behavior', adminId);
    },

    async listPresets(): Promise<MarketControlPreset[]> {
      const { data, error } = await client.from('market_control_presets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapMarketControlPresetRow(row as MarketControlPresetRow));
    },

    async savePreset(name: string, settings: Partial<MarketSettings>, adminId: string): Promise<MarketControlPreset> {
      // Stored as camelCase JSON (matches MarketSettings) so it can be fed straight
      // back into engine.applyPreset() without any snake_case round-trip.
      const { data, error } = await client
        .from('market_control_presets')
        .insert({ name, settings, created_by: adminId })
        .select('*')
        .single();
      if (error) throw error;
      return mapMarketControlPresetRow(data as MarketControlPresetRow);
    },

    async deletePreset(presetId: string): Promise<void> {
      const { error } = await client.from('market_control_presets').delete().eq('id', presetId);
      if (error) throw error;
    },

    async applyPreset(preset: MarketControlPreset, adminId: string): Promise<MarketSettings> {
      const before = await getCurrent();
      return persist(before, engine.applyPreset(before, preset.settings), `apply_preset:${preset.name}`, adminId);
    },
  };
}

export type MarketService = ReturnType<typeof createMarketService>;
