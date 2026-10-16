# Architecture

## Boundaries

React + TypeScript + Vite frontend; a standalone Node.js HTTP service hosts Mastra/OpenAI. All spreadsheet bytes remain frontend-only. No workbook endpoint, database, auth or email integration exists.

`domain.ts` defines records and versioned contracts. `engine.ts` owns strict numeric/date normalization, header/role/format suggestions, periods, KPIs, groups and compact checked context. Records keep original values plus normalized Amount/Date and source-row IDs. Currency totals are always partitioned in owner-facing financial views.

`files.ts` loads XLSX/CSV and creates new Excel files; source workbooks are never modified. Import limits and ZIP checks precede parsing. `_EF_Config` contains versioned mappings and headings, not hidden source copies. Structural mismatches fall back to explicit review. `xlsx-charts.ts` creates native OOXML chart parts without disturbing hyperlink relationships. Only Report Data has a report AutoFilter; summary/group/chart sheets do not. Builder working-data sheets have their own entry filter. Styled cells stop at the prepared/exported boundaries.

`file-worker.ts` moves workbook loading/export/Builder generation off the UI thread; `tasks.ts` handles cancellation, failures, stale IDs and timeouts. Pure in-memory analytics remain in the UI thread with memoization, bounded chart/table rendering and tested 50k-row computation. There is no claim that every 200k-column/row combination is practical on every device.

`builder.ts` defines seven editable model starters and a deterministic synthetic data generator. `BuilderView.tsx`, `Wizard.tsx` and `Analytics.tsx` provide guided workflows. Feature chunks and PDF generation load on demand. Native dialogs provide focus containment and Escape behavior. `Experience.tsx` keeps the how-to guide distinct from the origin-story narrative, preserving the underlying workspace.

## AI trust model

`makePayload` partitions a selected currency, supplies checked KPIs, up to 30 groups, 60 trend buckets, a deterministic period delta when available, and bounded redacted evidence. High-magnitude transactions are review candidates, never automatically declared fraud or statistical anomalies. Group sums/counts reconcile before the payload is produced. Unknown formats/quality counts remain visible.

`grounding.ts` supplies strict schemas shared by client/server. AI prose uses `{{metric.id}}` tokens, resolved from checked values. Literal digits, unsupported IDs, incorrect sessions and incorrect languages are rejected. This restricts numeric invention, not every possible unsupported qualitative statement. Exported findings resolve tokens and retain period/currency context.

`server/agent.ts` creates a per-request Mastra Agent with KPI lookup, group comparison, trend lookup and explicit row-evidence tools. A server environment key selects OpenAI. Workbook labels/questions are untrusted data; no arbitrary code/tools or filesystem access are granted. Agent memory/storage/telemetry persistence is not configured.

`server/index.ts` enforces origin allowlisting, JSON/body limits, schema/reconciliation checks, six attempts/minute/IP and four simultaneous AI calls. IP counters are ephemeral, contain no report content and expire. Server-side summaries are supplied by a client; checks are not cryptographic proof of source truth. A public service needs external cost/abuse controls beyond this basic anonymous limit.

Frontend AbortController + per-request identity prevent canceled or superseded AI responses from appearing. Root reset increments the dataset generation, cancels file workers and unmounts the analytics controller. No cross-session memory is retained. Existing downloads cannot be remotely deleted.

## Operational separation

No credentials in Vite variables. VITE_AI_URL is a public endpoint, never a secret. Original Excel/CSV is held as exact local bytes for the Original Download. Structured AI responses are optional assets; missing credentials or outages do not block reporting. Actual model behavior/quality, deployed CORS and public hosting remain separate acceptance checks until credentials/deployment are provided.
