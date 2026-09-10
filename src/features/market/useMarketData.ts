import { useCallback, useEffect, useRef, useState } from 'react';
import { createMarketService } from '../../services/market/marketService';
import { getSupabaseClient, isSupabaseConfigured } from '../../services/supabase/client';
import { mapMarketDataRow, mapMarketSettingsRow } from '../../services/supabase/mappers';
import type { MarketDataRow, MarketSettingsRow } from '../../services/supabase/mappers';
import type { MarketDataPoint, MarketSettings } from '../../types/database';

const HISTORY_LIMIT = 60;

export function useMarketData() {
  const [settings, setSettings] = useState<MarketSettings | null>(null);
  const [history, setHistory] = useState<MarketDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const marketServiceRef = useRef(isSupabaseConfigured() ? createMarketService() : null);

  const refresh = useCallback(async () => {
    const marketService = marketServiceRef.current;
    if (!marketService) return;
    try {
      const [current, hist] = await Promise.all([marketService.getCurrent(), marketService.getHistory(HISTORY_LIMIT)]);
      setSettings(current);
      setHistory(hist);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!marketServiceRef.current) {
      setIsLoading(false);
      return;
    }
    void refresh();
  }, [refresh]);

  // Client-driven automatic tick heartbeat: advances the random walk while the
  // market is in automatic mode. A no-op server-side while manual control is on.
  useEffect(() => {
    if (!marketServiceRef.current || !settings) return;
    if (settings.mode !== 'automatic') return;

    const interval = setInterval(() => {
      marketServiceRef.current
        ?.tickAutomatic()
        .then((updated) => setSettings(updated))
        .catch(() => undefined);
    }, settings.updateIntervalMs);

    return () => clearInterval(interval);
  }, [settings]);

  // Realtime: reflect manual admin actions and automatic ticks made from other sessions.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    // Unique per hook instance so concurrent mounts (e.g. this hook used from
    // more than one page/component at once) can never collide on the same
    // channel name — see useMaintenanceStatus.ts for the bug this avoids.
    const instanceId = Math.random().toString(36).slice(2);

    const settingsChannel = client
      .channel(`market_settings_changes_${instanceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market_settings' }, (payload) => {
        setSettings(mapMarketSettingsRow(payload.new as MarketSettingsRow));
      })
      .subscribe();

    const dataChannel = client
      .channel(`market_data_changes_${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_data' }, (payload) => {
        const point = mapMarketDataRow(payload.new as MarketDataRow);
        setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), point]);
      })
      .subscribe();

    return () => {
      void client.removeChannel(settingsChannel);
      void client.removeChannel(dataChannel);
    };
  }, []);

  return { settings, history, isLoading, error, refresh, marketService: marketServiceRef.current };
}
