import { describe, expect, it } from 'vitest';
import { buildProjectionSeries } from './projection';

const from = new Date('2026-01-01T00:00:00Z');

describe('buildProjectionSeries', () => {
  it('starts at the amount and ends exactly at the target return', () => {
    const series = buildProjectionSeries({ periodDays: 30, targetReturnPct: 12, curve: 'volatile', seed: 7 }, 1000, from);
    expect(series).toHaveLength(31);
    expect(series[0].value).toBe(1000);
    expect(series.at(-1)!.value).toBe(1120);
    expect(series.at(-1)!.date.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it('draws the same curve for the same seed and a different one otherwise', () => {
    const a = buildProjectionSeries({ periodDays: 60, targetReturnPct: 20, curve: 'volatile', seed: 3 }, 500, from);
    const b = buildProjectionSeries({ periodDays: 60, targetReturnPct: 20, curve: 'volatile', seed: 3 }, 500, from);
    const c = buildProjectionSeries({ periodDays: 60, targetReturnPct: 20, curve: 'volatile', seed: 4 }, 500, from);
    expect(a.map((p) => p.value)).toEqual(b.map((p) => p.value));
    expect(a.map((p) => p.value)).not.toEqual(c.map((p) => p.value));
  });

  it('keeps a steady curve close to the trend and a volatile one within a few percent', () => {
    const steady = buildProjectionSeries({ periodDays: 30, targetReturnPct: 0, curve: 'steady', seed: 9 }, 100, from);
    const volatile = buildProjectionSeries({ periodDays: 30, targetReturnPct: 0, curve: 'volatile', seed: 9 }, 100, from);
    for (const p of steady) expect(Math.abs(p.value - 100)).toBeLessThanOrEqual(0.61);
    for (const p of volatile) expect(Math.abs(p.value - 100)).toBeLessThanOrEqual(4.51);
    expect(Math.max(...volatile.map((p) => Math.abs(p.value - 100)))).toBeGreaterThan(1);
  });

  it('samples long periods down to at most 91 points and handles losses', () => {
    const series = buildProjectionSeries({ periodDays: 365, targetReturnPct: -20, seed: 1 }, 1000, from);
    expect(series).toHaveLength(91);
    expect(series.at(-1)!.value).toBe(800);
  });
});
