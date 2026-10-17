# ExcelFlow AI by DeTLeng

An independent portfolio application for local spreadsheet reporting, interactive analytics and evidence-grounded AI assistance with OpenAI and Mastra. Domain: `excelflowai.detleng.com`. New implementation created on 16 October 2026.

## Run locally

Use Node.js 24 LTS and npm. In PowerShell:

```powershell
Set-Location "D:\DETLENG2\excelflowai-detleng"
npm ci
npm run dev
```

Open http://127.0.0.1:5180. In a second terminal, run `npm run server`. The backend listens on port 8787; Vite proxies `/api`. Core reporting requires no API key or backend.

For real AI, copy `.env.example` to `.env`, set `OPENAI_API_KEY` locally, and restart the backend. Never paste keys into chat, frontend code or Git. `OPENAI_MODEL` defaults to `openai/gpt-5-mini`; account model access and API charges apply. The backend uses Mastra Agent and structured tools with OpenAI. No real provider call has been verified without credentials. No fake AI mode is shipped.

## Product paths

- **Create:** XLSX/UTF-8 CSV → worksheet/header → columns → suggested roles and formats → reports/groups → final period review → new Excel output.
- **Explore:** reopen a versioned ExcelFlow AI report; validate saved mappings, or explicitly confirm roles. Only exported fields can be recovered. Raw source is not embedded secretly.
- **Build:** seven models, editable headings/order/types/roles/required flags/dropdowns, blank or fictional sample output, up to 5,000 rows, 1/3/6/12-month/custom sample periods. Analyze a sample without uploading again.
- **Live Analytics:** Overview, Flow, Trends, Groups, Transactions and Explorer. One engine powers reports and browser metrics; currencies stay separate. Filters affect all views. Tables and charts are bounded for responsiveness.
- **AI:** explicit remote-context disclosure/preview, language choice, checked metrics/groups/period differences and limited redacted row evidence. No full workbook upload by default. A model outage leaves local reporting available.
- **Downloads:** exact original file, generated Excel, locally rendered AI PDF after successful insights. Updated Excel explicitly includes an AI Findings sheet with resolved numeric values and the analysis scope.
- **Guidance:** separate interactive Quick Guide and product story. No login. Email is a dismissible Coming Soon popup with no address field or sending service. Watch Demo has a deliberate placeholder until a real video is supplied.

## Verification

```powershell
npm test
npm run test:e2e
npm run test:reset
npm run check
npm run build
npm audit
```

Browser tests use local Chrome on Windows (see `tests/browser.ts`); `EF_BASE_URL` chooses another local server. Synthetic fixtures are generated inside ignored `work/`. Controlled AI transport fixtures test UI grounding/PDF/reset behavior; they are not live-provider verification. See TEST_REPORT.md and ARCHITECTURE.md.

## Privacy and limits

Spreadsheet import, calculations, grouping, charts, Excel creation and PDF rendering run in the browser. Application data stays in active memory, with no localStorage/sessionStorage/database persistence. AI sends the displayed compact context, the current question and bounded recent conversation to the backend and OpenAI. Provider policies still apply; no zero-retention claim is made. No workbook/chat contents are logged by application code. Start New Report aborts processing and clears active state/download links; previously downloaded files remain on the device.

Supported inputs: unencrypted XLSX and UTF-8 CSV, 20 MB, 200,000 records, 256 columns; expanded XLSX is limited to 200 MB and 4,000 ZIP entries. Actual capacity depends on device memory and workbook complexity. No legacy XLS, macro execution, arbitrary formula evaluation or FX conversion. Cached formula results are read; uncached formulas become missing values. Header detection inspects a bounded preamble and remains editable. Source footer totals should be removed before import. CSV must be structurally consistent; ambiguous delimiters/locales require review. Native numeric values are not locale-transformed; text conventions are explicit. Arithmetic uses JavaScript numbers with compensated summation and bounded rounding, not arbitrary-precision accounting.

Reconciliation establishes arithmetic consistency, not source authenticity or business completeness. Duplicate-looking rows are flagged, not deleted. AI grounding validates metric IDs, placeholders, evidence IDs, language and session identity; it cannot guarantee the correctness of all qualitative interpretation. PDF uses built-in Latin fonts; responses support English/Spanish/German and unfamiliar scripts may not render completely.

Dependency audit currently has five moderate transitive advisories in Mastra's document-parsing dependency chain, with no high/critical findings. This application does not expose those document parsers; monitor upstream updates. An automatic major downgrade is not applied merely to silence audit output.

## Later hosting

Frontend output is `dist/`; its CNAME targets `excelflowai.detleng.com`. A static host serves this build, never raw source. Before building for a separate public backend, set `VITE_AI_URL` to its HTTPS `/api` URL. The Node service runs `npm run server`, uses `PORT`, and restricts `ALLOWED_ORIGIN` to the frontend origin. Store the OpenAI key only in the service environment; disable body/access-content logging, and use `/api/health` for readiness. Public AI endpoints need a cost budget and an appropriate abuse-control review before exposure. Backend cold starts can require retry.

No GitHub push or deployment has been performed. No real demo video is bundled. Required library notices are in THIRD_PARTY_NOTICES.md and LICENSES/.

## GitHub Pages publishing

In repository Settings > Pages > Build and deployment, set Source to **GitHub Actions**, keeping the custom domain `excelflowai.detleng.com`. The Build and deploy ExcelFlow AI workflow tests, builds and publishes only `dist/` on a main-branch push or manual dispatch. Pull requests verify the build without deploying. Raw `main / root` hosting cannot run the TypeScript source and can show a blank page. The `public/CNAME` is copied into the build. Enable Enforce HTTPS when GitHub makes it available.

The frontend deployment does not host the Node AI backend. Configure the public backend separately and set the repository variable VITE_AI_URL to its HTTPS `/api` address before building. Without it, local reporting remains available while remote AI is unavailable.

For local use, keep a PowerShell terminal running `npm run dev` and visit http://127.0.0.1:5180. Closing that terminal stops the local site; pushing to GitHub does not start a local server.
