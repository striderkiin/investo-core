import { COIN_SVG as SVG } from '../../src/shared/coinLogos';

// Names and symbols that can appear in a message, mapped to a logo.
const NAMES: [RegExp, string][] = [
  [/\bbitcoin\b/i, 'btc'],
  [/\bethereum\b/i, 'eth'],
  [/\bsolana\b/i, 'sol'],
  [/\bxrp\b/i, 'xrp'],
  [/\bripple\b/i, 'xrp'],
  [/\btether\b/i, 'usdt'],
  [/\busdt\b/i, 'usdt'],
  [/\bbnb\b/i, 'bnb'],
  [/\bdogecoin\b/i, 'doge'],
  [/\bcardano\b/i, 'ada'],
  [/\blitecoin\b/i, 'ltc'],
  [/\btron\b/i, 'trx'],
  [/\busdc\b/i, 'usdc'],
  [/\bpolkadot\b/i, 'dot'],
  [/\bpolygon\b/i, 'matic'],
  [/\bavalanche\b/i, 'avax'],
  [/\bchainlink\b/i, 'link'],
  [/\bgold\b/i, 'paxg'],
  [/\bpax\s+gold\b/i, 'paxg'],
  [/\bBTC\b/, 'btc'],
  [/\bETH\b/, 'eth'],
  [/\bSOL\b/, 'sol'],
  [/\bXAU\b/, 'paxg'],
];

/** The logo SVG for the first coin named in a message, or null. */
export function coinIconFor(text: string): string | null {
  for (const [pattern, key] of NAMES) if (pattern.test(text)) return SVG[key] ?? null;
  return null;
}
