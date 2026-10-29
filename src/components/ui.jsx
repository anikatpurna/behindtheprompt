import { useEffect, useRef, useState } from 'react';
import { Info, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { STATUS } from '../lib/finance.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

export const COLORS = {
  navy: '#0B1220',
  midnight: '#111C32',
  teal: '#14B8A6',
  blue: '#60A5FA',
  slate: '#94A3B8',
  grid: '#E2E8F0',
  good: '#16A34A',
  bad: '#DC2626',
  warn: '#F59E0B',
};
export const CATEGORICAL = ['#14B8A6', '#60A5FA', '#6366F1', '#F59E0B', '#EC4899', '#84CC16', '#94A3B8'];

export const short = (s, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200/80 bg-white shadow-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, tip, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-navy">
          {title}
          {tip && <InfoTip text={tip} />}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function InfoTip({ text, align = 'center' }) {
  const [open, setOpen] = useState(false);
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label="Explain this calculation"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full p-0.5 text-slate-400 transition hover:text-teal-600 focus-visible:text-teal-600"
      >
        <Info size={14} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={cx(
            'absolute bottom-full z-50 mb-2 w-64 max-w-[70vw] animate-fadeUp rounded-xl bg-navy px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-100 shadow-lift',
            pos,
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const s = STATUS[status];
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', className)}
      style={{ background: s.soft, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Smoothly tween a number toward its latest value. */
export function useTween(value, duration = 450) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  useEffect(() => {
    if (!Number.isFinite(value) || prefersReduced()) {
      from.current = value;
      setV(value);
      return undefined;
    }
    const a = Number.isFinite(from.current) ? from.current : value;
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const cur = a + (value - a) * (1 - Math.pow(1 - p, 3));
      from.current = cur;
      setV(cur);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return v;
}

export function AnimatedValue({ value, format, duration }) {
  const v = useTween(value, duration);
  return <span className="tabular">{format(v)}</span>;
}

const TONES = {
  neutral: { ring: 'bg-slate-100 text-slate-600', bar: 'bg-slate-300' },
  teal: { ring: 'bg-teal-50 text-teal-600', bar: 'bg-teal' },
  blue: { ring: 'bg-blue-50 text-blue-500', bar: 'bg-softblue' },
  good: { ring: 'bg-green-50 text-green-600', bar: 'bg-ok' },
  warn: { ring: 'bg-amber-50 text-amber-600', bar: 'bg-amber-400' },
  bad: { ring: 'bg-red-50 text-red-600', bar: 'bg-bad' },
};

export function KpiCard({ icon: Icon, label, value, format, sub, tip, tone = 'teal', delay = 0, valueClass }) {
  const t = TONES[tone];
  return (
    <Card
      className="group relative animate-fadeUp p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={cx('absolute inset-x-5 top-0 h-0.5 rounded-b-full', t.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
          {tip && <InfoTip text={tip} align="left" />}
        </div>
        <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-hover:scale-110', t.ring)}>
          <Icon size={18} />
        </span>
      </div>
      <div className={cx('mt-3 text-[28px] font-bold leading-none tracking-tight text-navy sm:text-3xl', valueClass)}>
        <AnimatedValue value={value} format={format} />
      </div>
      {sub && <div className="mt-2 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

export function Delta({ value, format, invert = false, className }) {
  // invert: a rise is bad (e.g. costs)
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 text-xs font-semibold tabular',
        good && 'text-green-600',
        bad && 'text-red-600',
        !good && !bad && 'text-slate-400',
        className,
      )}
    >
      <Icon size={13} />
      {format(value)}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={22} />
      </span>
      <p className="text-sm font-semibold text-navy">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return (
    <div
      className={cx('animate-shimmer rounded-xl bg-slate-200', className)}
      style={{ backgroundImage: 'linear-gradient(90deg,#e2e8f0 0,#f1f5f9 200px,#e2e8f0 400px)', backgroundSize: '800px 100%' }}
    />
  );
}

export function SectionHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">{eyebrow}</p>}
        <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-[28px]">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lift backdrop-blur">
      <div className="mb-1 font-semibold text-navy">{labelFormatter ? labelFormatter(label, payload) : label}</div>
      {payload.map((p, i) => (
        <div key={`${p.dataKey}-${i}`} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="ml-auto pl-4 font-semibold text-navy tabular">{formatter ? formatter(p.value, p) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Margin gauge with zone colouring, the target marker and optional baseline vs simulated markers. */
const DOMAIN = [-0.2, 0.4];
const pos = (m) => `${Math.min(100, Math.max(0, ((m - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * 100))}%`;

export function MarginGauge({ margin, target, compare }) {
  const h = target + 0.05;
  const zones = [
    [DOMAIN[0], 0, STATUS.loss.soft],
    [0, target, STATUS.atRisk.soft],
    [target, h, STATUS.watchlist.soft],
    [h, DOMAIN[1], STATUS.healthy.soft],
  ];
  const width = (a, b) => `${((b - a) / (DOMAIN[1] - DOMAIN[0])) * 100}%`;
  const mainStatus = STATUS[statusOf(margin, target)];
  return (
    <div className="px-1 pb-6 pt-8">
      <div className="relative h-3 rounded-full">
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          {zones.map(([a, b, bg], i) => (
            <div key={i} style={{ width: width(a, b), background: bg }} />
          ))}
        </div>
        {compare != null && (
          <span
            className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-400 bg-white transition-all duration-300"
            style={{ left: pos(compare) }}
            title="Baseline"
          />
        )}
        <span
          className="absolute top-1/2 z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-lift transition-all duration-300"
          style={{ left: pos(margin), background: mainStatus.color }}
        >
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular" style={{ background: mainStatus.soft, color: mainStatus.text }}>
            {(margin * 100).toFixed(1)}%
          </span>
        </span>
        {[0, target, h].map((m, i) => (
          <span key={i} className="absolute top-full -translate-x-1/2 pt-1.5 text-[10px] font-medium text-slate-400 tabular" style={{ left: pos(m) }}>
            {Math.round(m * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

import { getStatus } from '../lib/finance.js';
const statusOf = getStatus;
