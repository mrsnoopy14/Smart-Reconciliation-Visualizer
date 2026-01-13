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

  ## Run Locally

  Prereqs: Node.js 18+

  ```bash
  npm install
  npm run dev
  ```

  Then open the local URL shown in the terminal.

  ## How To Use

  1. Upload (or paste) **Left** and **Right** datasets.
  2. Choose **key columns** for each dataset (required).
  3. Optionally select **amount** and **date** columns + set an amount tolerance.
  4. Click **Run reconciliation**.
  5. Filter/search the results table.

  ## Sample Data

  Use the **Load sample data** button, or see:

  - [public/samples/purchases.csv](public/samples/purchases.csv)
  - [public/samples/sales.csv](public/samples/sales.csv)

  ## Deployment (Live Demo)

  ### GitHub Pages (recommended)

  This repo includes a GitHub Actions workflow that deploys the built `dist/` folder to GitHub Pages.

  1. Create a new GitHub repository
  2. Add the remote and push:

  ```bash
  git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
  git push -u origin main
  ```

  3. In GitHub repo settings → **Pages**:
    - Set **Source** to **GitHub Actions**
  4. Pushes to `main` will deploy automatically.

  ### Vercel

  1. Push this repo to GitHub
  2. Import into Vercel
  3. Build command: `npm run build`
  4. Output directory: `dist`

  ### Netlify

  1. New site from Git
  2. Build command: `npm run build`
  3. Publish directory: `dist`

  ## Live Demo URL

  - https://mrsnoopy14.github.io/Smart-Reconciliation-Visualizer/

  If you still see an older UI, do a hard refresh (Ctrl+F5) or open in Incognito.
