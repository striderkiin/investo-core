import { describe, expect, it } from 'vitest';
import { computeDirectOffset, computeEffectivePrice, computeFixedOffsetDelta, computePercentageOffsetDelta } from './marketOverrideEngine';

describe('marketOverrideEngine (Live Provider + Manual Override)', () => {
  it('effectivePrice = providerPrice + manualOffset', () => {
    expect(computeEffectivePrice(66980, 265)).toBe(67245);
    expect(computeEffectivePrice(66980, -265)).toBe(66715);
  });

  it('a provider tick recalculates effectivePrice while the offset stays untouched', () => {
    const offset = 265;
    expect(computeEffectivePrice(66980, offset)).toBe(67245);
    // Provider moves later while the same override is still active.
    expect(computeEffectivePrice(67100, offset)).toBe(67365);
  });

  it('fixed adjustments produce a signed delta to add to the current offset', () => {
    expect(computeFixedOffsetDelta('increase', 500)).toBe(500);
    expect(computeFixedOffsetDelta('decrease', 500)).toBe(-500);
    expect(() => computeFixedOffsetDelta('increase', 0)).toThrow();
  });

  it('percentage adjustments are computed off the current effective price, not the provider price', () => {
    expect(computePercentageOffsetDelta(67245, 'increase', 1)).toBeCloseTo(672.45, 2);
    expect(computePercentageOffsetDelta(67245, 'decrease', 1)).toBeCloseTo(-672.45, 2);
  });

  it('direct value entry computes the offset needed relative to the provider price, never mutating it', () => {
    expect(computeDirectOffset(66980, 70000)).toBe(3020);
    expect(computeDirectOffset(66980, 60000)).toBe(-6980);
    expect(() => computeDirectOffset(66980, -1)).toThrow();
  });
});
