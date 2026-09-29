import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';
import { createExternalMarketService } from './externalMarketService';

/**
 * The markets an admin has switched on (System > Market Controls > Live
 * markets), as customers see them: the live CoinGecko price plus any admin
 * override, or the simulated price for markets without a live source.
 */
export interface CustomerMarket {
  /** Stable key used by dropdowns and saved projections: the CoinGecko id for live markets, else the market's id. */
  key: string;
  id: string;
  symbol: string;
  name: string;
  source: 'live' | 'simulated';
  coingeckoId: string | null;
  /** Price customers see: provider price plus the admin's manual offset. */
  price: number;
  offset: number;
}

export interface MarketPoint {
  value: number;
  recordedAt: string;
}

interface AssetRow {
  id: string;
  symbol: string;
  display_name: string;
  price_source: 'live' | 'simulated';
  coingecko_id: string | null;
  market_provider_state: { effective_price: number; manual_offset: number } | { effective_price: number; manual_offset: number }[] | null;
}

export const marketLabel = (m: Pick<CustomerMarket, 'name' | 'symbol'>) => `${m.name} (${m.symbol.split('/')[0]})`;

export function createCustomerMarketService(client: SupabaseClient = getSupabaseClient()) {
  const external = createExternalMarketService();

  return {
    async list(): Promise<CustomerMarket[]> {
      const { data, error } = await client
        .from('market_assets')
        .select('id, symbol, display_name, price_source, coingecko_id, market_provider_state(effective_price, manual_offset)')
        .eq('enabled', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as AssetRow[]).map((row) => {
        const state = Array.isArray(row.market_provider_state) ? row.market_provider_state[0] : row.market_provider_state;
        return {
          key: row.price_source === 'live' && row.coingecko_id ? row.coingecko_id : row.id,
          id: row.id,
          symbol: row.symbol,
          name: row.display_name,
          source: row.price_source,
          coingeckoId: row.coingecko_id,
          price: Number(state?.effective_price ?? 0),
          offset: Number(state?.manual_offset ?? 0),
        };
      });
    },

    /**
     * Price history ending at the price customers see. Live markets use
     * CoinGecko's history shifted by the admin's offset (so an override moves
     * the whole line, not just the last point); simulated markets use their
     * recorded ticks.
     */
    async history(market: CustomerMarket, days: number): Promise<MarketPoint[]> {
      if (market.source === 'live' && market.coingeckoId) {
        const points = await external.getHistory(market.coingeckoId, days);
        const shifted = points.map((p) => ({ value: p.price + market.offset, recordedAt: new Date(p.timestamp).toISOString() }));
        if (shifted.length) shifted[shifted.length - 1] = { value: market.price, recordedAt: new Date().toISOString() };
        return shifted;
      }
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await client
        .from('market_provider_history')
        .select('value, recorded_at')
        .eq('asset_id', market.id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return ((data ?? []) as { value: number; recorded_at: string }[]).map((r) => ({ value: Number(r.value), recordedAt: r.recorded_at })).reverse();
    },

    /** 24h change in percent, measured on the price customers see. */
    async change24h(market: CustomerMarket, history?: MarketPoint[]): Promise<number> {
      if (market.source === 'live' && market.coingeckoId) {
        const quotes = await external.getQuotes([market.coingeckoId]);
        const quote = quotes[market.coingeckoId];
        if (!quote) return 0;
        const dayAgo = quote.priceUsd / (1 + quote.change24h / 100) + market.offset;
        return dayAgo > 0 ? ((market.price - dayAgo) / dayAgo) * 100 : 0;
      }
      const points = history ?? (await this.history(market, 1));
      const first = points[0]?.value;
      return first ? ((market.price - first) / first) * 100 : 0;
    },
  };
}
