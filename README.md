# ExcelFlow AI by DeTLeng

Local Excel reporting, workbook building and complete interactive analytics.

## Run

Node.js 24: `npm ci`, then `npm run dev`. Open http://127.0.0.1:5180. Keep the terminal open.

`npm test` runs the foundation regression suite. `npm run build` creates `dist` for the existing Pages workflow. `npm run test:e2e` runs browser journeys against `EF_BASE_URL` (default localhost:5184); browser tests need local fixtures in ignored `work` or EF_SAMPLE_PATH / EF_ROLE_SAMPLE_PATH.

## Product

Build blank or realistic sample workbooks; create reports through the full six-step flow; generate Report Data, Inflows, Outflows, Analysis - Summary, Analysis - Charts and grouped worksheets; reopen reports into the same Live Analytics engine. The full dashboard includes shared filters, all KPIs/date statistics, flow/trend/volume/cumulative charts, period highlights, rankings, transactions, Explorer and chart-data tables. Quick Guide and origin story are separate interactive experiences.

This baseline accepts XLSX, matching its reporting foundation. CSV and real AI/Mastra integrations are deferred to the later additions phase. Existing AI implementation was backed up outside this repository before the foundation transfer. No AI results are simulated or represented as live.

All active workbook processing is local. There is no Login or database. The demo panel is visible at the top; a recording has not yet been supplied. Ecosystem footer links are intentional. Domain: excelflowai.detleng.com.

## Git and deployment

The recipient repository retains its own Git history; no source repository Git directory was imported. Build and deployment workflow remains in `.github/workflows/verify.yml`. No commit, push or deployment is performed automatically by local setup.
