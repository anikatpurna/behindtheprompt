export const DEFAULT_TARGET = 0.15;
/** A customer is "Healthy" once it clears the target by this buffer (15% -> 20%). */
export const HEALTHY_BUFFER = 0.05;
export const MAX_COST_INCREASE = 30;
export const DEFAULT_ANALYST_RATE = 35;

export const STATUS = {
  healthy: { key: 'healthy', label: 'Healthy', color: '#16A34A', soft: '#DCFCE7', text: '#166534', rank: 0 },
  watchlist: { key: 'watchlist', label: 'Watchlist', color: '#F59E0B', soft: '#FEF3C7', text: '#92400E', rank: 1 },
  atRisk: { key: 'atRisk', label: 'At Risk', color: '#EA580C', soft: '#FFEDD5', text: '#9A3412', rank: 2 },
  loss: { key: 'loss', label: 'Loss-Making', color: '#DC2626', soft: '#FEE2E2', text: '#991B1B', rank: 3 },
};
export const STATUS_ORDER = ['healthy', 'watchlist', 'atRisk', 'loss'];

// Round away float noise so a margin of exactly 15% is not classified as 14.999999999%.
const r9 = (x) => Math.round(x * 1e9) / 1e9;
export const safeDiv = (a, b, fallback = 0) => (b === 0 || !Number.isFinite(a) || !Number.isFinite(b) ? fallback : a / b);

/**
 * Healthy:   margin >= target + 5 pts   (20% by default)
 * Watchlist: margin >= target           (15% by default)
 * At Risk:   margin >= 0%
 * Loss:      margin <  0%
 */
export function getStatus(margin, target = DEFAULT_TARGET) {
  const m = r9(margin);
  if (m < 0) return 'loss';
  if (m < r9(target)) return 'atRisk';
  if (m < r9(target + HEALTHY_BUFFER)) return 'watchlist';
  return 'healthy';
}

/**
 * Derive per-customer metrics. Operating cost is treated as the complete cost base:
 * labor hours are informational and are never priced and added on top of it.
 */
export function analyzeCustomer(c, target = DEFAULT_TARGET) {
  const profit = c.revenue - c.cost;
  const margin = safeDiv(profit, c.revenue);
  return {
    ...c,
    profit,
    margin,
    status: getStatus(margin, target),
    costPerUnit: c.units ? safeDiv(c.cost, c.units, null) : null,
    revenuePerUnit: c.units ? safeDiv(c.revenue, c.units, null) : null,
    profitPerUnit: c.units ? safeDiv(profit, c.units, null) : null,
    hoursPer1kUnits: c.units && c.laborHours != null ? safeDiv(c.laborHours * 1000, c.units, null) : null,
    revenuePerLaborHour: c.laborHours ? safeDiv(c.revenue, c.laborHours, null) : null,
    profitPerLaborHour: c.laborHours ? safeDiv(profit, c.laborHours, null) : null,
    // How far operating cost can rise (as a fraction) before margin hits 0% / the target.
    headroomToZero: c.cost > 0 ? c.revenue / c.cost - 1 : null,
    headroomToTarget: c.cost > 0 ? (c.revenue * (1 - target)) / c.cost - 1 : null,
  };
}

export function analyzeAll(customers, target = DEFAULT_TARGET) {
  return customers.map((c) => analyzeCustomer(c, target));
}

/** Portfolio margin = total profit / total revenue (never an average of customer margins). */
export function portfolioSummary(analyzed, target = DEFAULT_TARGET) {
  const revenue = analyzed.reduce((s, c) => s + c.revenue, 0);
  const cost = analyzed.reduce((s, c) => s + c.cost, 0);
  const profit = revenue - cost;
  const margin = safeDiv(profit, revenue);
  const counts = { healthy: 0, watchlist: 0, atRisk: 0, loss: 0 };
  analyzed.forEach((c) => (counts[c.status] += 1));
  return {
    revenue,
    cost,
    profit,
    margin,
    status: getStatus(margin, target),
    customers: analyzed.length,
    belowTarget: analyzed.filter((c) => r9(c.margin) < r9(target)).length,
    counts,
  };
}

/**
 * What-if: operating cost rises by `increase` (fraction, 0.15 = +15%), revenue unchanged.
 * Required revenue = simulated cost / (1 - target); additional = MAX(0, required - current).
 * Takes the original analyzed customer and returns a new object, so baseline data is never mutated.
 */
export function simulate(c, increase, target = DEFAULT_TARGET) {
  const cost = c.cost * (1 + increase);
  const profit = c.revenue - cost;
  const margin = safeDiv(profit, c.revenue);
  const requiredRevenue = target < 1 ? cost / (1 - target) : Infinity;
  const additionalRevenue = Math.max(0, requiredRevenue - c.revenue);
  return {
    increase,
    cost,
    profit,
    margin,
    status: getStatus(margin, target),
    dCost: cost - c.cost,
    dProfit: profit - c.profit,
    dMargin: margin - c.margin,
    requiredRevenue,
    additionalRevenue,
    additionalPct: safeDiv(additionalRevenue, c.revenue),
  };
}

export function simulatePortfolio(analyzed, increase, target = DEFAULT_TARGET) {
  const rows = analyzed.map((c) => ({ customer: c, sim: simulate(c, increase, target) }));
  const revenue = analyzed.reduce((s, c) => s + c.revenue, 0);
  const cost = rows.reduce((s, r) => s + r.sim.cost, 0);
  return {
    rows,
    cost,
    profit: revenue - cost,
    margin: safeDiv(revenue - cost, revenue),
    lossCount: rows.filter((r) => r.sim.status === 'loss').length,
    belowTarget: rows.filter((r) => r9(r.sim.margin) < r9(target)).length,
  };
}

/** Margin curve for one customer across 0..max% cost increases. */
export function marginCurve(c, target, max = MAX_COST_INCREASE, step = 1) {
  const pts = [];
  for (let p = 0; p <= max; p += step) {
    const s = simulate(c, p / 100, target);
    pts.push({ pct: p, margin: s.margin * 100, profit: s.profit });
  }
  return pts;
}

/** Quote-preparation efficiency. All outputs are hypothetical capacity estimates. */
export function efficiency({ quotes, manualMin, appMin, rate }) {
  const q = Math.max(0, quotes || 0);
  const manualHours = (q * Math.max(0, manualMin || 0)) / 60;
  const appHours = (q * Math.max(0, appMin || 0)) / 60;
  const hoursSaved = manualHours - appHours;
  const hourly = Math.max(0, rate || 0);
  return {
    manualHours,
    appHours,
    hoursSaved,
    reductionPct: safeDiv(hoursSaved, manualHours),
    monthlyValue: hoursSaved * hourly,
    annualValue: hoursSaved * hourly * 12,
  };
}

/** Defaults for the ROI calculator from dataset quote fields (quote-weighted). */
export function efficiencyDefaults(customers) {
  const withQuotes = customers.filter((c) => c.quotes != null && c.quotes > 0);
  const quotes = withQuotes.reduce((s, c) => s + c.quotes, 0);
  const wavg = (field, fallback) => {
    const rows = withQuotes.filter((c) => c[field] != null);
    const w = rows.reduce((s, c) => s + c.quotes, 0);
    return w > 0 ? rows.reduce((s, c) => s + c[field] * c.quotes, 0) / w : fallback;
  };
  const rates = customers.filter((c) => c.rate != null);
  const rate = rates.length ? rates.reduce((s, c) => s + c.rate, 0) / rates.length : DEFAULT_ANALYST_RATE;
  const fromData = quotes > 0 && withQuotes.some((c) => c.manualMin != null && c.appMin != null);
  const round = (x) => Math.round(x * 10) / 10;
  return {
    fromData,
    quotes: fromData ? quotes : 20,
    manualMin: fromData ? round(wavg('manualMin', 45)) : 45,
    appMin: fromData ? round(wavg('appMin', 8)) : 8,
    rate: round(rate),
  };
}
