import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeCustomer, analyzeAll, portfolioSummary, simulate, getStatus, efficiency, efficiencyDefaults } from './finance.js';
import { loadCustomersFromCsv, parseNumber } from './csv.js';
import { fmtCurrency, fmtPct } from './format.js';
import { generateInsights } from './insights.js';

const demo = loadCustomersFromCsv(readFileSync(new URL('../../public/customer_profitability_demo.csv', import.meta.url), 'utf8'));

test('demo CSV loads cleanly', () => {
  assert.deepEqual(demo.errors, []);
  assert.deepEqual(demo.warnings, []);
  assert.equal(demo.customers.length, 5);
});

test('status boundaries (exact thresholds are inclusive)', () => {
  assert.equal(getStatus(0.2), 'healthy');
  assert.equal(getStatus(0.1999), 'watchlist');
  assert.equal(getStatus(0.15), 'watchlist');
  assert.equal(getStatus(0.1499), 'atRisk');
  assert.equal(getStatus(0), 'atRisk');
  assert.equal(getStatus(-0.0001), 'loss');
  assert.equal(getStatus((62000 - 52700) / 62000), 'watchlist'); // Summit, float-safe
});

test('portfolio margin is total profit / total revenue', () => {
  const s = portfolioSummary(analyzeAll(demo.customers));
  assert.equal(s.revenue, 400000);
  assert.equal(s.cost, 314850);
  assert.equal(s.profit, 85150);
  assert.ok(Math.abs(s.margin - 0.212875) < 1e-9);
  assert.equal(s.belowTarget, 1);
});

test('BluePeak +15% scenario matches the brief', () => {
  const blue = analyzeCustomer(demo.customers.find((c) => c.name === 'BluePeak Distribution'));
  assert.equal(blue.status, 'atRisk');
  const s = simulate(blue, 0.15);
  assert.ok(Math.abs(s.cost - 49680) < 1e-6);
  assert.equal(fmtCurrency(s.profit), '-$1,680');
  assert.equal(fmtPct(s.margin), '-3.5%');
  assert.equal(s.status, 'loss');
  assert.ok(Math.abs(s.requiredRevenue - 49680 / 0.85) < 1e-6);
  assert.ok(Math.abs(s.additionalRevenue - (49680 / 0.85 - 48000)) < 1e-6);
  assert.equal(blue.cost, 43200); // baseline untouched
});

test('additional revenue never negative', () => {
  const atlas = analyzeCustomer(demo.customers[0]);
  assert.equal(simulate(atlas, 0).additionalRevenue, 0);
});

test('efficiency calculator', () => {
  const e = efficiency({ quotes: 54, manualMin: 45, appMin: 8, rate: 35 });
  assert.ok(Math.abs(e.manualHours - 40.5) < 1e-9);
  assert.ok(Math.abs(e.hoursSaved - (54 * 37) / 60) < 1e-9);
  assert.ok(Math.abs(e.annualValue - e.monthlyValue * 12) < 1e-9);
  assert.equal(efficiency({ quotes: 10, manualMin: 0, appMin: 0, rate: 35 }).reductionPct, 0);
  const d = efficiencyDefaults(demo.customers);
  assert.equal(d.quotes, 54);
  assert.equal(d.manualMin, 45);
});

test('CSV validation', () => {
  assert.ok(loadCustomersFromCsv('a,b\n1,2').errors.length);
  const r = loadCustomersFromCsv('customer,monthly_revenue,monthly_operating_cost\nA,"$1,000",800\nB,0,5\nC,abc,5\n,10,5\nD,500,-1');
  assert.equal(r.customers.length, 1);
  assert.equal(r.customers[0].revenue, 1000);
  assert.equal(r.warnings.length, 4);
  assert.equal(parseNumber('(1,200)'), -1200);
  assert.ok(Number.isNaN(parseNumber('12x')));
});

test('insights are generated and data-backed', () => {
  const analyzed = analyzeAll(demo.customers);
  const ins = generateInsights({ analyzed, summary: portfolioSummary(analyzed), target: 0.15, effInputs: efficiencyDefaults(demo.customers) });
  const titles = ins.map((i) => i.title).join('\n');
  assert.match(titles, /BluePeak Distribution has the lowest gross margin/);
  assert.match(titles, /Nova Commerce contributes the largest monthly gross profit/);
  assert.match(titles, /15% operating cost increase would make BluePeak Distribution loss-making/);
  ins.forEach((i) => assert.ok(i.evidence && i.action));
});
