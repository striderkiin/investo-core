import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import {
  mapMarketAssetRow,
  mapMarketOverrideHistoryRow,
  mapMarketProviderHistoryRow,
  mapMarketProviderStateRow,
} from '../supabase/mappers';
import type {
  MarketAssetRow,
  MarketOverrideHistoryRow,
  MarketProviderHistoryRow,
  MarketProviderStateRow,
} from '../supabase/mappers';
import type {
  MarketAsset,
  MarketCapabilityKey,
  MarketOverrideHistoryEntry,
  MarketProviderHistoryPoint,
  MarketProviderState,
} from '../../types/database';

const CAPABILITY_COLUMN: Record<MarketCapabilityKey, string> = {
  manualIncreaseEnabled: 'manual_increase_enabled',
  manualDecreaseEnabled: 'manual_decrease_enabled',
  directValueEntryEnabled: 'direct_value_entry_enabled',
  percentageAdjustmentEnabled: 'percentage_adjustment_enabled',
};

export function createMarketProviderService(client: SupabaseClient = getSupabaseClient()) {
  return {
    async listAssets(): Promise<MarketAsset[]> {
      const { data, error } = await client.from('market_assets').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as MarketAssetRow[]).map(mapMarketAssetRow);
    },

    async listProviderStates(): Promise<MarketProviderState[]> {
      const { data, error } = await client.from('market_provider_state').select('*');
      if (error) throw error;
      return (data as MarketProviderStateRow[]).map(mapMarketProviderStateRow);
    },

    async getProviderState(assetId: string): Promise<MarketProviderState> {
      const { data, error } = await client.from('market_provider_state').select('*').eq('asset_id', assetId).single();
      if (error) throw error;
      return mapMarketProviderStateRow(data as MarketProviderStateRow);
    },

    async getProviderHistory(assetId: string, limit = 60): Promise<MarketProviderHistoryPoint[]> {
      const { data, error } = await client
        .from('market_provider_history')
        .select('*')
        .eq('asset_id', assetId)
        .order('recorded_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as MarketProviderHistoryRow[]).map(mapMarketProviderHistoryRow).reverse();
    },

    async listOverrideHistory(assetId: string, limit = 20): Promise<MarketOverrideHistoryEntry[]> {
      const { data, error } = await client
        .from('market_override_history')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as MarketOverrideHistoryRow[]).map(mapMarketOverrideHistoryRow);
    },

    /** Advances every enabled asset's provider price by one tick. Always runs — never gated by any override state. */
    async tick(): Promise<MarketProviderState[]> {
      const { data, error } = await client.rpc('market_provider_tick');
      if (error) throw error;
      return (data as MarketProviderStateRow[]).map(mapMarketProviderStateRow);
    },

    async applyFixedAdjustment(assetId: string, direction: 'increase' | 'decrease', amount: number): Promise<MarketProviderState> {
      const { data, error } = await client.rpc('market_apply_fixed_adjustment', { p_asset_id: assetId, p_direction: direction, p_amount: amount });
      if (error) throw error;
      return mapMarketProviderStateRow(data as MarketProviderStateRow);
    },

    async applyPercentageAdjustment(assetId: string, direction: 'increase' | 'decrease', percent: number): Promise<MarketProviderState> {
      const { data, error } = await client.rpc('market_apply_percentage_adjustment', { p_asset_id: assetId, p_direction: direction, p_percent: percent });
      if (error) throw error;
      return mapMarketProviderStateRow(data as MarketProviderStateRow);
    },

    async setDirectPrice(assetId: string, targetPrice: number): Promise<MarketProviderState> {
      const { data, error } = await client.rpc('market_set_direct_price', { p_asset_id: assetId, p_target_price: targetPrice });
      if (error) throw error;
      return mapMarketProviderStateRow(data as MarketProviderStateRow);
    },

    async undoLastOverride(assetId: string): Promise<MarketProviderState> {
      const { data, error } = await client.rpc('market_undo_last_override', { p_asset_id: assetId });
      if (error) throw error;
      return mapMarketProviderStateRow(data as MarketProviderStateRow);
    },

    async resetToProvider(assetId: string): Promise<MarketProviderState> {
      const { data, error } = await client.rpc('market_reset_to_provider', { p_asset_id: assetId });
      if (error) throw error;
      return mapMarketProviderStateRow(data as MarketProviderStateRow);
    },

    async resetAllOverrides(): Promise<MarketProviderState[]> {
      const { data, error } = await client.rpc('market_reset_all_overrides');
      if (error) throw error;
      return (data as MarketProviderStateRow[]).map(mapMarketProviderStateRow);
    },

    async setCapabilityToggle(assetId: string, key: MarketCapabilityKey, enabled: boolean): Promise<MarketProviderState> {
      const { data, error } = await client.rpc('market_set_capability_toggle', {
        p_asset_id: assetId,
        p_key: CAPABILITY_COLUMN[key],
        p_enabled: enabled,
      });
      if (error) throw error;
      return mapMarketProviderStateRow(data as MarketProviderStateRow);
    },
  };
}

export type MarketProviderService = ReturnType<typeof createMarketProviderService>;
