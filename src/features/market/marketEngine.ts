import type { MarketSettings, MarketTrend, MarketVolatility } from '../../types/database';

export type MarketControlKey =
  | 'marketValueControlEnabled'
  | 'percentageControlEnabled'
  | 'trendControlEnabled'
  | 'volatilityControlEnabled'
  | 'movementControlEnabled';

/**
 * Pure, framework- and database-agnostic core of the market simulation. Every
 * function takes a MarketSettings snapshot and returns a new one — no I/O, no
 * React, no Supabase — so the full manual-control acceptance test suite
 * (spec section 93) can run in milliseconds against real interaction
 * sequences (tap, tap, tap) without any backend.
 *
 * MarketService (services/market) is the thin persistence adapter: it loads a
 * MarketSettings row, calls into this engine, and saves/broadcasts the result.
 */
export function createDefaultMarketSettings(): MarketSettings {
  return {
    id: 'local',
    mode: 'automatic',
    automaticBehavior: 'stable',
    updateIntervalMs: 3000,
    minMovement: 0.05,
    maxMovement: 0.5,
    startingValue: 42580.25,
    manualControlEnabled: false,
    marketValueControlEnabled: false,
    percentageControlEnabled: false,
    trendControlEnabled: false,
    volatilityControlEnabled: false,
    movementControlEnabled: false,
    marketValueStep: 100,
    percentageStep: 0.5,
    currentMarketValue: 42580.25,
    currentPercentageChange: 2.8,
    currentTrend: 'bullish',
    currentVolatility: 'medium',
    movementStrength: 3,
    previewMode: false,
    updatedAt: new Date().toISOString(),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Advances the automatic random-walk simulation by one tick. No-op in manual mode. */
export function tickAutomatic(state: MarketSettings, rng: () => number = Math.random): MarketSettings {
  if (state.mode !== 'automatic') return state;

  const behaviorBias: Record<MarketSettings['automaticBehavior'], number> = {
    stable: 0,
    upward: 1,
    downward: -1,
    volatile: rng() < 0.5 ? -1 : 1,
    random: rng() < 0.5 ? -1 : 1,
  };

  const magnitudeMultiplier: Record<MarketSettings['automaticBehavior'], number> = {
    stable: 0.2,
    upward: 1,
    downward: 1,
    volatile: 3,
    random: 1,
  };

  const direction = behaviorBias[state.automaticBehavior];
  const magnitude = state.minMovement + rng() * (state.maxMovement - state.minMovement);
  const change = direction * magnitude * magnitudeMultiplier[state.automaticBehavior];

  const nextValue = Math.max(0, round2(state.currentMarketValue + change));
  const nextPercentage = state.startingValue > 0 ? round4((nextValue / state.startingValue - 1) * 100) : 0;
  const nextTrend: MarketTrend = change > 0 ? 'bullish' : change < 0 ? 'bearish' : 'stable';

  return {
    ...state,
    currentMarketValue: nextValue,
    currentPercentageChange: nextPercentage,
    currentTrend: nextTrend,
  };
}

export function enableManualControl(state: MarketSettings): MarketSettings {
  return { ...state, mode: 'manual', manualControlEnabled: true };
}

/** Turns off manual control entirely: every individual toggle turns off and automatic behavior resumes. */
export function returnToAutomatic(state: MarketSettings): MarketSettings {
  return {
    ...state,
    mode: 'automatic',
    manualControlEnabled: false,
    marketValueControlEnabled: false,
    percentageControlEnabled: false,
    trendControlEnabled: false,
    volatilityControlEnabled: false,
    movementControlEnabled: false,
  };
}

export function setControlToggle(state: MarketSettings, key: MarketControlKey, enabled: boolean): MarketSettings {
  return { ...state, [key]: enabled };
}

export function setMarketValueStep(state: MarketSettings, step: number): MarketSettings {
  if (step <= 0) throw new Error('Step must be positive');
  return { ...state, marketValueStep: step };
}

export function setPercentageStep(state: MarketSettings, step: number): MarketSettings {
  if (step <= 0) throw new Error('Step must be positive');
  return { ...state, percentageStep: step };
}

/** ▲ Increase market value by the configured step. No-op unless manual + market-value control are both enabled. */
export function increaseMarketValue(state: MarketSettings): MarketSettings {
  if (!state.manualControlEnabled || !state.marketValueControlEnabled) return state;
  return { ...state, currentMarketValue: round2(state.currentMarketValue + state.marketValueStep) };
}

/** ▼ Decrease market value by the configured step, floored at 0. No-op unless enabled. */
export function decreaseMarketValue(state: MarketSettings): MarketSettings {
  if (!state.manualControlEnabled || !state.marketValueControlEnabled) return state;
  return { ...state, currentMarketValue: Math.max(0, round2(state.currentMarketValue - state.marketValueStep)) };
}

export function increasePercentage(state: MarketSettings): MarketSettings {
  if (!state.manualControlEnabled || !state.percentageControlEnabled) return state;
  return { ...state, currentPercentageChange: round4(state.currentPercentageChange + state.percentageStep) };
}

export function decreasePercentage(state: MarketSettings): MarketSettings {
  if (!state.manualControlEnabled || !state.percentageControlEnabled) return state;
  return { ...state, currentPercentageChange: round4(state.currentPercentageChange - state.percentageStep) };
}

export function setTrend(state: MarketSettings, trend: MarketTrend): MarketSettings {
  if (!state.manualControlEnabled || !state.trendControlEnabled) return state;
  return { ...state, currentTrend: trend };
}

export function setVolatility(state: MarketSettings, volatility: MarketVolatility): MarketSettings {
  if (!state.manualControlEnabled || !state.volatilityControlEnabled) return state;
  return { ...state, currentVolatility: volatility };
}

export function setMovementStrength(state: MarketSettings, strength: number): MarketSettings {
  if (!state.manualControlEnabled || !state.movementControlEnabled) return state;
  const clamped = Math.min(5, Math.max(1, Math.round(strength)));
  return { ...state, movementStrength: clamped };
}

/** Reset a single manual metric back to "not overridden" (its toggle turns off) without touching others. */
export function resetCurrentMetric(state: MarketSettings, key: MarketControlKey): MarketSettings {
  return { ...state, [key]: false };
}

/** Reset every individual manual toggle off, but leave the master switch as-is. */
export function resetAllManualControls(state: MarketSettings): MarketSettings {
  return {
    ...state,
    marketValueControlEnabled: false,
    percentageControlEnabled: false,
    trendControlEnabled: false,
    volatilityControlEnabled: false,
    movementControlEnabled: false,
  };
}

export function setPreviewMode(state: MarketSettings, preview: boolean): MarketSettings {
  return { ...state, previewMode: preview };
}

export function applyPreset(state: MarketSettings, preset: Partial<MarketSettings>): MarketSettings {
  return { ...state, ...preset };
}
