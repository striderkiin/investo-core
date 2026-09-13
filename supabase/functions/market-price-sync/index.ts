// Real-price sync for the "Live Provider" market system (see migration
// 0017_market_provider_override.sql). Fetches crypto/gold quotes from
// CoinGecko's free public API (no key required, same source as the client
// dashboard's Market Overview widget) and writes them as each 'live'-tagged
// asset's provider_price via market_provider_sync_price() — see migration
// 0025_market_provider_real_prices.sql. Invoked on a 5-minute pg_cron
// heartbeat; admin manual_offset overrides are untouched by this, so
// effective_price = real price + any active override, same overlay design
// market_provider_tick() has always used for the simulated assets.
//
// Deploy with: supabase functions deploy market-price-sync

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface MarketAssetRow {
  id: string;
  coingecko_id: string | null;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: assets, error: assetsError } = await supabase
    .from('market_assets')
    .select('id, coingecko_id')
    .eq('price_source', 'live')
    .eq('enabled', true);

  if (assetsError) {
    return new Response(JSON.stringify({ error: assetsError.message }), { status: 500 });
  }

  const liveAssets = ((assets ?? []) as MarketAssetRow[]).filter((asset): asset is MarketAssetRow & { coingecko_id: string } => Boolean(asset.coingecko_id));
  if (liveAssets.length === 0) {
    return new Response(JSON.stringify({ ok: true, synced: 0 }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  const ids = liveAssets.map((asset) => asset.coingecko_id).join(',');
  const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
  if (!priceRes.ok) {
    return new Response(JSON.stringify({ error: `coingecko request failed (${priceRes.status})` }), { status: 502 });
  }
  const prices = (await priceRes.json()) as Record<string, { usd: number }>;

  const results: { assetId: string; coingeckoId: string; ok: boolean; error?: string }[] = [];
  for (const asset of liveAssets) {
    const price = prices[asset.coingecko_id]?.usd;
    if (price === undefined) {
      results.push({ assetId: asset.id, coingeckoId: asset.coingecko_id, ok: false, error: 'no price returned' });
      continue;
    }
    const { error } = await supabase.rpc('market_provider_sync_price', { p_asset_id: asset.id, p_price: price });
    results.push({ assetId: asset.id, coingeckoId: asset.coingecko_id, ok: !error, error: error?.message });
  }

  return new Response(JSON.stringify({ ok: true, synced: results.filter((r) => r.ok).length, results }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
