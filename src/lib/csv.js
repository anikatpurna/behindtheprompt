const MAX_ROWS = 500;

const ALIASES = {
  name: ['customer', 'customername', 'name', 'client', 'account', 'accountname'],
  revenue: ['monthlyrevenue', 'revenue', 'monthlyrev'],
  cost: ['monthlyoperatingcost', 'monthlyoperatingcosts', 'operatingcost', 'operatingcosts', 'monthlycost', 'cost', 'opex'],
  units: ['monthlyunits', 'units', 'unitsprocessed', 'monthlyunitsprocessed'],
  laborHours: ['monthlylaborhours', 'laborhours', 'labourhours', 'hours'],
  quotes: ['quotespermonth', 'monthlyquotes', 'quotes'],
  manualMin: ['manualminutesperquote', 'manualminutes', 'manualpreparationminutes'],
  appMin: ['appminutesperquote', 'appminutes', 'appassistedminutes', 'appassistedminutesperquote'],
  rate: ['analysthourlycost', 'analysthourlyrate', 'hourlyrate', 'hourlycost'],
};

const norm = (h) => h.toLowerCase().replace(/^﻿/, '').replace(/[^a-z0-9]/g, '');

/** RFC-4180-ish parser: quoted fields, escaped quotes, CRLF, embedded newlines. */
export function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** "$85,000" -> 85000, "(1,200)" -> -1200, "" -> null, "abc" -> NaN */
export function parseNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === '') return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,\s]/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  const n = Number(s);
  return neg ? -n : n;
}

/**
 * Parse + validate a CSV string.
 * Returns { customers, errors, warnings }. `errors` non-empty means the file was rejected.
 */
export function loadCustomersFromCsv(text) {
  const errors = [];
  const warnings = [];
  if (!text || !text.trim()) return { customers: [], errors: ['The file is empty.'], warnings };

  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = !firstLine.includes(',') && firstLine.includes(';') ? ';' : ',';
  const rows = parseCsv(text, delimiter);
  if (rows.length < 2) return { customers: [], errors: ['The file needs a header row and at least one data row.'], warnings };

  const header = rows[0].map(norm);
  const col = {};
  Object.entries(ALIASES).forEach(([key, names]) => {
    const idx = header.findIndex((h) => names.includes(h));
    if (idx >= 0) col[key] = idx;
  });
  const missing = ['name', 'revenue', 'cost'].filter((k) => col[k] === undefined);
  if (missing.length) {
    const label = { name: 'customer', revenue: 'monthly_revenue', cost: 'monthly_operating_cost' };
    errors.push(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.map((m) => label[m]).join(', ')}.`);
    return { customers: [], errors, warnings };
  }

  const body = rows.slice(1);
  if (body.length > MAX_ROWS) warnings.push(`Only the first ${MAX_ROWS} rows were analyzed (file has ${body.length}).`);

  const customers = [];
  const seen = new Map();
  body.slice(0, MAX_ROWS).forEach((cells, i) => {
    const line = i + 2;
    const name = (cells[col.name] || '').trim();
    if (!name) return warnings.push(`Row ${line}: skipped, customer name is blank.`);
    const revenue = parseNumber(cells[col.revenue]);
    const cost = parseNumber(cells[col.cost]);
    if (revenue === null || Number.isNaN(revenue) || revenue <= 0)
      return warnings.push(`Row ${line} (${name}): skipped, monthly_revenue must be a number greater than 0.`);
    if (cost === null || Number.isNaN(cost) || cost < 0)
      return warnings.push(`Row ${line} (${name}): skipped, monthly_operating_cost must be a number of 0 or more.`);

    const optional = (key, label) => {
      if (col[key] === undefined) return null;
      const v = parseNumber(cells[col[key]]);
      if (v === null) return null;
      if (Number.isNaN(v) || v < 0) {
        warnings.push(`Row ${line} (${name}): ${label} is invalid and was ignored.`);
        return null;
      }
      return v;
    };

    seen.set(name.toLowerCase(), (seen.get(name.toLowerCase()) || 0) + 1);
    customers.push({
      id: `c${i}`,
      name,
      revenue,
      cost,
      units: optional('units', 'monthly_units'),
      laborHours: optional('laborHours', 'monthly_labor_hours'),
      quotes: optional('quotes', 'quotes_per_month'),
      manualMin: optional('manualMin', 'manual_minutes_per_quote'),
      appMin: optional('appMin', 'app_minutes_per_quote'),
      rate: optional('rate', 'analyst_hourly_cost'),
    });
  });

  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([n]) => n);
  if (dupes.length) warnings.push(`Duplicate customer names found (${dupes.join(', ')}); each row is analyzed separately.`);
  if (!customers.length) errors.push('No valid customer rows were found.');
  return { customers, errors, warnings };
}

const guard = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const cell = (v) => {
  if (v == null) return '';
  const s = String(guard(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (headers, rows) => [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
