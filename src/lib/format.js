const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ok = (n) => typeof n === 'number' && Number.isFinite(n);

export const fmtCurrency = (n) => {
  if (!ok(n)) return '—';
  const r = Math.round(n);
  return usd.format(r === 0 ? 0 : r);
};

export const fmtCurrencyCompact = (n) => (ok(n) ? usdCompact.format(n) : '—');

export const fmtCurrency2 = (n) =>
  ok(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—';

export const fmtSignedCurrency = (n) => {
  if (!ok(n)) return '—';
  const r = Math.round(n);
  if (r === 0) return '$0';
  return (r > 0 ? '+' : '') + usd.format(r);
};

/** Fraction -> percent string. 0.1 -> "10.0%" */
export const fmtPct = (x, digits = 1) => {
  if (!ok(x)) return '—';
  const v = Number((x * 100).toFixed(digits));
  return `${v === 0 ? (0).toFixed(digits) : v.toFixed(digits)}%`;
};

/** Fraction delta -> signed percentage points. 0.05 -> "+5.0 pts" */
export const fmtPts = (x, digits = 1) => {
  if (!ok(x)) return '—';
  const v = Number((x * 100).toFixed(digits));
  if (v === 0) return `${(0).toFixed(digits)} pts`;
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)} pts`;
};

export const fmtNumber = (n) => (ok(n) ? num.format(n) : '—');
export const fmtDecimal = (n) => (ok(n) ? num1.format(n) : '—');
export const fmtHours = (n) => (ok(n) ? `${num1.format(n)} h` : '—');
