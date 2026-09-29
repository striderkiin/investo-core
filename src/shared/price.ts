// Market prices range from thousands of dollars to fractions of a cent, so
// rounding and display keep cents for large prices, up to 4 decimals for
// small ones (currency pairs like EUR/USD 1.0842) and significant digits for
// sub-dollar coins (e.g. $0.00001234 rather than $0.00).

/** Rounds for charts: cents at $100 and above, 6 significant digits below. */
export const roundPrice = (value: number) => (Math.abs(value) >= 100 ? Math.round(value * 100) / 100 : Number(value.toPrecision(6)));

/** $1,234.56, $1.0842, or $0.00001234. */
export const formatUsdPrice = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1 || abs === 0) {
    const maximumFractionDigits = abs >= 100 || abs === 0 ? 2 : 4;
    return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits })}`;
  }
  return `${sign}$${Number(abs.toPrecision(4))}`;
};
