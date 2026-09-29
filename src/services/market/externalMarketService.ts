// Which coins customers see is chosen by admins (market_assets, see
// customerMarketService.ts); this only fetches CoinGecko data for them.
const BASE_URL = 'https://api.coingecko.com/api/v3';

export interface ExternalMarketQuote {
  priceUsd: number;
  change24h: number;
}

export interface ExternalMarketPoint {
  timestamp: number;
  price: number;
}

/**
 * Real, free, no-API-key market data for assets outside Investo's own
 * synthetic market index (see marketService.ts) — CoinGecko's public API
 * requires no registration for this volume. Fetched directly from the
 * visitor's browser rather than proxied through our backend, so CoinGecko's
 * rate limit is naturally distributed per-visitor instead of shared across
 * all of Investo's traffic.
 */
export function createExternalMarketService() {
  return {
    async getQuotes(ids: string[]): Promise<Record<string, ExternalMarketQuote>> {
      const res = await fetch(`${BASE_URL}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
      if (!res.ok) throw new Error(`market quote request failed (${res.status})`);
      const data = (await res.json()) as Record<string, { usd: number; usd_24h_change: number }>;

      const result: Record<string, ExternalMarketQuote> = {};
      for (const id of ids) {
        const entry = data[id];
        if (entry) result[id] = { priceUsd: entry.usd, change24h: entry.usd_24h_change };
      }
      return result;
    },

    async getHistory(id: string, days: number): Promise<ExternalMarketPoint[]> {
      const res = await fetch(`${BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
      if (!res.ok) throw new Error(`market history request failed (${res.status})`);
      const data = (await res.json()) as { prices: [number, number][] };
      return data.prices.map(([timestamp, price]) => ({ timestamp, price }));
    },
  };
}

export type ExternalMarketService = ReturnType<typeof createExternalMarketService>;
