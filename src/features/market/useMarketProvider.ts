import { useCallback, useEffect, useRef, useState } from 'react';
import { createMarketProviderService } from '../../services/market/marketProviderService';
import { getSupabaseClient, isSupabaseConfigured } from '../../services/supabase/client';
import { mapMarketProviderHistoryRow, mapMarketProviderStateRow } from '../../services/supabase/mappers';
import type { MarketProviderHistoryRow, MarketProviderStateRow } from '../../services/supabase/mappers';
import type { MarketAsset, MarketOverrideHistoryEntry, MarketProviderHistoryPoint, MarketProviderState } from '../../types/database';

const HISTORY_LIMIT = 60;
const TICK_INTERVAL_MS = 4000;

/**
 * Drives the multi-asset Live Provider + Manual Override panel. The provider
 * tick heartbeat always runs — unlike useMarketData's automatic-mode-gated
 * heartbeat, this one has no "off" state, matching the spec's "do not
 * disconnect or pause the provider because an override is active."
 */
export function useMarketProvider() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [state, setState] = useState<MarketProviderState | null>(null);
  const [history, setHistory] = useState<MarketProviderHistoryPoint[]>([]);
  const [overrideHistory, setOverrideHistory] = useState<MarketOverrideHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef(isSupabaseConfigured() ? createMarketProviderService() : null);

  const refreshAsset = useCallback(async (assetId: string) => {
    const service = serviceRef.current;
    if (!service) return;
    try {
      const [nextState, nextHistory, nextOverrides] = await Promise.all([
        service.getProviderState(assetId),
        service.getProviderHistory(assetId, HISTORY_LIMIT),
        service.listOverrideHistory(assetId, 20),
      ]);
      setState(nextState);
      setHistory(nextHistory);
      setOverrideHistory(nextOverrides);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market provider data');
    }
  }, []);

  useEffect(() => {
    const service = serviceRef.current;
    if (!service) {
      setIsLoading(false);
      return;
    }
    service
      .listAssets()
      .then(async (list) => {
        setAssets(list);
        const first = list.find((a) => a.enabled) ?? list[0];
        if (first) {
          setSelectedAssetId(first.id);
          await refreshAsset(first.id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load market assets'))
      .finally(() => setIsLoading(false));
  }, [refreshAsset]);

  const selectAsset = useCallback(
    (assetId: string) => {
      setSelectedAssetId(assetId);
      setIsLoading(true);
      void refreshAsset(assetId).finally(() => setIsLoading(false));
    },
    [refreshAsset]
  );

  // Live Provider heartbeat — always ticking, independent of any override state.
  useEffect(() => {
    if (!serviceRef.current) return;
    const interval = setInterval(() => {
      serviceRef.current?.tick().catch(() => undefined);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Realtime: reflect ticks and overrides made by other sessions/admins for the selected asset.
  useEffect(() => {
    if (!isSupabaseConfigured() || !selectedAssetId) return;
    const client = getSupabaseClient();

    const stateChannel = client
      .channel(`market_provider_state_${selectedAssetId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market_provider_state', filter: `asset_id=eq.${selectedAssetId}` }, (payload) => {
        setState(mapMarketProviderStateRow(payload.new as MarketProviderStateRow));
      })
      .subscribe();

    const historyChannel = client
      .channel(`market_provider_history_${selectedAssetId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_provider_history', filter: `asset_id=eq.${selectedAssetId}` }, (payload) => {
        const point = mapMarketProviderHistoryRow(payload.new as MarketProviderHistoryRow);
        setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), point]);
      })
      .subscribe();

    return () => {
      void client.removeChannel(stateChannel);
      void client.removeChannel(historyChannel);
    };
  }, [selectedAssetId]);

  return {
    assets,
    selectedAssetId,
    selectAsset,
    state,
    history,
    overrideHistory,
    isLoading,
    error,
    refresh: () => (selectedAssetId ? refreshAsset(selectedAssetId) : Promise.resolve()),
    marketProviderService: serviceRef.current,
  };
}
