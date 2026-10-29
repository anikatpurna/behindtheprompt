import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, ArrowRight, CheckCircle2, DollarSign, Lightbulb, Percent, Receipt, TrendingUp, Users, XOctagon } from 'lucide-react';
import { fmtCurrency, fmtCurrencyCompact, fmtNumber, fmtPct } from '../lib/format.js';
import { STATUS } from '../lib/finance.js';
import { Card, CardHeader, ChartTooltip, CATEGORICAL, COLORS, KpiCard, SectionHeader, StatusBadge, cx, short } from './ui.jsx';

const MAX_BARS = 12;
const axis = { fontSize: 12, fill: '#64748B' };

export default function Overview({ analyzed, summary, target, headline, insights, onNavigate, onSelect }) {
  const byRevenue = [...analyzed].sort((a, b) => b.revenue - a.revenue);
  const shown = byRevenue.slice(0, MAX_BARS);
  const capped = analyzed.length > MAX_BARS;
  const byProfit = [...shown].sort((a, b) => b.profit - a.profit);
  const byMargin = [...shown].sort((a, b) => b.margin - a.margin);
  const barH = (n) => Math.max(220, n * 46 + 50);

  // Profit contribution (positive profits only; tail grouped as "Other")
  const positives = [...analyzed].filter((c) => c.profit > 0).sort((a, b) => b.profit - a.profit);
  const totalPos = positives.reduce((s, c) => s + c.profit, 0);
  const slices = positives.slice(0, 6).map((c) => ({ name: c.name, value: c.profit }));
  const rest = positives.slice(6).reduce((s, c) => s + c.profit, 0);
  if (rest > 0) slices.push({ name: 'Other customers', value: rest });
  const negatives = analyzed.filter((c) => c.profit < 0);

  const marginTone = summary.status === 'healthy' ? 'good' : summary.status === 'watchlist' ? 'warn' : 'bad';
  const hl = headline;
  const HlIcon = hl.tone === 'good' ? CheckCircle2 : hl.tone === 'warn' ? AlertTriangle : XOctagon;
  const hlStyle = {
    good: 'border-green-200 bg-green-50 text-green-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    bad: 'border-red-200 bg-red-50 text-red-800',
  }[hl.tone];

  const attention = [...analyzed].sort((a, b) => a.margin - b.margin).filter((c) => c.status !== 'healthy').slice(0, 5);
  const topInsights = [...insights].sort((a, b) => ({ risk: 0, opportunity: 1, info: 2 }[a.type] - { risk: 0, opportunity: 1, info: 2 }[b.type])).slice(0, 3);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Portfolio health"
        title="Executive Overview"
        subtitle="Are we profitable? Which customers need attention? What happens if costs rise? Start here."
      />

      <div role="status" className={cx('flex animate-fadeUp gap-3 rounded-2xl border p-4 sm:p-5', hlStyle)}>
        <HlIcon className="mt-0.5 shrink-0" size={22} />
        <div className="text-sm leading-relaxed sm:text-[15px]">
          <p className="font-semibold">{hl.text[0]}</p>
          <p>
            {hl.text[1]} {hl.text[2]}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={DollarSign} label="Monthly revenue" value={summary.revenue} format={fmtCurrency} sub={`Across ${summary.customers} customers`} tone="blue" delay={0}
          tip="Sum of monthly revenue for every customer in the dataset." />
        <KpiCard icon={Receipt} label="Operating costs" value={summary.cost} format={fmtCurrency} sub={`${fmtPct(summary.revenue ? summary.cost / summary.revenue : 0)} of revenue`} tone="neutral" delay={50}
          tip="Sum of monthly operating costs. Labor is assumed to be already included, so it is never added again." />
        <KpiCard icon={TrendingUp} label="Gross profit" value={summary.profit} format={fmtCurrency} sub="Revenue − operating cost" tone={summary.profit >= 0 ? 'teal' : 'bad'} delay={100}
          tip="Total monthly revenue minus total monthly operating costs." />
        <KpiCard icon={Percent} label="Portfolio margin" value={summary.margin} format={(v) => fmtPct(v)} tone={marginTone} delay={150}
          sub={<span className="inline-flex items-center gap-2"><StatusBadge status={summary.status} /> target {fmtPct(target, 0)}</span>}
          tip="Total gross profit ÷ total revenue. This is a revenue-weighted figure, not an average of each customer's margin." />
        <KpiCard icon={AlertTriangle} label={`Below ${fmtPct(target, 0)} margin`} value={summary.belowTarget} format={(v) => fmtNumber(Math.round(v))}
          sub={summary.belowTarget ? `${fmtPct(summary.belowTarget / summary.customers, 0)} of customers need attention` : 'All customers meet the target'}
          tone={summary.belowTarget ? 'bad' : 'good'} delay={200}
          tip="Customers whose gross margin is strictly below the target margin (editable in the top bar)." />
        <KpiCard icon={Users} label="Customers analyzed" value={summary.customers} format={(v) => fmtNumber(Math.round(v))}
          sub={`${summary.counts.healthy} healthy · ${summary.counts.watchlist} watchlist · ${summary.counts.atRisk + summary.counts.loss} at risk or loss`} tone="teal" delay={250}
          tip="Number of valid customer rows in the active dataset." />
      </div>

      {capped && <p className="text-xs text-slate-500">Charts show the top {MAX_BARS} customers by revenue. Totals include all {analyzed.length}.</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Revenue vs operating cost" subtitle="Monthly, by customer" tip="Compares what each customer pays with what it costs to serve. The gap is gross profit." />
          <div className="h-[300px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer>
              <BarChart data={shown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis dataKey="name" tickFormatter={(n) => short(n.split(' ')[0], 10)} tick={axis} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtCurrencyCompact} tick={axis} tickLine={false} axisLine={false} width={52} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip formatter={fmtCurrency} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill={COLORS.blue} radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="cost" name="Operating cost" fill={COLORS.slate} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Gross profit by customer" subtitle="Monthly profit comparison" tip="Revenue minus operating cost per customer. Red bars indicate a loss." />
          <div className="px-2 pb-4 pt-4 sm:px-4" style={{ height: barH(byProfit.length) }}>
            <ResponsiveContainer>
              <BarChart data={byProfit} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={COLORS.grid} />
                <XAxis type="number" tickFormatter={fmtCurrencyCompact} tick={axis} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={118} tickFormatter={(n) => short(n, 18)} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip formatter={fmtCurrency} />} />
                <ReferenceLine x={0} stroke="#94A3B8" />
                <Bar dataKey="profit" name="Gross profit" radius={[0, 6, 6, 0]} maxBarSize={26}>
                  {byProfit.map((c) => <Cell key={c.id} fill={c.profit < 0 ? COLORS.bad : COLORS.teal} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Gross margin by customer"
            subtitle={`Colour = status · dashed line = ${fmtPct(target, 0)} target`}
            tip="Gross profit ÷ revenue for each customer. Bar colours follow the status rules: Healthy, Watchlist, At Risk, Loss-Making."
          />
          <div className="px-2 pb-4 pt-4 sm:px-4" style={{ height: barH(byMargin.length) }}>
            <ResponsiveContainer>
              <BarChart data={byMargin} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={COLORS.grid} />
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={axis} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={118} tickFormatter={(n) => short(n, 18)} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip formatter={(v, p) => `${fmtPct(v)} · ${STATUS[p.payload.status].label}`} />} />
                <ReferenceLine x={0} stroke="#94A3B8" />
                <ReferenceLine x={target} stroke={COLORS.navy} strokeDasharray="4 4" label={{ value: `${fmtPct(target, 0)}`, position: 'top', fontSize: 11, fill: COLORS.navy }} />
                <Bar dataKey="margin" name="Gross margin" radius={[0, 6, 6, 0]} maxBarSize={26}>
                  {byMargin.map((c) => <Cell key={c.id} fill={STATUS[c.status].color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Profit contribution" subtitle="Share of total monthly gross profit" tip="Each customer's profit as a share of the profit made by all profitable customers." />
          {slices.length ? (
            <div className="grid items-center gap-2 px-4 pb-5 pt-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none">
                      {slices.map((s, i) => <Cell key={s.name} fill={CATEGORICAL[i % CATEGORICAL.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v) => `${fmtCurrency(v)} · ${fmtPct(v / totalPos)}`} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {slices.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORICAL[i % CATEGORICAL.length] }} />
                    <span className="truncate text-slate-600">{s.name}</span>
                    <span className="ml-auto font-semibold text-navy tabular">{fmtPct(s.value / totalPos)}</span>
                  </li>
                ))}
                {negatives.length > 0 && (
                  <li className="text-xs text-red-600">{negatives.length} loss-making customer{negatives.length > 1 ? 's' : ''} not shown ({fmtCurrency(negatives.reduce((s, c) => s + c.profit, 0))}/mo).</li>
                )}
              </ul>
            </div>
          ) : (
            <p className="p-6 text-sm text-slate-500">No customer is currently profitable, so there is no contribution to show.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Needs attention" subtitle="Lowest margins first" />
          <ul className="divide-y divide-slate-100 px-2 pb-3 pt-2">
            {attention.length === 0 && <li className="px-3 py-6 text-sm text-slate-500">Every customer is Healthy.</li>}
            {attention.map((c) => (
              <li key={c.id}>
                <button onClick={() => onSelect(c.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-mist">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy">{c.name}</span>
                    <span className="text-xs text-slate-500">{fmtCurrency(c.profit)} profit · {c.headroomToZero != null && c.headroomToZero >= 0 ? `breaks even at +${fmtPct(c.headroomToZero)} cost` : 'already below break-even'}</span>
                  </span>
                  <span className="text-sm font-bold tabular text-navy">{fmtPct(c.margin)}</span>
                  <StatusBadge status={c.status} />
                  <ArrowRight size={16} className="text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Key insights"
            subtitle="Rules-based, calculated from the data above"
            right={<button onClick={() => onNavigate('insights')} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:underline">All insights <ArrowRight size={14} /></button>}
          />
          <ul className="space-y-3 px-5 pb-5 pt-4">
            {topInsights.map((i) => (
              <li key={i.id} className="flex gap-3">
                <span className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', i.type === 'risk' ? 'bg-red-50 text-red-600' : i.type === 'opportunity' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500')}>
                  {i.type === 'risk' ? <AlertTriangle size={15} /> : <Lightbulb size={15} />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">{i.title}</p>
                  <p className="text-xs text-slate-500">{i.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
