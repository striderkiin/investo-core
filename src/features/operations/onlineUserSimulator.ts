/**
 * Pure random-walk step for the "Simulated Online Users" counter (spec
 * section 46). No I/O, no timers — unit-testable directly like the market
 * engine. The counter is intentionally never persisted: it's a per-viewer
 * cosmetic simulation, not real presence tracking, which is exactly why the
 * UI must always label it "Simulated".
 */
export function stepOnlineUsers(current: number, min: number, max: number, rng: () => number = Math.random): number {
  const range = Math.max(1, max - min);
  const maxSwing = Math.max(1, Math.round(range * 0.03));
  const delta = Math.round((rng() - 0.5) * 2 * maxSwing);
  return Math.min(max, Math.max(min, current + delta));
}
