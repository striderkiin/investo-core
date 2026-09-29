import { describe, expect, it } from 'vitest';
import { formatUsdPrice, roundPrice } from './price';

describe('price helpers', () => {
  it('keeps cents for normal prices', () => {
    expect(roundPrice(83897.456)).toBe(83897.46);
    expect(formatUsdPrice(83897.456)).toBe('$83,897.46');
    expect(formatUsdPrice(0)).toBe('$0.00');
  });

  it('shows currency pairs to 4 decimals', () => {
    expect(formatUsdPrice(1.08423)).toBe('$1.0842');
    expect(formatUsdPrice(64.5)).toBe('$64.50');
    expect(roundPrice(1.084234567)).toBe(1.08423);
  });

  it('keeps significant digits for sub-dollar coins instead of rounding to zero', () => {
    expect(roundPrice(0.0000123456789)).toBe(0.0000123457);
    expect(formatUsdPrice(0.0000123456)).toBe('$0.00001235');
    expect(formatUsdPrice(0.5)).toBe('$0.5');
    expect(formatUsdPrice(-0.25)).toBe('-$0.25');
  });
});
