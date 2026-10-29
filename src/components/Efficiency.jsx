import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, CalendarClock, Clock, Hourglass, Info, Percent, RotateCcw, Timer } from 'lucide-react';
import { fmtCurrency, fmtHours, fmtNumber, fmtPct } from '../lib/format.js';
import { efficiency } from '../lib/finance.js';
import { AnimatedValue, Card, CardHeader, ChartTooltip, COLORS, InfoTip, KpiCard, SectionHeader } from './ui.jsx';

const axis = { fontSize: 12, fill: '#64748B' };

function Field({ label, suffix, prefix, value, onChange, min = 0, max, step = 1, tip }) {
  const n = Number.isFinite(value) ? value : 0;
  const sliderMax = Math.max(max, n);
  return (
    <div className="rounded-xl bg-mist p-4">
      <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        <InfoTip text={tip} align="left" />
      </label>
      <div className="mt-2 flex items-center gap-2">
        {prefix && <span className="text-slate-400">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          aria-label={label}
          onChange={(e) => {
            const v = e.target.value === '' ? NaN : Number(e.target.value);
            onChange(Number.isNaN(v) ? NaN : Math.max(min, v));
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg font-bold tabular text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
        {suffix && <span className="whitespace-nowrap text-sm text-slate-400">{suffix}</span>}
      </div>
      <input
        type="range"
        className="pp-range pp-range-sm mt-4"
        min={min}
        max={sliderMax}
        step={step}
        value={n}
        aria-label={`${label} slider`}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${sliderMax > min ? ((n - min) / (sliderMax - min)) * 100 : 0}%` }}
      />
    </div>
  );
}

export default function Efficiency({ inputs, setInputs, defaults, onReset }) {
  const e = useMemo(() => efficiency(inputs), [inputs]);
  const set = (k) => (v) => setInputs((s) => ({ ...s, [k]: v }));
  const invalid = Object.values(inputs).some((v) => !Number.isFinite(v));
  const slower = e.hoursSaved < 0;

  const bars = [
    { name: 'Manual', hours: e.manualHours, fill: COLORS.slate },
    { name: 'App-assisted', hours: e.appHours, fill: COLORS.blue },
    { name: slower ? 'Extra hours' : 'Hours saved', hours: Math.abs(e.hoursSaved), fill: slower ? COLORS.bad : COLORS.teal },
  ];

  // Sensitivity: hours saved as quote volume changes
  const sens = useMemo(() => {
    const maxQ = Math.max(20, Math.ceil((inputs.quotes || 0) * 2.5 / 10) * 10);
    const pts = [];
    for (let q = 0; q <= maxQ; q += Math.max(1, Math.round(maxQ / 40))) {
      const r = efficiency({ ...inputs, quotes: q });
      pts.push({ quotes: q, saved: r.hoursSaved });
    }
    return pts;
  }, [inputs]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Automation value"
        title="Efficiency & Automation Value"
        subtitle="Estimate how much analyst time automating repetitive quote preparation could free up."
        right={
          <button onClick={onReset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal/50 hover:text-teal-600">
            <RotateCcw size={15} /> {defaults.fromData ? 'Use dataset values' : 'Reset defaults'}
          </button>
        }
      />

      <div role="note" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
        <Info size={20} className="mt-0.5 shrink-0" />
        <p>
          <strong>Hypothetical estimates, not verified savings.</strong> These figures show potential labor <em>capacity</em>, calculated from the assumptions below. Freed-up time is not a guaranteed payroll
          reduction; it could be redeployed to higher-value analysis. Actual results depend on adoption, accuracy and quote complexity.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-navy">Assumptions</h3>
          <span className="text-xs text-slate-500">
            {defaults.fromData ? 'Pre-filled from the dataset’s quote fields (quote-weighted). Edit freely.' : 'Dataset has no quote fields, so illustrative defaults are used. Edit freely.'}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Quotes per month" value={inputs.quotes} onChange={set('quotes')} max={500} tip="Total quotes the team prepares each month." />
          <Field label="Manual time per quote" suffix="min" value={inputs.manualMin} onChange={set('manualMin')} max={180} step={0.5} tip="Average minutes an analyst spends preparing one quote by hand in a spreadsheet." />
          <Field label="App-assisted time" suffix="min" value={inputs.appMin} onChange={set('appMin')} max={180} step={0.5} tip="Average minutes to prepare one quote using ProfitPulse-style automation." />
          <Field label="Analyst hourly cost" prefix="$" suffix="/ hr" value={inputs.rate} onChange={set('rate')} max={150} step={1} tip="Fully loaded hourly cost of an analyst. Defaults to $35/hr if the dataset provides no rate." />
        </div>
        {invalid && <p className="mt-3 text-sm font-medium text-red-600">Enter a number in every field; empty fields are treated as 0.</p>}
        {slower && <p className="mt-3 text-sm font-medium text-red-600">App-assisted time is longer than manual time, so this scenario adds work rather than saving it.</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={Clock} label="Manual work hours" value={e.manualHours} format={fmtHours} sub="Per month, current process" tone="neutral" tip="Quotes × manual minutes ÷ 60." />
        <KpiCard icon={Timer} label="App-assisted hours" value={e.appHours} format={fmtHours} sub="Per month, with automation" tone="blue" tip="Quotes × app-assisted minutes ÷ 60." />
        <KpiCard icon={Hourglass} label="Hours saved" value={e.hoursSaved} format={fmtHours} sub="Per month (capacity)" tone={slower ? 'bad' : 'teal'} tip="Manual hours − app-assisted hours." />
        <KpiCard icon={Percent} label="Time reduction" value={e.reductionPct} format={(v) => fmtPct(v)} sub="Of manual preparation time" tone={slower ? 'bad' : 'good'} tip="Hours saved ÷ manual hours. Shows 0% if manual hours are 0." />
        <KpiCard icon={Banknote} label="Monthly capacity value" value={e.monthlyValue} format={fmtCurrency} sub="Estimate · hours saved × hourly cost" tone="teal" tip="Hypothetical value of freed analyst time at the hourly cost entered. Not cash savings." />
        <KpiCard icon={CalendarClock} label="Annual capacity value" value={e.annualValue} format={fmtCurrency} sub="Estimate · monthly value × 12" tone="teal" tip="Monthly capacity value × 12. A hypothetical estimate, not a budget line." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Monthly hours: manual vs app-assisted" subtitle="Updates as you change the assumptions" />
          <div className="h-[290px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer>
              <BarChart data={bars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v)}h`} tick={axis} tickLine={false} axisLine={false} width={44} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} content={<ChartTooltip formatter={(v) => fmtHours(v)} />} />
                <Bar dataKey="hours" name="Hours / month" radius={[8, 8, 0, 0]} maxBarSize={72} animationDuration={350}>
                  {bars.map((b) => <Cell key={b.name} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Hours saved vs quote volume" subtitle="The dot marks your current quotes per month" tip="Savings scale linearly with volume: (manual − app minutes) × quotes ÷ 60." />
          <div className="h-[290px] px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer>
              <AreaChart data={sens} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.35} /><stop offset="100%" stopColor={COLORS.teal} stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis type="number" dataKey="quotes" domain={[0, 'dataMax']} tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtNumber} />
                <YAxis tickFormatter={(v) => `${Math.round(v)}h`} tick={axis} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => `${l} quotes / month`} formatter={(v) => fmtHours(v)} />} />
                <Area type="linear" dataKey="saved" name="Hours saved" stroke={COLORS.teal} strokeWidth={3} fill="url(#sv)" isAnimationActive={false} />
                <ReferenceDot x={inputs.quotes || 0} y={e.hoursSaved} r={8} fill={COLORS.navy} stroke="#fff" strokeWidth={3} ifOverflow="extendDomain" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-[15px] font-semibold text-navy">What this means</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
          Preparing {fmtNumber(inputs.quotes || 0)} quotes a month takes about {fmtHours(e.manualHours)} by hand versus {fmtHours(e.appHours)} with app assistance
          {slower ? `, which would add ${fmtHours(-e.hoursSaved)}.` : `, freeing roughly ${fmtHours(e.hoursSaved)} (${fmtPct(e.reductionPct, 0)}) of analyst capacity.`}
          {' '}At ${inputs.rate || 0}/hour, that capacity is worth about {fmtCurrency(e.monthlyValue)} per month ({fmtCurrency(e.annualValue)} per year) if it were redeployed to higher-value work.
          This is a planning estimate only: it is not a verified cost saving and does not assume any reduction in headcount or payroll.
        </p>
      </Card>
    </div>
  );
}
