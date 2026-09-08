/**
 * Pure math for the Live Provider + Manual Override architecture. Separate
 * from marketEngine.ts (which stays untouched — it's the original automatic
 * vs. manual chart simulation, spec section 93's acceptance scenarios still
 * pass unmodified). These functions back the server-side RPCs in
 * 0017_market_provider_override.sql; kept here too so the arithmetic can be
 * unit-tested without a database.
 */

export function computeEffectivePrice(providerPrice: number, manualOffset: number): number {
  return round2(providerPrice + manualOffset);
}

export function computeFixedOffsetDelta(direction: 'increase' | 'decrease', amount: number): number {
  if (amount <= 0) throw new Error('Amount must be positive');
  return direction === 'increase' ? amount : -amount;
}

export function computePercentageOffsetDelta(effectivePrice: number, direction: 'increase' | 'decrease', percent: number): number {
  if (percent <= 0) throw new Error('Percent must be positive');
  const magnitude = round2(effectivePrice * (percent / 100));
  return direction === 'increase' ? magnitude : -magnitude;
}

export function computeDirectOffset(providerPrice: number, targetPrice: number): number {
  if (targetPrice < 0) throw new Error('Target price must not be negative');
  return round2(targetPrice - providerPrice);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
