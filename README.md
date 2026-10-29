# ProfitPulse | Business Intelligence & Profitability Analytics

An interactive executive dashboard that turns a customer-profitability spreadsheet into a decision tool.
React + Vite + Tailwind CSS + Recharts + Lucide. No backend, database, auth, or API keys: everything runs in the browser.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests for the financial logic
npm run build     # production build in dist/
```

## Deploy to Netlify

`netlify.toml` is included (build `npm run build`, publish `dist`). Connect the repo or drag the `dist` folder into Netlify.

## Sections

1. **Executive Overview** – six KPI cards, revenue vs cost, profit, margin and contribution charts, rules-based headline.
2. **Customer Profitability** – search, sort, status filter, and a detail panel per customer.
3. **Scenario Simulator** – cost increase 0–30% (slider + presets), baseline vs simulated, required revenue for the target margin, portfolio stress test.
4. **Efficiency & ROI** – quote-preparation time model (hypothetical capacity estimates, not verified savings).
5. **Executive Insights** – deterministic rules over the real numbers, each with evidence and a possible action. Not an AI model.

Extras: CSV upload (validated), downloadable summary CSV, reset to demo data, editable target margin, "Fictional Demo Data" label.

## Calculation rules

- Gross profit = revenue − operating cost. Portfolio margin = total profit ÷ total revenue (not an average of margins).
- Status: Healthy ≥ target + 5 pts (20%), Watchlist ≥ target (15%), At Risk ≥ 0%, Loss-Making < 0%.
- Simulation: cost × (1 + increase), revenue constant. Required revenue = simulated cost ÷ (1 − target); additional = MAX(0, required − revenue).
- Labor hours are informational only; labor is assumed to be inside operating cost and is never added again.
- Simulations never mutate the loaded data.

## CSV format

Required: `customer, monthly_revenue, monthly_operating_cost`.
Optional: `monthly_units, monthly_labor_hours, quotes_per_month, manual_minutes_per_quote, app_minutes_per_quote, analyst_hourly_cost`.
Rows with blank names, non-numeric or non-positive revenue, or negative cost are skipped with a visible warning. Sample: `public/customer_profitability_demo.csv`.
