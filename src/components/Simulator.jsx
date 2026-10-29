import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowRight, Calculator, FlaskConical, RotateCcw, Sparkles, TrendingDown } from 'lucide-react';
import { fmtCurrency, fmtCurrencyCompact, fmtPct, fmtPts, fmtSignedCurrency } from '../lib/format.js';
import { MAX_COST_INCREASE, STATUS, marginCurve, simulate, simulatePortfolio } from '../lib/finance.js';
import { AnimatedValue, Card, CardHeader, ChartTooltip, COLORS, Delta, EmptyState, InfoTip, MarginGauge, SectionHeader, StatusBadge, cx } from './ui.jsx';

const PRESETS = [5, 10, 15, 20];
const axis = { fontSize: 12, fill: '#64748B' };

export default function Simulator({ analyzed, target, activeId, onPick, pct, setPct }) {
  const base = analyzed.find((c) => c.id === activeId) || analyzed[0];
  const sim = useMemo(() => (base ? simulate(base, pct / 100, target) : null), [base, pct, target]);
  const curve = useMemo(() => (base ? marginCurve(base, target, MAX_COST_INCREASE, 0.5) : []), [base, target]);
  const portfolio = useMemo(() => simulatePortfolio(analyzed, pct / 100, target), [analyzed, pct, target]);
  const basePortfolioMargin = useMemo(() => simulatePortfolio(analyzed, 0, target).margin, [analyzed, target]);

  if (!base || !sim) return <EmptyState icon={FlaskConical} title="No customers to simulate" body="Upload a CSV or reset to the demo data." />;

  const s = STATUS[sim.status];
  const changed = sim.status !== base.status;
  const chartData = [
    { metric: 'Revenue', baseline: base.revenue, simulated: base.revenue },
    { metric: 'Operating cost', baseline: base.cost, simulated: sim.cost },
    { metric: 'Gross profit', baseline: base.profit, simulated: sim.profit },
  ];
  const margins = curve.map((p) => p.margin);
  const yMin = Math.min(-5, Math.floor((Math.min(...margins) - 1) / 5) * 5);
  const yMax = Math.ceil((Math.max(...margins, target * 100) + 1) / 5) * 5;
  const yTicks = [];
  for (let t = yMin; t <= yMax; t += (yMax - yMin) > 40 ? 10 : 5) yTicks.push(t);
  const beX = base.headroomToZero != null ? base.headroomToZero * 100 : null;

  const explanation = (() => {
    const parts = [
      `If ${base.name}'s operating cost rises ${pct}%, it grows from ${fmtCurrency(base.cost)} to ${fmtCurrency(sim.cost)} (${fmtSignedCurrency(sim.dCost)} per month) while revenue stays at ${fmtCurrency(base.revenue)}.`,
      `Monthly profit moves from ${fmtCurrency(base.profit)} to ${fmtCurrency(sim.profit)} and gross margin from ${fmtPct(base.margin)} to ${fmtPct(sim.margin)} (${fmtPts(sim.dMargin)}).`,
    ];
    if (pct === 0) return 'Move the slider or pick a preset to see how a cost increase would change this customer’s profitability.';
    if (changed) parts.push(`That changes the customer’s status from ${STATUS[base.status].label} to ${s.label}.`);
    else parts.push(`The customer stays ${s.label}.`);
    if (sim.additionalRevenue > 0)
      parts.push(`Holding costs at the simulated level, revenue would need to reach ${fmtCurrency(sim.requiredRevenue)} (+${fmtCurrency(sim.additionalRevenue)}, ${fmtPct(sim.additionalPct)}) to restore a ${fmtPct(target, 0)} margin.`);
    else parts.push(`Even at this cost level the account still clears the ${fmtPct(target, 0)} target margin, so no extra revenue is required.`);
    return parts.join(' ');
  })();

  const many = analyzed.length > 10;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="What-if analysis"
        title="Scenario Simulator"
        subtitle="Drag the slider to see how rising operating costs change profit, margin and risk status. Your original data is never modified."
      />

      {/* Customer picker */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</span>
          <span className="text-xs text-slate-400">{analyzed.length} available</span>
        </div>
        {many ? (
          <select value={base.id} onChange={(e) => onPick(e.target.value)} aria-label="Select customer" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-teal">
            {analyzed.map((c) => <option key={c.id} value={c.id}>{c.name} · {fmtPct(c.margin)}</option>)}
          </select>
        ) : (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select customer">
            {analyzed.map((c) => {
              const on = c.id === base.id;
              return (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => onPick(c.id)}
                  className={cx('flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left text-sm transition', on ? 'border-navy bg-navy text-white shadow-lift' : 'border-slate-200 bg-white hover:border-slate-300')}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[c.status].color }} />
                  <span className="font-semibold">{c.name}</span>
                  <span className={cx('text-xs tabular', on ? 'text-slate-300' : 'text-slate-400')}>{fmtPct(c.margin)}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Controls */}
      <Card className="overflow-visible p-5 sm:p-7">
        <div className="grid items-center gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Operating cost increase
              <InfoTip text="Applies the percentage to this customer's baseline operating cost. Revenue is held constant." align="left" />
            </div>
            <div className="mt-1 text-6xl font-extrabold leading-none tracking-tight tabular" style={{ color: s.color, transition: 'color .3s' }}>
              +<AnimatedValue value={pct} format={(v) => v.toFixed(v % 1 && Math.abs(v - Math.round(v)) > 0.05 ? 1 : 0)} duration={200} />%
            </div>
          </div>
          <div>
            <input
              type="range"
              min={0}
              max={MAX_COST_INCREASE}
              step={0.5}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              aria-label="Operating cost increase percent"
              aria-valuetext={`${pct} percent`}
              className="pp-range"
              style={{ '--fill': `${(pct / MAX_COST_INCREASE) * 100}%`, '--accent': s.color }}
            />
            <div className="relative mt-2 h-4 text-[11px] font-medium text-slate-400 tabular">
              {[0, 5, 10, 15, 20, 25, 30].map((t) => (
                <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / MAX_COST_INCREASE) * 100}%` }}>{t}%</span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPct(p)}
                  aria-pressed={pct === p}
                  className={cx('rounded-xl border px-4 py-2 text-sm font-semibold tabular transition active:scale-95', pct === p ? 'border-navy bg-navy text-white shadow-lift' : 'border-slate-200 bg-white text-navy hover:border-teal hover:text-teal-600')}
                >
                  +{p}% operating cost
                </button>
              ))}
              <button onClick={() => setPct(0)} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-navy active:scale-95">
                <RotateCcw size={15} /> Reset scenario
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Side by side */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Baseline</h3>
            <StatusBadge status={base.status} />
          </div>
          <dl className="mt-5 space-y-5">
            <Row label="Monthly revenue" value={fmtCurrency(base.revenue)} />
            <Row label="Operating cost" value={fmtCurrency(base.cost)} />
            <Row label="Monthly profit" value={fmtCurrency(base.profit)} neg={base.profit < 0} big />
            <Row label="Gross margin" value={fmtPct(base.margin)} neg={base.margin < 0} big />
          </dl>
        </Card>

        <div className="hidden items-center lg:flex">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-navy text-teal shadow-lift"><ArrowRight size={18} /></span>
        </div>

        <Card className="relative p-5 sm:p-6" style={{ boxShadow: `0 0 0 2px ${s.color}33, 0 12px 32px rgba(11,18,32,0.10)`, transition: 'box-shadow .3s' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: s.color }}>Simulated · +{pct}% cost</h3>
            <StatusBadge status={sim.status} />
          </div>
          <dl className="mt-5 space-y-5">
            <Row label="Monthly revenue" value={fmtCurrency(base.revenue)} />
            <Row label="New operating cost" value={sim.cost} format={fmtCurrency} delta={<Delta value={sim.dCost} format={fmtSignedCurrency} invert />} />
            <Row label="New monthly profit" value={sim.profit} format={fmtCurrency} neg={sim.profit < 0} big delta={<Delta value={sim.dProfit} format={fmtSignedCurrency} />} />
            <Row label="New gross margin" value={sim.margin} format={(v) => fmtPct(v)} neg={sim.margin < 0} big delta={<Delta value={sim.dMargin} format={fmtPts} />} />
          </dl>
          {changed && (
            <div className="mt-5 flex animate-fadeUp items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: s.soft, color: s.text }}>
              <TrendingDown size={16} /> Status change: {STATUS[base.status].label} → {s.label}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Margin position" subtitle="Hollow marker = baseline · filled marker = simulated · zones follow the status rules" tip="Red: below 0%. Orange: 0% up to the target. Amber: target up to target + 5 points. Green: healthy." />
        <div className="px-6 pb-3 pt-1"><MarginGauge margin={sim.margin} target={target} compare={base.margin} /></div>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Baseline vs simulated" subtitle="Monthly revenue, cost and gross profit" />
          <div className="h-[300px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis dataKey="metric" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtCurrencyCompact} tick={axis} tickLine={false} axisLine={false} width={52} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip formatter={fmtCurrency} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#94A3B8" />
                <Bar dataKey="baseline" name="Baseline" fill={COLORS.slate} radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={350} />
                <Bar dataKey="simulated" name="Simulated" fill={COLORS.teal} radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={350}>
                  {chartData.map((d) => <Cell key={d.metric} fill={d.metric === 'Gross profit' && d.simulated < 0 ? COLORS.bad : d.metric === 'Operating cost' ? COLORS.navy : COLORS.teal} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Margin vs cost increase" subtitle="The dot follows the slider; red zone = loss-making" tip="Gross margin = (revenue − cost × (1 + increase)) ÷ revenue, with revenue held constant." />
          <div className="h-[300px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer>
              <LineChart data={curve} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis type="number" dataKey="pct" domain={[0, MAX_COST_INCREASE]} ticks={[0, 5, 10, 15, 20, 25, 30]} tickFormatter={(v) => `+${v}%`} tick={axis} tickLine={false} axisLine={false} />
                <YAxis domain={[yMin, yMax]} ticks={yTicks} tickFormatter={(v) => `${Math.round(v)}%`} tick={axis} tickLine={false} axisLine={false} width={44} allowDataOverflow />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => `Operating cost +${l}%`} formatter={(v) => `${v.toFixed(1)}%`} />} />
                <ReferenceArea y1={yMin} y2={0} fill={COLORS.bad} fillOpacity={0.07} />
                <ReferenceLine y={0} stroke={COLORS.bad} strokeDasharray="4 4" />
                <ReferenceLine y={target * 100} stroke={COLORS.warn} strokeDasharray="4 4" label={{ value: `${fmtPct(target, 0)} target`, position: 'insideTopRight', fontSize: 11, fill: '#B45309' }} />
                {beX != null && beX > 0 && beX <= MAX_COST_INCREASE && (
                  <ReferenceLine x={beX} stroke={COLORS.bad} strokeDasharray="2 3" label={{ value: `break-even +${beX.toFixed(1)}%`, position: 'insideBottomLeft', fontSize: 11, fill: COLORS.bad }} />
                )}
                <Line type="linear" dataKey="margin" name="Gross margin" stroke={COLORS.navy} strokeWidth={3} dot={false} isAnimationActive={false} />
                <ReferenceDot x={pct} y={sim.margin * 100} r={9} fill={s.color} stroke="#fff" strokeWidth={3} ifOverflow="extendDomain" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Required revenue + explanation */}
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-teal-600"><Calculator size={16} /></span>
            Revenue needed for {fmtPct(target, 0)} margin
            <InfoTip align="right" text={`Required revenue = simulated operating cost ÷ (1 − ${fmtPct(target, 0)}). Additional revenue needed = MAX(0, required revenue − current revenue). Costs are held at the simulated level.`} />
          </div>
          <dl className="mt-5 space-y-4">
            <Row label="Required monthly revenue" value={sim.requiredRevenue} format={fmtCurrency} />
            <Row label="Current monthly revenue" value={fmtCurrency(base.revenue)} />
            <div className="rounded-xl p-4" style={{ background: sim.additionalRevenue > 0 ? '#FFF7ED' : '#F0FDF4' }}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Additional revenue needed</dt>
              <dd className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-navy"><AnimatedValue value={sim.additionalRevenue} format={fmtCurrency} /></span>
                <span className="text-sm font-medium text-slate-500">{sim.additionalRevenue > 0 ? `+${fmtPct(sim.additionalPct)} vs today` : 'Already at target'}</span>
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6 xl:col-span-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-500"><Sparkles size={16} /></span>
            What this scenario means
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-700" aria-live="polite">{explanation}</p>
          {base.headroomToZero != null && (
            <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-slate-600">
              {base.headroomToZero < 0
                ? `${base.name} is already below break-even before any cost increase.`
                : `Break-even point: operating cost can rise ${fmtPct(base.headroomToZero)} (to ${fmtCurrency(base.revenue)}) before ${base.name} stops making a profit.`}
            </p>
          )}
        </Card>
      </div>

      {/* Portfolio stress test */}
      <Card>
        <CardHeader
          title={`Portfolio under a +${pct}% cost increase`}
          subtitle="Same increase applied to every customer, revenue unchanged"
          right={
            <div className="text-right text-sm">
              <div className="text-xs text-slate-500">Portfolio margin</div>
              <div className="font-bold tabular text-navy">{fmtPct(basePortfolioMargin)} → {fmtPct(portfolio.margin)}</div>
              <div className="text-xs text-slate-500">{portfolio.lossCount} loss-making · {portfolio.belowTarget} below target</div>
            </div>
          }
        />
        <div className="overflow-x-auto px-3 pb-4 pt-3 sm:px-5">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Customer</th><th className="px-3 text-right">Baseline margin</th><th className="px-3 text-right">Simulated margin</th><th className="px-3 text-right">Simulated profit</th><th className="pl-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.rows.map(({ customer: c, sim: r }) => (
                <tr key={c.id} onClick={() => onPick(c.id)} className={cx('cursor-pointer border-t border-slate-100 transition hover:bg-mist', c.id === base.id && 'bg-teal-50/60')}>
                  <td className="py-3 pr-3 font-semibold text-navy">{c.name}</td>
                  <td className="px-3 text-right tabular">{fmtPct(c.margin)}</td>
                  <td className="px-3 text-right font-bold tabular text-navy">{fmtPct(r.margin)}</td>
                  <td className={cx('px-3 text-right tabular', r.profit < 0 && 'text-red-600')}>{fmtCurrency(r.profit)}</td>
                  <td className="pl-3"><span className="inline-flex items-center gap-2">{r.status !== c.status && <StatusBadge status={c.status} className="opacity-50" />}{r.status !== c.status && <ArrowRight size={12} className="text-slate-400" />}<StatusBadge status={r.status} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, format, neg, big, delta }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right">
        <div className={cx('font-bold tabular', big ? 'text-2xl' : 'text-lg', neg ? 'text-red-600' : 'text-navy')}>
          {format ? <AnimatedValue value={value} format={format} /> : value}
        </div>
        {delta && <div className="mt-0.5">{delta}</div>}
      </dd>
    </div>
  );
}
