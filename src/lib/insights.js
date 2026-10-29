import { fmtCurrency, fmtPct, fmtNumber, fmtDecimal, fmtHours } from './format.js';
import { simulate, efficiency, safeDiv } from './finance.js';

const list = (names) => {
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
};
const r9 = (x) => Math.round(x * 1e9) / 1e9;

/**
 * Deterministic, rules-based insights computed from the current numbers.
 * Every item carries its `evidence` so the claim can be checked. No model is involved.
 * type: 'risk' | 'opportunity' | 'info'
 */
export function generateInsights({ analyzed, summary, target, effInputs }) {
  const out = [];
  if (!analyzed.length) return out;
  const t = fmtPct(target, 0);
  const by = (fn) => [...analyzed].sort(fn);

  // 1. Portfolio health
  const healthy = summary.margin >= target;
  out.push({
    id: 'portfolio',
    type: summary.profit < 0 ? 'risk' : healthy ? 'opportunity' : 'risk',
    title: `Portfolio margin is ${fmtPct(summary.margin)} (${healthy ? 'above' : 'below'} the ${t} target)`,
    detail: `Total monthly profit of ${fmtCurrency(summary.profit)} on ${fmtCurrency(summary.revenue)} revenue across ${summary.customers} customers. Calculated as total profit ÷ total revenue.`,
    evidence: `${fmtCurrency(summary.profit)} ÷ ${fmtCurrency(summary.revenue)} = ${fmtPct(summary.margin, 2)}`,
    action: healthy ? 'Monitor low-margin accounts so they do not dilute the portfolio.' : 'Review pricing assumptions across the portfolio.',
  });

  // 2. Lowest margin
  const [lowest] = by((a, b) => a.margin - b.margin);
  if (analyzed.length > 1) {
    out.push({
      id: 'lowest',
      type: r9(lowest.margin) < r9(target) ? 'risk' : 'info',
      title: `${lowest.name} has the lowest gross margin in the portfolio`,
      detail: `${fmtPct(lowest.margin)} margin on ${fmtCurrency(lowest.revenue)} revenue and ${fmtCurrency(lowest.cost)} operating cost (${fmtCurrency(lowest.profit)} monthly profit).`,
      evidence: `${fmtCurrency(lowest.profit)} ÷ ${fmtCurrency(lowest.revenue)} = ${fmtPct(lowest.margin, 2)}`,
      action: 'Investigate operating costs and review pricing assumptions for this account.',
    });
  }

  // 3. Below target
  const below = analyzed.filter((c) => r9(c.margin) < r9(target));
  out.push(
    below.length
      ? {
          id: 'below',
          type: 'risk',
          title: `${below.length === 1 ? 'One customer is' : `${below.length} customers are`} below the ${t} target margin`,
          detail: `${list(below.map((c) => `${c.name} (${fmtPct(c.margin)})`))}. Together they generate ${fmtCurrency(below.reduce((s, c) => s + c.profit, 0))} of monthly profit on ${fmtCurrency(below.reduce((s, c) => s + c.revenue, 0))} of revenue.`,
          evidence: `${below.length} of ${analyzed.length} customers have margin < ${t}`,
          action: 'Monitor low-margin accounts and consider a pricing or scope review.',
        }
      : {
          id: 'below',
          type: 'opportunity',
          title: `All ${analyzed.length} customers meet the ${t} target margin`,
          detail: 'No account currently falls below the target. The focus can shift to protecting margin against cost inflation.',
          evidence: `0 of ${analyzed.length} customers have margin < ${t}`,
          action: 'Keep monitoring the accounts with the least cost headroom.',
        },
  );

  // 4. Largest profit contributor
  const [top] = by((a, b) => b.profit - a.profit);
  const share = safeDiv(top.profit, summary.profit);
  if (summary.profit > 0 && top.profit > 0) {
    out.push({
      id: 'top',
      type: 'opportunity',
      title: `${top.name} contributes the largest monthly gross profit`,
      detail: `${fmtCurrency(top.profit)} per month, ${fmtPct(share)} of portfolio profit, at a ${fmtPct(top.margin)} margin.`,
      evidence: `${fmtCurrency(top.profit)} ÷ ${fmtCurrency(summary.profit)} = ${fmtPct(share, 2)} of portfolio profit`,
      action: share > 0.3 ? 'Protect this relationship and watch concentration risk.' : 'Use this account as a benchmark for pricing and cost-to-serve.',
    });
  }

  // 5. Cost-shock sensitivity
  const withHeadroom = analyzed.filter((c) => c.headroomToZero != null).sort((a, b) => a.headroomToZero - b.headroomToZero);
  const tight = withHeadroom[0];
  if (tight && tight.headroomToZero >= 0) {
    const at15 = simulate(tight, 0.15, target);
    const lossAt15 = analyzed.filter((c) => simulate(c, 0.15, target).status === 'loss');
    const lossTitle = lossAt15.length
      ? `A 15% operating cost increase would make ${list(lossAt15.map((c) => c.name))} loss-making`
      : `${tight.name} has the least cost headroom: profit turns negative if costs rise more than ${fmtPct(tight.headroomToZero)}`;
    out.push({
      id: 'shock',
      type: tight.headroomToZero < 0.3 ? 'risk' : 'info',
      title: lossTitle,
      detail: `${tight.name} can absorb a cost increase of ${fmtPct(tight.headroomToZero)} before reaching break-even. At +15%, its cost would be ${fmtCurrency(at15.cost)}, profit ${fmtCurrency(at15.profit)}, margin ${fmtPct(at15.margin)}.`,
      evidence: `Break-even headroom = revenue ÷ cost − 1 = ${fmtCurrency(tight.revenue)} ÷ ${fmtCurrency(tight.cost)} − 1 = ${fmtPct(tight.headroomToZero, 2)}`,
      action: 'Run this customer through the Scenario Simulator and review pricing assumptions.',
    });
  }

  // 6. Accounts sitting on the edge of the target
  const edge = analyzed.filter(
    (c) => r9(c.margin) >= r9(target) && c.headroomToTarget != null && c.headroomToTarget < 0.05,
  );
  if (edge.length) {
    out.push({
      id: 'edge',
      type: 'risk',
      title: `${list(edge.map((c) => c.name))} ${edge.length === 1 ? 'has' : 'have'} almost no buffer above the ${t} target`,
      detail: `A cost increase of ${edge.length === 1 ? fmtPct(edge[0].headroomToTarget) : `just ${fmtPct(Math.max(...edge.map((c) => c.headroomToTarget)))}`} would push ${edge.length === 1 ? 'it' : 'them'} below target.`,
      evidence: edge.map((c) => `${c.name}: margin ${fmtPct(c.margin, 2)}, headroom ${fmtPct(c.headroomToTarget, 2)}`).join('; '),
      action: 'Monitor low-margin accounts and agree cost-pass-through terms where possible.',
    });
  }

  // 7. Operational intensity (only if data provided)
  const withHours = analyzed.filter((c) => c.hoursPer1kUnits != null);
  if (withHours.length > 1) {
    const heavy = [...withHours].sort((a, b) => b.hoursPer1kUnits - a.hoursPer1kUnits)[0];
    const light = [...withHours].sort((a, b) => a.hoursPer1kUnits - b.hoursPer1kUnits)[0];
    const totalHours = withHours.reduce((s, c) => s + c.laborHours, 0);
    const totalUnits = withHours.reduce((s, c) => s + c.units, 0);
    const avg = safeDiv(totalHours * 1000, totalUnits);
    out.push({
      id: 'labor',
      type: heavy.hoursPer1kUnits > avg * 1.1 ? 'risk' : 'info',
      title: `${heavy.name} needs the most labor per unit processed`,
      detail: `${fmtDecimal(heavy.hoursPer1kUnits)} labor hours per 1,000 units versus a portfolio average of ${fmtDecimal(avg)} (best: ${light.name} at ${fmtDecimal(light.hoursPer1kUnits)}). Labor is already inside operating cost, so this is a productivity signal, not an extra expense.`,
      evidence: `${fmtNumber(heavy.laborHours)} hours ÷ ${fmtNumber(heavy.units)} units × 1,000 = ${fmtDecimal(heavy.hoursPer1kUnits)}`,
      action: 'Evaluate labor productivity and workflow design for this account.',
    });
  }

  const withCpu = analyzed.filter((c) => c.costPerUnit != null);
  if (withCpu.length > 1) {
    const worst = [...withCpu].sort((a, b) => b.costPerUnit - a.costPerUnit)[0];
    const best = [...withCpu].sort((a, b) => a.costPerUnit - b.costPerUnit)[0];
    out.push({
      id: 'cpu',
      type: 'info',
      title: `${worst.name} has the highest cost per unit`,
      detail: `$${worst.costPerUnit.toFixed(2)} per unit versus $${best.costPerUnit.toFixed(2)} at ${best.name}. Revenue per unit is $${worst.revenuePerUnit.toFixed(2)}.`,
      evidence: `${fmtCurrency(worst.cost)} ÷ ${fmtNumber(worst.units)} units = $${worst.costPerUnit.toFixed(2)}`,
      action: 'Investigate operating costs and compare cost-to-serve with the best-performing account.',
    });
  }

  // 8. Automation capacity (hypothetical)
  if (effInputs) {
    const e = efficiency(effInputs);
    if (e.hoursSaved > 0) {
      out.push({
        id: 'automation',
        type: 'opportunity',
        title: `Quote automation could free up about ${fmtHours(e.hoursSaved)} of analyst time per month`,
        detail: `Based on ${fmtNumber(effInputs.quotes)} quotes/month, ${effInputs.manualMin} min manual versus ${effInputs.appMin} min app-assisted (${fmtPct(e.reductionPct, 0)} reduction). This is a hypothetical capacity estimate, not a verified saving or payroll reduction.`,
        evidence: `${fmtHours(e.manualHours)} manual − ${fmtHours(e.appHours)} app-assisted = ${fmtHours(e.hoursSaved)}`,
        action: 'Pilot on a few accounts and measure actual preparation time before relying on the estimate.',
      });
    }
  }

  return out;
}

/** One-line headline for the executive overview (also rules-based). */
export function headline({ summary, analyzed, target }) {
  if (!analyzed.length) return null;
  const profitable = summary.profit > 0;
  const below = analyzed.filter((c) => r9(c.margin) < r9(target));
  const [lowest] = [...analyzed].sort((a, b) => a.margin - b.margin);
  const tone = !profitable ? 'bad' : below.length ? 'warn' : 'good';
  const first = profitable
    ? `The portfolio is profitable at a ${fmtPct(summary.margin)} margin (${fmtCurrency(summary.profit)} per month).`
    : `The portfolio is losing ${fmtCurrency(-summary.profit)} per month (${fmtPct(summary.margin)} margin).`;
  const second = below.length
    ? `${below.length} of ${summary.customers} customers ${below.length === 1 ? 'is' : 'are'} below the ${fmtPct(target, 0)} target; ${lowest.name} is lowest at ${fmtPct(lowest.margin)}.`
    : `All ${summary.customers} customers meet the ${fmtPct(target, 0)} target.`;
  const stress = analyzed.filter((c) => simulate(c, 0.15, target).status === 'loss');
  const third = stress.length
    ? `A 15% cost increase would make ${list(stress.map((c) => c.name))} loss-making.`
    : `No customer turns loss-making under a 15% cost increase.`;
  return { tone, text: [first, second, third] };
}
