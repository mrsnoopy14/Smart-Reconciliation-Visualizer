# Smart Reconciliation Visualizer

Live demo: [https://mrsnoopy14.github.io/Smart-Reconciliation-Visualizer/](https://mrsnoopy14.github.io/Smart-Reconciliation-Visualizer/)

Smart Reconciliation Visualizer is an interactive dashboard to reconcile two financial datasets (CSV) and quickly identify:

- Matched records
- Mismatched records (with reasons)
- Missing records (present in one dataset but not the other)
- Duplicate keys (ambiguous matches)

If the live site ever looks outdated, hard refresh (`Ctrl+F5`) or open in Incognito.

---

## Deliverables (Task Coverage)

- **Upload/Input:** Upload CSV files or paste CSV text for both datasets.
- **Reconcile:** Match records using user-selected key columns; optionally compare amount/date.
- **Output categories:** matched, mismatched, missing in left/right, and duplicate-key.
- **Visualization:** KPI summary + charts to understand results at a glance.
- **Explore results:** Filter by status + search across key/reasons/row previews.
- **Deployment:** Hosted as a static site via GitHub Pages.

---

## How to Run (Local)

Prerequisites: Node.js 18+

```bash
npm install
npm run dev
```

Build + preview production bundle:

```bash
npm run build
npm run preview
```

---

## How to Use

1. Load both datasets (Left and Right) via upload or paste.
2. Select key columns for each dataset.
3. Optionally select amount/date columns and set an amount tolerance.
4. Click **Run reconciliation**.
5. Use filter chips + search to explore mismatches/missing/duplicates.

---

## Approach & Technical Decisions

### Client-only (no backend)

All parsing and reconciliation runs in the browser.

Why: simplifies setup, keeps data local, and makes deployment easy (static hosting).

### CSV parsing

We use `papaparse` to parse CSV reliably into:

- `headers: string[]`
- `rows: Array<Record<string, string>>`

Why: CSV has edge cases (quotes, commas, newlines). PapaParse handles real-world CSVs well.

Core code: `src/lib/csv.ts`

### Reconciliation engine

1. Build a composite key from user-selected key columns (e.g., `InvoiceNo` or `InvoiceNo + Vendor`).
2. Index the right dataset by this key (bucket map).
3. Scan the left dataset and classify each record.
4. Detect right-side duplicates (multiple rows share one key) and report them as `duplicate_key`.

Why:

- Composite keys are practical for real financial data.
- Index+scan is much faster than comparing every row to every other row.
- Duplicates are a common real-world reconciliation issue and should not be misreported as “missing”.

Core code: `src/lib/reconcile.ts`

### Visualization + exploration

- KPIs and charts (Recharts) summarize results quickly.
- Search + filter chips support row-level investigation.

Why: reconciliation workflows need both summary and drill-down.

---

## Assumptions

- Inputs are CSV with headers in the first row.
- Matching is driven by user-selected key columns.
- Amount tolerance is an **absolute** difference (e.g., 0.01 or 1.00).
- Date comparison is optional; if enabled, values are compared as strings (based on what’s in the CSV).

---

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- PapaParse
- Recharts
- GitHub Pages (GitHub Actions)

---

## Sample Data

Use the **Load sample data** button, or open:

- `public/samples/purchases.csv`
- `public/samples/sales.csv`

---

## Deployment

GitHub Pages is configured via GitHub Actions:

- `.github/workflows/deploy-pages.yml` builds and deploys `dist/`
- `vite.config.ts` uses `base: './'` so assets work on GitHub Pages subpaths
