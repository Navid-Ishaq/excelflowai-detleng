# ExcelFlow AI by DeTLeng

Excel workbook building, complete structured reports, Live Analytics and an OpenAI-powered Mastra analyst.

## Start locally

Node.js 24 is required. Run `npm ci`, copy `.env.example` to ignored `.env`, and configure the server key privately. Run `npm run dev:server` and `npm run dev` in separate terminals. Open http://127.0.0.1:5180. Reporting and Live Analytics work without an AI key; AI returns an explicit configuration error until the backend is configured.

## Product workflow

Build a blank/sample workbook, upload an original source, or reopen an existing report. The six-step reporting flow preserves header detection, role suggestions, selections, periods, sorting, Report Data, Inflows, Outflows, complete Analysis - Summary/Charts, group sheets and native Excel charts. Live Analytics retains the complete filters, KPIs, trends, rankings, transactions and Explorer.

After report processing, Open AI Analyst offers a deep investigation, searchable English question buttons, freeform follow-up chat, multilingual answers, row evidence and currency-separated calculations. Mastra tools query all supplied raw worksheets and the processed report. Source columns omitted from the report remain available through the original workbook; an existing report alone cannot recreate its missing original source. Updated downloads clearly identify the separate AI Findings worksheet and preserve original chart parts.

Reporting runs locally. Connecting AI requires authorization to send supplied raw and processed data to a temporary backend; relevant tool outputs go to OpenAI. Sessions are held in memory, expire after inactivity and are not restored after refresh. No Login is required. The demo panel remains at the top. Ecosystem links are intentional. Behind ExcelFlow AI has been removed; Quick Guide explains the current workflow.

For a shareable example, use [the fictional multilingual workbook](public/examples/fictional-side-hustle.xlsx) and [expected results](public/examples/expected-results.json). No private owner records are bundled with the public example.

## Configure and verify

See [AI_SETUP.md](AI_SETUP.md) for Render, existing Mastra Platform project, environment variables, capacity, first-request delay and real-provider acceptance steps. API keys belong only in server secrets. Frontend VITE_AI_URL is the public HTTPS backend URL, configured as a GitHub Actions variable before rebuilding Pages.

`npm test` runs the 49 foundation tests. `npm run test:ai` runs deterministic server, isolation, trace-redaction and workbook-preservation tests. `npm run check:server` checks backend types. `npm run build` creates Pages assets in dist. `npm run test:e2e` and `npm run test:ai:browser` run Chrome browser journeys; private fixtures remain in ignored work or can be supplied through EF_SAMPLE_PATH / EF_ROLE_SAMPLE_PATH. EF_BASE_URL selects the test server. Controlled transport tests do not claim real OpenAI validation.

The repository retains its existing Git history. Local implementation does not automatically commit, push or deploy. The existing reporting foundation is preserved rather than represented as newly authored algorithms. Domain: excelflowai.detleng.com.
