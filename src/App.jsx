import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileWarning, Users, X } from 'lucide-react';
import demoCsv from '../public/customer_profitability_demo.csv?raw';
import { loadCustomersFromCsv, toCsv } from './lib/csv.js';
import { DEFAULT_TARGET, analyzeAll, efficiencyDefaults, portfolioSummary, simulate, STATUS } from './lib/finance.js';
import { generateInsights, headline } from './lib/insights.js';
import { fmtPct } from './lib/format.js';
import { Sidebar, Topbar, NAV } from './components/Shell.jsx';
import Overview from './components/Overview.jsx';
import Customers from './components/Customers.jsx';
import Simulator from './components/Simulator.jsx';
import Efficiency from './components/Efficiency.jsx';
import Insights from './components/Insights.jsx';
import { EmptyState, Skeleton, cx } from './components/ui.jsx';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEMO_NAME = 'customer_profitability_demo.csv';

const loadDemo = () => ({ ...loadCustomersFromCsv(demoCsv), source: 'demo', fileName: DEMO_NAME });
const initialSection = () => {
  const h = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  return NAV.some((n) => n.id === h) ? h : 'overview';
};

export default function App() {
  const [data, setData] = useState(() => {
    const d = loadDemo();
    return { customers: d.customers, source: d.source, fileName: d.fileName };
  });
  const [section, setSection] = useState(initialSection);
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [simPct, setSimPct] = useState(0);
  const defaults = useMemo(() => efficiencyDefaults(data.customers), [data.customers]);
  const [effInputs, setEffInputs] = useState(() => ({ quotes: defaults.quotes, manualMin: defaults.manualMin, appMin: defaults.appMin, rate: defaults.rate }));

  const analyzed = useMemo(() => analyzeAll(data.customers, target), [data.customers, target]);
  const summary = useMemo(() => portfolioSummary(analyzed, target), [analyzed, target]);
  const cleanEff = useMemo(
    () => Object.fromEntries(Object.entries(effInputs).map(([k, v]) => [k, Number.isFinite(v) ? v : 0])),
    [effInputs],
  );
  const insights = useMemo(() => generateInsights({ analyzed, summary, target, effInputs: cleanEff }), [analyzed, summary, target, cleanEff]);
  const hl = useMemo(() => headline({ summary, analyzed, target }), [summary, analyzed, target]);

  const activeId = analyzed.some((c) => c.id === selectedId)
    ? selectedId
    : [...analyzed].sort((a, b) => a.margin - b.margin)[0]?.id ?? null;

  useEffect(() => {
    const onHash = () => setSection(initialSection());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((id) => {
    setSection(id);
    setMobileNav(false);
    setPanelOpen(false);
    if (window.location.hash.slice(1) !== id) window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const applyDataset = (customers, source, fileName) => {
    setData({ customers, source, fileName });
    setSelectedId(null);
    setPanelOpen(false);
    setSimPct(0);
    const d = efficiencyDefaults(customers);
    setEffInputs({ quotes: d.quotes, manualMin: d.manualMin, appMin: d.appMin, rate: d.rate });
  };

  const handleUpload = async (file) => {
    setNotice(null);
    if (file.size > MAX_FILE_BYTES) {
      return setNotice({ kind: 'error', title: 'File too large', items: ['Please upload a CSV smaller than 2 MB.'] });
    }
    setLoading(true);
    try {
      const text = await file.text();
      const res = loadCustomersFromCsv(text);
      if (res.errors.length) {
        setNotice({
          kind: 'error',
          title: `Could not analyze “${file.name}”. Your previous data is unchanged.`,
          items: [...res.errors, ...res.warnings.slice(0, 5), 'Required columns: customer, monthly_revenue, monthly_operating_cost.'],
        });
      } else {
        applyDataset(res.customers, 'upload', file.name);
        setNotice(
          res.warnings.length
            ? { kind: 'warn', title: `Loaded ${res.customers.length} customers from “${file.name}” with ${res.warnings.length} warning${res.warnings.length > 1 ? 's' : ''}`, items: res.warnings.slice(0, 8) }
            : { kind: 'success', title: `Loaded ${res.customers.length} customers from “${file.name}”`, items: [] },
        );
      }
    } catch {
      setNotice({ kind: 'error', title: 'The file could not be read', items: ['Make sure it is a plain-text CSV file.'] });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const d = loadDemo();
    applyDataset(d.customers, 'demo', DEMO_NAME);
    setTarget(DEFAULT_TARGET);
    setNotice({ kind: 'success', title: 'Restored the original fictional demo data', items: [] });
  };

  const handleDownload = () => {
    const inc = simPct / 100;
    const headers = [
      'customer', 'monthly_revenue', 'monthly_operating_cost', 'gross_profit', 'gross_margin_pct', 'status',
      'monthly_units', 'monthly_labor_hours', 'cost_headroom_to_breakeven_pct',
      `scenario_cost_increase_pct`, 'scenario_operating_cost', 'scenario_gross_profit', 'scenario_gross_margin_pct', 'scenario_status',
      'additional_revenue_for_target_margin',
    ];
    const r2 = (n) => (n == null ? '' : Math.round(n * 100) / 100);
    const rows = analyzed.map((c) => {
      const s = simulate(c, inc, target);
      return [
        c.name, r2(c.revenue), r2(c.cost), r2(c.profit), r2(c.margin * 100), STATUS[c.status].label,
        c.units ?? '', c.laborHours ?? '', c.headroomToZero == null ? '' : r2(c.headroomToZero * 100),
        simPct, r2(s.cost), r2(s.profit), r2(s.margin * 100), STATUS[s.status].label, r2(s.additionalRevenue),
      ];
    });
    const sCost = analyzed.reduce((a, c) => a + simulate(c, inc, target).cost, 0);
    const sProfit = summary.revenue - sCost;
    rows.push([
      'PORTFOLIO TOTAL', r2(summary.revenue), r2(summary.cost), r2(summary.profit), r2(summary.margin * 100), STATUS[summary.status].label,
      '', '', '', simPct, r2(sCost), r2(sProfit), r2(summary.revenue ? (sProfit / summary.revenue) * 100 : 0), '', '',
    ]);
    const meta = [[`# ProfitPulse summary · target margin ${fmtPct(target, 1)} · source: ${data.fileName}${data.source === 'demo' ? ' (fictional demo data)' : ''} · generated ${new Date().toISOString().slice(0, 10)}`]];
    const blob = new Blob([`﻿${toCsv(headers, rows)}\r\n${toCsv(['note'], meta)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profitpulse_financial_summary.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const current = NAV.find((n) => n.id === section) || NAV[0];

  return (
    <div className="flex min-h-screen">
      <Sidebar section={section} onNavigate={navigate} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileNav} onClose={() => setMobileNav(false)} source={data.source} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={current.label}
          onMenu={() => setMobileNav(true)}
          source={data.source}
          fileName={data.fileName}
          target={target}
          onTarget={setTarget}
          onUpload={handleUpload}
          onDownload={handleDownload}
          onReset={handleReset}
          loading={loading}
          canExport={analyzed.length > 0}
        />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading data">
              <Skeleton className="h-10 w-72" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
              <Skeleton className="h-72" />
            </div>
          ) : analyzed.length === 0 ? (
            <EmptyState icon={Users} title="No customer data loaded" body="Upload a CSV or restore the demo data to get started." />
          ) : (
            <div key={section} className="animate-fadeUp">
              {section === 'overview' && <Overview analyzed={analyzed} summary={summary} target={target} headline={hl} insights={insights} onNavigate={navigate} onSelect={(id) => { setSelectedId(id); setPanelOpen(true); navigate('customers'); setPanelOpen(true); }} />}
              {section === 'customers' && (
                <Customers
                  analyzed={analyzed}
                  summary={summary}
                  target={target}
                  selectedId={activeId === selectedId ? selectedId : null}
                  panelOpen={panelOpen}
                  onSelect={(id, open) => { setSelectedId(id); setPanelOpen(!!open); }}
                  onClosePanel={() => setPanelOpen(false)}
                  onSimulate={(id) => { setSelectedId(id); navigate('simulator'); }}
                />
              )}
              {section === 'simulator' && <Simulator analyzed={analyzed} target={target} activeId={activeId} onPick={setSelectedId} pct={simPct} setPct={setSimPct} />}
              {section === 'efficiency' && <Efficiency inputs={effInputs} setInputs={setEffInputs} defaults={defaults} onReset={() => setEffInputs({ quotes: defaults.quotes, manualMin: defaults.manualMin, appMin: defaults.appMin, rate: defaults.rate })} />}
              {section === 'insights' && <Insights insights={insights} target={target} />}
            </div>
          )}
        </main>
        <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 sm:px-8">
          ProfitPulse · {data.source === 'demo' ? 'All figures are from fictional demo data. ' : ''}Runs entirely in your browser; nothing is uploaded or stored.
        </footer>
      </div>
    </div>
  );
}

function Notice({ notice, onClose }) {
  const styles = {
    error: ['border-red-200 bg-red-50 text-red-900', FileWarning],
    warn: ['border-amber-200 bg-amber-50 text-amber-900', AlertTriangle],
    success: ['border-green-200 bg-green-50 text-green-900', CheckCircle2],
  }[notice.kind];
  const Icon = styles[1];
  return (
    <div role={notice.kind === 'error' ? 'alert' : 'status'} className={cx('mb-6 flex animate-fadeUp gap-3 rounded-2xl border p-4 text-sm', styles[0])}>
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{notice.title}</p>
        {notice.items.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5">{notice.items.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        {notice.kind === 'error' && <a href="/customer_profitability_demo.csv" download className="mt-2 inline-block font-semibold underline">Download a sample CSV</a>}
      </div>
      <button onClick={onClose} aria-label="Dismiss" className="h-fit rounded-lg p-1 hover:bg-black/5"><X size={16} /></button>
    </div>
  );
}
