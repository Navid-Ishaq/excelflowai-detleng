# ExcelFlow AI architecture

The browser continues to own workbook building, source recognition, report selections, deterministic processing, native Excel export and complete Live Analytics. Their functional engines remain unchanged. A separate AI view opens only once a processed dataset is available. No workbook or chat restoration is stored in localStorage/sessionStorage.

The browser keeps the current source File (including Builder sample bytes), the processed dataset and original report Blob in memory. Only after explicit authorization does it upload the selected report fields plus the complete supplied source workbook to the Node API. For reopened reports, original-source upload is a separate deliberate step. Processed field IDs are projected consistently and normalized fields are recalculated server-side; raw worksheet physical row IDs remain available as evidence.

The Node API parses guarded XLSX files into isolated, short-lived, random-token sessions. A real Mastra Agent uses catalog, overview, records, cell, aggregate, compare, anomalies, quality and reconcile tools. Tools query the entire session and return bounded pages or complete aggregates. Existing engine/analysis code supplies numeric/date parsing and currency-safe calculations. Tool results receive request-local evidence IDs; responses with missing or unknown finding citations are rejected. Citation validation checks provenance, not semantic truth of every generated sentence; real-provider acceptance remains necessary.

The OpenAI API key never enters browser code. Render hosts the API; GitHub Pages hosts the compiled frontend. Mastra Platform is a monitoring destination for structural trace data, not a second backend. Its exporter whitelists timing/type/ID fields and drops content-bearing fields; log, metric, score and feedback exports are disabled. Application errors are returned without workbook contents or provider error payloads.

Backend expiration or restart produces HTTP 410; the active browser can recreate its approved dataset. New uploads and Start New Report release old AI state. Refresh/closure starts a new user journey; best-effort deletion plus TTL handles abandoned server state. Context and tool calls cannot cross session tokens. Public endpoints also enforce body, dataset, concurrency, request and tool budgets. These are bounded demo-service controls, not durable multi-tenant account authentication.

AI Findings export patches a new OOXML worksheet and package relationships into the original ZIP. It deliberately avoids reopening and writing the original workbook through an Excel library, which could remove native chart parts. Original report sheet/chart bytes are covered by preservation tests. Downloads with new findings have an explicit updated label; ordinary report downloads remain distinct.

Quick Guide is a separate interactive experience. The top demo area, new website theme, original report layouts, ecosystem links and absence of Login remain intentional.
