# ExcelFlow AI: repository to live AI

The reporting foundation remains intact. The new Node/TypeScript API hosts the real Mastra agent and its read-only dataset tools; OpenAI supplies model inference. GitHub Pages continues to serve the browser. Mastra Platform receives structural trace metadata when configured, without workbook contents, prompts, model answers or tool results.

## Local development

Use Node.js 24. Run `npm ci`. Copy `.env.example` to `.env`, set `OPENAI_API_KEY` locally, and keep it out of version control. Never paste API keys into chat. Run `npm run dev:server` in one terminal and `npm run dev` in another. The browser is at http://127.0.0.1:5180 and the backend is at http://127.0.0.1:8787. Other browser ports require an exact matching entry in ALLOWED_ORIGINS.

Build or upload a source workbook, generate a report, and select Ask AI About Your Data. Explore Existing Report also exposes the analyst from Live Analytics. Existing reports do not include the original source automatically: add it in the analyst if required. Review the full-data access notice and authorize connection. Connect & run deep investigation performs the default investigation; a question can also connect and run on its own. There are no fabricated fallback answers when configuration or the provider is unavailable.

## Render configuration

Use the supplied render.yaml to create a NEW `excelflow-ai-api` web service linked to this repository, or enter these equivalent Dashboard values: Node runtime, Free plan, Frankfurt, build `npm ci && npm run check:server && npm run test:ai`, start `npm run start:server`, health `/api/health`. The server binds to 0.0.0.0 and Render's PORT. No other existing Render service needs modification.

Set OPENAI_API_KEY as a server secret. OPENAI_MODEL defaults to `openai/gpt-5-mini`; verify account access and budget during the first live run. ALLOWED_ORIGINS must include `https://excelflowai.detleng.com`. Add any explicit test origins only while needed. `/api/health` returns configured=true when a key exists; it does not prove model credentials are valid.

After deployment, set the GitHub repository Actions variable VITE_AI_URL to the actual HTTPS service URL and rebuild/redeploy Pages. This variable is public, and must never hold an API key. A missing production URL disables the connection with a configuration message. Do not use localhost as the deployed backend URL.

Render Free can sleep; the UI warns about first-request delay and retains browser data for reconnect. A lost backend session is recreated when an AI request receives 410. Browser refresh or closure starts fresh; the application does not persist workbook/chat data to browser storage. Server sessions expire after 20 minutes without requests and are released on source replacement. Browser-close deletion is best effort; TTL is the backstop.

## Existing Mastra Platform project

Reuse ExcelFlow AI Analyst. Put MASTRA_PLATFORM_ACCESS_TOKEN and MASTRA_PROJECT_ID in the Render service environment, from that project's settings. Do not deploy a duplicate Mastra-hosted backend just to observe this Render-hosted agent. This repository uses MastraPlatformExporter with a structural-field whitelist and disables log/metric/score/feedback exports. Traces retain operation type, timing and IDs only. A live trace in the chosen project must be verified after credentials are configured; the screenshot of a project alone is not proof of connection.

## Capacity and public endpoint controls

The AI service accepts up to 100,000 processed rows, 512 columns, and a 20 MB source XLSX; raw expanded workbooks are guarded and the combined cell limit is 2 million. Actual usable capacity also depends on the service memory budget. Requests above limits fail explicitly and do not change local reports. Full data remains queryable through pagination, field selection, cell chunks and full-set aggregates; it is not all sent to OpenAI on every message.

Defaults: 8 sessions, 96 MB serialized-session budget, two concurrent AI requests, six requests per session per minute, 100 provider requests per process per UTC day, 24 tool executions and a cumulative 180,000-character tool-result budget, 10 agent steps (16 deep), and a 110-second investigation timeout. The daily cap is a process guard, not a durable spending ledger: Render restarts reset it. Configure a provider project spending budget before public launch. CORS is not authentication. Anonymous users have random session bearer tokens; tokens are never persisted. Default IP quota uses the socket address; TRUST_PROXY is off unless a trusted proxy configuration has been separately verified. Public high-traffic production needs stronger persistent abuse controls.

## Live acceptance after configuration

1. Confirm health, then upload public/examples/fictional-side-hustle.xlsx, generate a report, authorize AI access and complete deep investigation. Expected deterministic results are in public/examples/expected-results.json. All data is fictional; one invalid amount and separate currencies are intentional.
2. Ask about a Spanish/German source in English; select another answer language; verify evidence and row references.
3. Ask smallest/largest individual receipts on a date, then smallest/largest daily receipt totals. Check against Excel calculations.
4. Compare two periods and group by an original-source field omitted from the processed report.
5. Confirm currency separation and honest behavior for zero inflows, invalid amounts and absent source data.
6. Open a second isolated browser context and verify it cannot read the first session. Restart the backend and confirm the first browser restores its dataset.
7. Download updated Excel — includes AI Findings. Confirm original native chart sheets remain intact. The ordinary report download does not contain new AI findings.
8. Confirm structural traces in the existing Mastra project and check logs for absence of workbook contents.

Local deterministic and controlled-transport tests do not certify model answer quality or a deployed connection. Those require the real provider key and live service. Never describe fixture responses as live AI results.

## Known dependency advisory

The current npm audit reports five moderate transitive findings along Mastra's gray-matter → js-yaml → argparse → sprintf-js path. This app exposes no front-matter parsing or arbitrary file tool. npm's suggested automatic fix downgrades Mastra across a major/API boundary, so it was not applied blindly. Recheck upstream before public release; local tests do not erase the advisory.

## References

[OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [Mastra tools](https://mastra.ai/docs/agents/tools), [Mastra Platform](https://mastra.ai/docs/mastra-platform/overview), [Render Blueprint reference](https://render.com/docs/blueprint-spec), [Render environment variables](https://render.com/docs/configure-environment-variables).

## Deploying the PDF/language/UX update

Push both frontend and server changes. Existing GitHub Actions rebuilds Pages and Render should redeploy the linked branch; if auto-deploy is disabled, deploy the latest commit manually in Render. No new environment variable, API key or hosting service is required. The backend update expands language validation and adds responseStyle; deploy it as well as the frontend before testing new/custom languages. Existing keys and VITE_AI_URL remain unchanged.

PDF buttons open a native print dialog where the user selects Save as PDF. They export saved answer text locally; no extra AI call or backend PDF service is used. The overall business overview is calculated in English and explicitly distinguished from AI findings. Per-answer/combined PDFs keep the original response languages. Output fonts depend on the device's available fonts; Urdu, Arabic, Hindi, Bengali and Chinese layouts were rendered and visually checked on Windows Chrome. Real translation quality in every language is not certified by layout fixtures.
