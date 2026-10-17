# Architecture

The active frontend uses the complete reporting foundation: app.js coordinates workflows, workbook-client/worker perform local import/export, engine/analysis power reports, live-engine/live-worker power current and reopened analytics, builder modules generate blank/sample workbooks, and separate experience modules provide the guide/story. ExcelFlow branding and excelflow-theme.css supply the presentation layer.

Calculation and export algorithms are preserved. Branding and metadata namespaces are recipient-specific. Authentication entry was removed intentionally. CSV, remote AI and Mastra UI integration are deferred; their previous implementation is archived outside the active repository. No server is needed for this baseline.
