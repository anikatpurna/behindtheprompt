import { useEffect, useRef, useState } from 'react';
import {
  Activity, BarChart3, Download, FlaskConical, Lightbulb, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen,
  RotateCcw, Timer, Upload, Users, X,
} from 'lucide-react';
import { cx, InfoTip } from './ui.jsx';

export const NAV = [
  { id: 'overview', label: 'Executive Overview', short: 'Overview', icon: LayoutDashboard },
  { id: 'customers', label: 'Customer Profitability', short: 'Customers', icon: Users },
  { id: 'simulator', label: 'Scenario Simulator', short: 'Simulator', icon: FlaskConical },
  { id: 'efficiency', label: 'Efficiency & ROI', short: 'Efficiency', icon: Timer },
  { id: 'insights', label: 'Executive Insights', short: 'Insights', icon: Lightbulb },
];

export function Sidebar({ section, onNavigate, collapsed, onToggle, mobileOpen, onClose, source }) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-navy/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-navy text-slate-300 transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[264px]',
          'w-[264px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary"
      >
        <div className={cx('flex h-16 items-center gap-3 border-b border-white/5 px-5', collapsed && 'lg:justify-center lg:px-0')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal text-navy shadow-[0_0_24px_rgba(20,184,166,0.45)]">
            <Activity size={20} strokeWidth={2.6} />
          </span>
          <div className={cx('min-w-0 leading-tight', collapsed && 'lg:hidden')}>
            <div className="text-[17px] font-bold tracking-tight text-white">ProfitPulse</div>
            <div className="truncate text-[11px] text-slate-400">Profitability Analytics</div>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                title={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                  collapsed && 'lg:justify-center',
                  active ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white',
                )}
              >
                {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-teal" />}
                <Icon size={19} className={active ? 'text-teal' : 'text-slate-400 group-hover:text-slate-200'} />
                <span className={cx(collapsed && 'lg:hidden')}>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className={cx('space-y-3 border-t border-white/5 p-4', collapsed && 'lg:hidden')}>
          <div className="rounded-xl bg-midnight p-3 text-xs leading-relaxed">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-white">
              <span className={cx('h-2 w-2 rounded-full', source === 'demo' ? 'bg-amber-400' : 'bg-teal')} />
              {source === 'demo' ? 'Fictional demo data' : 'Uploaded dataset'}
            </div>
            <p className="text-slate-400">Everything runs in your browser. No data is sent anywhere.</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="hidden items-center justify-center gap-2 border-t border-white/5 py-3 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Collapse</>}
        </button>
      </aside>
    </>
  );
}

function TargetInput({ target, onChange }) {
  const [text, setText] = useState(String(Math.round(target * 1000) / 10));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(String(Math.round(target * 1000) / 10));
    setBad(false);
  }, [target]);
  const commit = (v) => {
    setText(v);
    const n = Number(v);
    if (v.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 50) {
      setBad(false);
      onChange(n / 100);
    } else setBad(true);
  };
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm">
      <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-slate-500">
        Target margin
        <InfoTip
          align="right"
          text="Minimum acceptable gross margin (0–50%). Watchlist starts at this value, Healthy at +5 points above it, and the “below target” KPI counts customers under it. Default 15%."
        />
      </span>
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => commit(e.target.value)}
        aria-invalid={bad}
        aria-label="Target margin percent"
        className={cx('w-12 rounded-md bg-mist px-2 py-1 text-right font-semibold tabular text-navy outline-none focus:ring-2', bad ? 'ring-2 ring-red-400' : 'focus:ring-teal/50')}
      />
      <span className="text-slate-400">%</span>
    </label>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal/50 hover:text-teal-600 active:scale-95 disabled:opacity-50"
    >
      <Icon size={16} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

export function Topbar({ title, onMenu, source, fileName, target, onTarget, onUpload, onDownload, onReset, loading, canExport }) {
  const fileRef = useRef(null);
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
        <button onClick={onMenu} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <BarChart3 size={18} className="hidden text-teal sm:block" />
          <h1 className="truncate text-base font-semibold text-navy">{title}</h1>
          {source === 'demo' ? (
            <span className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
              Fictional Demo Data
            </span>
          ) : (
            <span className="max-w-[180px] truncate rounded-full border border-teal/30 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-600" title={fileName}>
              Uploaded: {fileName}
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <TargetInput target={target} onChange={onTarget} />
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) onUpload(f);
            }}
          />
          <ActionButton icon={Upload} label={loading ? 'Reading…' : 'Upload CSV'} onClick={() => fileRef.current?.click()} disabled={loading} />
          <ActionButton icon={Download} label="Download summary" onClick={onDownload} disabled={!canExport} />
          <ActionButton icon={RotateCcw} label="Reset demo data" onClick={onReset} disabled={loading} />
        </div>
      </div>
    </header>
  );
}
