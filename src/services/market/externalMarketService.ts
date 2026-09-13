export interface ExternalMarket {
  id: string;
  label: string;
}

// Curated to what CoinGecko's free public API can answer reliably without a
// key: crypto majors directly, and "gold" via a gold-backed token (Pax Gold,
// 1 PAXG == 1 troy oz, audited reserves) rather than a separate commodities
// API — this is the free way to get a real, non-fiat, non-crypto-native
// market series without a second provider/API key.
export const EXTERNAL_MARKETS: ExternalMarket[] = [
  { id: 'bitcoin', label: 'Bitcoin (BTC)' },
  { id: 'ethereum', label: 'Ethereum (ETH)' },
  { id: 'pax-gold', label: 'Gold (PAXG)' },
];

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
