// Chart projections an admin prepares for one customer (see migration 0042).
// Shared by the admin preview and the customer's dashboard so both draw the
// exact same curve from the same saved settings.
import { roundPrice } from './price';

export type ProjectionChart = 'market_overview' | 'portfolio_composition' | 'market_widget';
export type ProjectionMode = 'replace' | 'overlay';
export type ProjectionCurve = 'steady' | 'volatile';

export interface ProjectionParams {
  /** Starting value. Portfolio: the amount invested. Market charts: optional, defaults to the chart's last real value. */
  amount?: number;
  /** Portfolio projections: the plan the amount is shown in. */
  planId?: string;
  /** Market projections: 'platform' or an external market id. */
  asset?: string;
  periodDays: number;
  targetReturnPct: number;
  curve?: ProjectionCurve;
  /** Fixes the volatile curve's shape so it looks the same on every visit. */
  seed?: number;
  /** Optional line shown under the chart, e.g. "As discussed on our call". */
  note?: string;
}

export interface CustomerProjection {
  id: string;
  userId: string;
  chart: ProjectionChart;
  enabled: boolean;
  mode: ProjectionMode;
  params: ProjectionParams;
  updatedBy: string | null;
  updatedAt: string;
}

export interface CustomerProjectionRow {
  id: string;
  user_id: string;
  chart: ProjectionChart;
  enabled: boolean;
  mode: ProjectionMode;
  params: ProjectionParams;
  updated_by: string | null;
  updated_at: string;
}

export const mapProjectionRow = (row: CustomerProjectionRow): CustomerProjection => ({
  id: row.id,
  userId: row.user_id,
  chart: row.chart,
  enabled: row.enabled,
  mode: row.mode,
  params: row.params ?? { periodDays: 30, targetReturnPct: 0 },
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
});

export const PROJECTION_CHARTS: { chart: ProjectionChart; label: string; overlay: boolean }[] = [
  { chart: 'market_overview', label: 'Market Overview', overlay: true },
  { chart: 'portfolio_composition', label: 'Portfolio Composition', overlay: false },
  { chart: 'market_widget', label: 'Market widget (Wallet & Account)', overlay: true },
];

export const PROJECTION_LABEL = 'Projection';

export interface ProjectionPoint {
  date: Date;
  value: number;
}

// mulberry32: tiny deterministic PRNG so a saved seed always gives the same curve.
const prng = (seed: number) => {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const AMPLITUDE: Record<ProjectionCurve, number> = { steady: 0.006, volatile: 0.045 };
const MAX_POINTS = 90;

/**
 * The projected path from `start` today to start × (1 + targetReturnPct%)
 * after periodDays. A compounding trend plus seeded wobble that is pinned to
 * zero at both ends, so the first and last points are exactly the start and
 * target values.
 */
export function buildProjectionSeries(params: ProjectionParams, start: number, from: Date = new Date()): ProjectionPoint[] {
  const days = Math.max(1, Math.round(params.periodDays));
  const steps = Math.min(days, MAX_POINTS);
  const end = start * (1 + params.targetReturnPct / 100);
  const random = prng(params.seed ?? 1);

  // Random walk, then subtract the straight line between its ends (a bridge)
  // so it starts and finishes at zero.
  const walk = [0];
  for (let i = 1; i <= steps; i++) walk.push(walk[i - 1] + (random() + random() + random() - 1.5));
  const bridge = walk.map((w, i) => w - (walk[steps] * i) / steps);
  const peak = Math.max(...bridge.map(Math.abs)) || 1;
  const amplitude = AMPLITUDE[params.curve ?? 'steady'];

  const ratio = start > 0 && end > 0 ? end / start : null;
  const dayMs = 86_400_000;
  return bridge.map((b, i) => {
    const t = i / steps;
    const trend = ratio ? start * Math.pow(ratio, t) : start + (end - start) * t;
    const value = i === 0 ? start : i === steps ? end : trend * (1 + (b / peak) * amplitude);
    return { date: new Date(from.getTime() + t * days * dayMs), value: roundPrice(value) };
  });
}

/** A stable seed for a new projection. */
export const newProjectionSeed = () => Math.floor(Math.random() * 1_000_000) + 1;
