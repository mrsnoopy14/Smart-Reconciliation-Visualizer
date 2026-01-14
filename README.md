# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Smart Reconciliation Visualizer

  Interactive dashboard that helps reconcile two financial datasets (CSV) by identifying:

  - Records that match
  - Records that mismatch (with reasons)
  - Records missing from either dataset

  ## Features

  - Upload two CSVs (or paste CSV text)
  - Configurable matching: key columns (required) + optional amount/date comparisons
  - Summary KPIs + charts
  - Search and filter results (by status)
  - Sample datasets included

  ## Approach & Technical Decisions

  - **Client-only app (no backend):** simplifies setup and deployment.
  - **CSV parsing:** `papaparse` parses into row objects using the first row as headers.
  - **Reconciliation logic:** build an index (“bucket map”) on the right dataset using selected key columns, then walk the left dataset and classify:
    - `matched` when optional comparisons pass
    - `mismatched` when comparisons fail (reasons are shown)
    - `missing_in_right` / `missing_in_left` when no matching key exists
    - `duplicate_key` when the right dataset contains multiple rows for the same key
  - **Visualization:** `recharts` for simple, readable charts.

  Core logic lives in:

  - [src/lib/reconcile.ts](src/lib/reconcile.ts)
  - [src/lib/csv.ts](src/lib/csv.ts)

  ## Assumptions

  - Input files are CSV with headers in the first row.
  - Keys are compared after trim + lowercasing.
  - Amounts remove common thousands separators and currency symbols; tolerance is an **absolute** value.
  - Dates are normalized to `YYYY-MM-DD` when parseable.

  ## Smart Reconciliation Visualizer

  Live demo: [Smart Reconciliation Visualizer](https://mrsnoopy14.github.io/Smart-Reconciliation-Visualizer/)

  Interactive dashboard to reconcile two financial datasets (CSV) and quickly identify:

  - Matched records
  - Mismatched records (with reasons)
  - Missing records (present in one dataset but not the other)
  - Duplicate keys (ambiguous matches)

  ### Live Demo

  - [https://mrsnoopy14.github.io/Smart-Reconciliation-Visualizer/](https://mrsnoopy14.github.io/Smart-Reconciliation-Visualizer/)

  If the live site ever looks outdated, hard refresh (`Ctrl+F5`) or open in Incognito.

  ---

  ## Project Task Coverage (What This App Delivers)

  - **Upload/Input:** Upload CSV files or paste CSV text for both datasets.
  - **Reconcile:** Match records using user-selected key columns; optionally compare amount/date.
  - **Output categories:** matched, mismatched, missing in left/right, and duplicate-key.
  - **Visualization:** KPI summary + charts to understand results at a glance.
  - **Explore results:** Filter by status + search across key/reasons/row previews.
  - **Deployment:** Hosted as a static site via GitHub Pages.

  ---

  ## Features

  - Upload two CSVs (Left + Right) or paste CSV text
  - Auto-suggest common columns (invoice/id, amount, date) to speed setup
  - Configurable matching:
    - Key columns (required)
    - Amount column (optional) with tolerance
    - Date column (optional)
  - KPI cards + charts (pie + bar)
  - Results table with filter chips + search
  - Sample datasets included for demos

  ---

  ## How It Works (Interview-Oriented Explanation)

  ### 1) CSV Parsing

  CSV files/text are parsed in the browser using `papaparse` into:

  - `headers: string[]`
  - `rows: Array<Record<string, string>>`

  Why: CSV parsing is tricky (quotes, commas, line breaks). PapaParse handles real-world CSVs reliably.

  Core code: `src/lib/csv.ts`

  ### 2) Matching Key (Composite Key)

  The user selects “key columns” for each dataset (e.g., `InvoiceNo`, or `InvoiceNo + Vendor`).
  Those values are combined into a single composite key so that one transaction can be uniquely identified.

  Why: Financial data rarely has a perfect single ID across systems; composite keys are practical.

  ### 3) Fast Reconciliation (Index + Scan)

  The reconciliation engine builds an index (bucket map) for one side (right dataset) keyed by the composite key.
  Then it scans the other side (left dataset) and looks up matches.

  Why: This avoids slow nested loops and scales much better than comparing every row to every other row.

  Core code: `src/lib/reconcile.ts`

  ### 4) Status Classification

  Each output row is classified into one of:

  - `matched`: key found and optional comparisons pass
  - `mismatched`: key found but amount/date comparisons fail
  - `missing_in_right`: left row has no match in right
  - `missing_in_left`: right row has no match in left
  - `duplicate_key`: multiple right rows share the same key (ambiguous)

  Why duplicates matter: duplicates are a common reconciliation issue; treating them separately prevents misleading “missing” results.

  ### 5) Visual + Searchable Output

  The UI shows:

  - KPI cards for quick counts
  - Charts for distribution of statuses
  - A searchable/filterable table for row-level investigation

  Why: Reconciliation requires both high-level health metrics and row-level drill-down.

  ---

  ## Tech Stack

  - **Vite + React + TypeScript** (fast dev/build + safe types)
  - **Tailwind CSS** (quickly build a clean dashboard UI)
  - **PapaParse** (robust CSV parsing in-browser)
  - **Recharts** (charts for summary visualization)
  - **GitHub Pages (Actions)** (free static hosting for a live demo)

  ---

  ## Run Locally

  Prerequisites: Node.js 18+

  ```bash
  npm install
  npm run dev
  ```

  Open the local URL printed in the terminal.

  Build production bundle:

  ```bash
  npm run build
  npm run preview
  ```

  ---

  ## How To Use

  1. Load both datasets (Left and Right) via upload or paste.
  2. Select key columns for each dataset.
  3. Optionally select amount/date columns and set an amount tolerance.
  4. Click **Run reconciliation**.
  5. Use filter chips + search to explore mismatches/missing/duplicates.

  ---

  ## Sample Data

  Use the **Load sample data** button, or open:

  - public/samples/purchases.csv
  - public/samples/sales.csv

  ---

  ## Deployment

  ### GitHub Pages (already configured)

  This repo includes a GitHub Actions workflow that builds the app and deploys `dist/` to GitHub Pages.

  Key config:

  - `.github/workflows/deploy-pages.yml` (build + deploy)
  - `vite.config.ts` uses `base: './'` so assets work on GitHub Pages subpaths

  ---

  ## Project Structure (Quick Map)

  - `src/App.tsx` — UI, state management, charts, filtering
  - `src/lib/csv.ts` — CSV parsing utilities
  - `src/lib/reconcile.ts` — reconciliation engine (business logic)
  - `public/samples/*` — demo datasets
  - `.github/workflows/deploy-pages.yml` — GitHub Pages deployment
