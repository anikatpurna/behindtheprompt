import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, FlaskConical, Search, SearchX, X } from 'lucide-react';
import { fmtCurrency, fmtDecimal, fmtNumber, fmtPct } from '../lib/format.js';
import { STATUS, STATUS_ORDER, marginCurve } from '../lib/finance.js';
import { Card, ChartTooltip, COLORS, EmptyState, InfoTip, MarginGauge, SectionHeader, StatusBadge, cx } from './ui.jsx';

const SORTS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Gross profit' },
  { key: 'margin', label: 'Margin' },
  { key: 'cost', label: 'Operating cost' },
];

export default function Customers({ analyzed, summary, target, selectedId, panelOpen, onSelect, onClosePanel, onSimulate }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('margin');
  const [dir, setDir] = useState('asc');
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return analyzed
      .filter((c) => (filter === 'all' || c.status === filter) && (!q || c.name.toLowerCase().includes(q)))
      .sort((a, b) => (dir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  }, [analyzed, query, sortKey, dir, filter]);

  const selected = analyzed.find((c) => c.id === selectedId);
  const hasUnits = analyzed.some((c) => c.units != null);
  const hasHours = analyzed.some((c) => c.laborHours != null);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Customer analysis"
        title="Customer Profitability"
        subtitle="Search, sort and filter every account. Select a customer to open a detailed financial view."
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers…"
              aria-label="Search customers"
              className="w-full rounded-xl border border-slate-200 bg-mist py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/20"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select id="sort" value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-navy outline-none focus:border-teal">
              {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
            </select>
            <button
              onClick={() => setDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-navy transition hover:border-teal/50"
              aria-label={`Sort direction: ${dir === 'asc' ? 'ascending' : 'descending'}`}
            >
              {dir === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
              {dir === 'asc' ? 'Low → High' : 'High → Low'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {[{ key: 'all', label: 'All', n: analyzed.length }, ...STATUS_ORDER.map((k) => ({ key: k, label: STATUS[k].label, n: summary.counts[k] }))].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cx(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                filter === f.key ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              {f.key !== 'all' && <span className="h-2 w-2 rounded-full" style={{ background: STATUS[f.key].color }} />}
              {f.label}
              <span className={cx('rounded-full px-1.5 text-xs tabular', filter === f.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{f.n}</span>
            </button>
          ))}
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No customers match"
          body="Try a different search term or clear the status filter."
          action={<button onClick={() => { setQuery(''); setFilter('all'); }} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">Clear filters</button>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-3 py-3 text-right">Revenue</th>
                    <th className="px-3 py-3 text-right">Operating cost</th>
                    <th className="px-3 py-3 text-right">Gross profit</th>
                    <th className="px-3 py-3 text-right">Margin</th>
                    {hasUnits && <th className="px-3 py-3 text-right">Units</th>}
                    {hasHours && <th className="px-3 py-3 text-right">Labor hrs</th>}
                    <th className="px-3 py-3">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const sel = c.id === selectedId;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => onSelect(c.id, true)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(c.id, true))}
                        tabIndex={0}
                        aria-selected={sel}
                        className={cx('group cursor-pointer border-b border-slate-100 transition last:border-0', sel ? 'bg-teal-50/60' : 'hover:bg-mist')}
                      >
                        <td className={cx('relative px-5 py-4 font-semibold text-navy', sel && 'before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-teal')}>{c.name}</td>
                        <td className="px-3 py-4 text-right tabular">{fmtCurrency(c.revenue)}</td>
                        <td className="px-3 py-4 text-right tabular">{fmtCurrency(c.cost)}</td>
                        <td className={cx('px-3 py-4 text-right font-semibold tabular', c.profit < 0 ? 'text-red-600' : 'text-navy')}>{fmtCurrency(c.profit)}</td>
                        <td className="px-3 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 lg:block">
                              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, c.margin * 250))}%`, background: STATUS[c.status].color }} />
                            </span>
                            <span className="w-14 font-bold tabular text-navy">{fmtPct(c.margin)}</span>
                          </div>
                        </td>
                        {hasUnits && <td className="px-3 py-4 text-right tabular text-slate-500">{c.units != null ? fmtNumber(c.units) : '—'}</td>}
                        {hasHours && <td className="px-3 py-4 text-right tabular text-slate-500">{c.laborHours != null ? fmtNumber(c.laborHours) : '—'}</td>}
                        <td className="px-3 py-4"><StatusBadge status={c.status} /></td>
                        <td className="pr-4 text-slate-300 transition group-hover:text-teal"><ChevronRight size={16} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id, true)}
                className={cx('w-full rounded-2xl border bg-white p-4 text-left shadow-card transition', c.id === selectedId ? 'border-teal ring-2 ring-teal/20' : 'border-slate-200')}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-navy">{c.name}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Stat label="Revenue" value={fmtCurrency(c.revenue)} />
                  <Stat label="Operating cost" value={fmtCurrency(c.cost)} />
                  <Stat label="Gross profit" value={fmtCurrency(c.profit)} neg={c.profit < 0} />
                  <Stat label="Margin" value={fmtPct(c.margin)} bold />
                  {c.units != null && <Stat label="Units" value={fmtNumber(c.units)} />}
                  {c.laborHours != null && <Stat label="Labor hours" value={fmtNumber(c.laborHours)} />}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selected && panelOpen && <DetailPanel c={selected} summary={summary} target={target} onClose={onClosePanel} onSimulate={() => onSimulate(selected.id)} />}
    </div>
  );
}

function Stat({ label, value, neg, bold }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cx('tabular', bold ? 'font-bold text-navy' : 'font-medium', neg ? 'text-red-600' : 'text-slate-700')}>{value}</div>
    </div>
  );
}

function Metric({ label, value, tip, neg }) {
  return (
    <div className="rounded-xl bg-mist p-3.5">
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}{tip && <InfoTip text={tip} align="left" />}</div>
      <div className={cx('mt-1 text-lg font-bold tabular', neg ? 'text-red-600' : 'text-navy')}>{value}</div>
    </div>
  );
}

function DetailPanel({ c, summary, target, onClose, onSimulate }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const curve = useMemo(() => marginCurve(c, target), [c, target]);
  const scale = Math.max(c.revenue, c.cost) || 1;
  const money = (n) => (n == null ? '—' : `$${n.toFixed(2)}`);
  const vsPortfolio = c.margin - summary.margin;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${c.name} details`}>
      <div className="absolute inset-0 animate-fadeUp bg-navy/50 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl animate-slideIn flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Customer detail</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy">{c.name}</h2>
            <div className="mt-2"><StatusBadge status={c.status} /></div>
          </div>
          <button autoFocus onClick={onClose} aria-label="Close panel" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy"><X size={20} /></button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Monthly revenue" value={fmtCurrency(c.revenue)} />
            <Metric label="Operating cost" value={fmtCurrency(c.cost)} />
            <Metric label="Gross profit" value={fmtCurrency(c.profit)} neg={c.profit < 0} tip="Revenue − operating cost." />
            <Metric label="Gross margin" value={fmtPct(c.margin)} neg={c.margin < 0} tip="Gross profit ÷ revenue." />
          </div>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-navy">Margin position</h3>
            <p className="text-xs text-slate-500">
              {vsPortfolio >= 0 ? 'Above' : 'Below'} the portfolio margin of {fmtPct(summary.margin)} by {fmtPct(Math.abs(vsPortfolio))} points.
            </p>
            <MarginGauge margin={c.margin} target={target} />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-navy">Revenue vs operating cost</h3>
            {[['Revenue', c.revenue, COLORS.blue], ['Operating cost', c.cost, c.cost > c.revenue ? COLORS.bad : COLORS.slate]].map(([label, v, color]) => (
              <div key={label} className="mb-2.5">
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{label}</span><span className="font-semibold tabular text-navy">{fmtCurrency(v)}</span></div>
                <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full transition-all duration-500" style={{ width: `${(v / scale) * 100}%`, background: color }} /></div>
              </div>
            ))}
          </section>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-navy">Cost-increase stress curve</h3>
            <p className="mb-3 text-xs text-slate-500">
              {c.headroomToZero == null ? 'No operating cost recorded.' : c.headroomToZero < 0
                ? 'Already below break-even.'
                : `Profit turns negative if operating cost rises more than ${fmtPct(c.headroomToZero)}.`}
              {c.headroomToTarget != null && c.headroomToTarget >= 0 && ` Falls below the ${fmtPct(target, 0)} target after +${fmtPct(c.headroomToTarget)}.`}
            </p>
            <div className="h-[190px]">
              <ResponsiveContainer>
                <LineChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={COLORS.grid} />
                  <XAxis dataKey="pct" tickFormatter={(v) => `+${v}%`} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tickFormatter={(v) => `${Math.round(v)}%`} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={42} />
                  <Tooltip content={<ChartTooltip labelFormatter={(l) => `Operating cost +${l}%`} formatter={(v) => `${v.toFixed(1)}%`} />} />
                  <ReferenceLine y={0} stroke={COLORS.bad} strokeDasharray="3 3" />
                  <ReferenceLine y={target * 100} stroke={COLORS.warn} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="margin" name="Gross margin" stroke={COLORS.teal} strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-navy">Operational metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Units processed" value={c.units != null ? fmtNumber(c.units) : 'Not provided'} />
              <Metric label="Labor hours" value={c.laborHours != null ? fmtNumber(c.laborHours) : 'Not provided'} />
              <Metric label="Cost per unit" value={money(c.costPerUnit)} />
              <Metric label="Profit per unit" value={money(c.profitPerUnit)} neg={c.profitPerUnit < 0} />
              <Metric label="Hours / 1,000 units" value={c.hoursPer1kUnits != null ? fmtDecimal(c.hoursPer1kUnits) : '—'} tip="Labor hours per 1,000 units processed. A productivity signal; labor cost is already inside operating cost." />
              <Metric label="Revenue / labor hour" value={c.revenuePerLaborHour != null ? fmtCurrency(c.revenuePerLaborHour) : '—'} tip="Informational ratio only. Labor is not priced separately, so it is never subtracted a second time." />
            </div>
          </section>

          <button onClick={onSimulate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-midnight active:scale-[0.99]">
            <FlaskConical size={17} className="text-teal" /> Run a what-if scenario for {c.name}
          </button>
        </div>
      </aside>
    </div>
  );
}
