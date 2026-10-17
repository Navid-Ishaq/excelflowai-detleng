# Local acceptance report

Date: 17 October 2026. Corrections are local only; nothing was committed, pushed or deployed during this pass.

## Implemented corrections

- Homepage demo panel sits inside the hero and is visible in the first viewport at desktop, tablet and mobile test sizes. The real video remains owner-supplied; the panel clearly says coming soon.
- Create and Explore enter a local drag-and-drop upload area with an accessible file-picker fallback.
- Header inference rejects repeated merged heading bands; physical column positions remain stable while completely empty columns are omitted. Source preview shows up to twenty records with real headings.
- Role suggestions reconcile the selected columns when moving into Roles. Manual assignments and deliberate clearing survive Back/Continue. Multilingual aliases, native/ISO dates and currency evidence remain conservative around ambiguous columns.
- Default sheets are Report Data, Inflows and Outflows. Selecting Analysis reveals time-summary and group controls. Groups support All/One/Selected values, search, fifty-value pages, sorting and independently chosen charts.
- Normalized date/amount sorting uses actual values, including negative numbers. Analysis may be generated without a monetary role; monetary flow sheets still require Amount.
- Excel Analysis - Summary now has twelve KPI cards in four columns, date coverage, adaptive/explicit time summaries, period highlights, group rankings and largest transactions. Workbook tables retain readable row heights, left alignment, bounded fills and numeric/date formats.
- Analysis - Charts contains full-width native charts with category/value caches, visible axes, legends, linked tables, paired inflow/absolute-outflow columns, a net-flow line and a flow-mix doughnut. Group charts show the top ten by net flow. Cached chart values are captured from the existing workbook model without reparsing the exported workbook.
- Website design remains indigo; workbook presentation retains its business-report layout and green chart palette. Branding is ExcelFlow AI throughout. No login or ecosystem/product links were added. OpenAI and Mastra are explicitly named as product components, with truthful user-triggered remote-context disclosure.

## Executed verification

- `npm test`: **24 passed**, zero failed or skipped. New cases cover merged preambles, row-five headers, physical column IDs, editable role defaults, exact 71-record inclusion, KPI card merges, three native chart types/caches, reopening, default sheet selection, normalized sorting and selected-value validation.
- `npm run build`: TypeScript and Vite production build passed.
- Browser regression passed against the compiled production frontend: 2,000-record sample; manual mapping persistence; two groups; searchable One/Selected mode refresh; generated Excel/reopen parity; regional CSV; every analytics tab; AI outage; controlled AI transport, PDF and updated Excel; chat/reset; seven-model Builder paths; Quick Guide/story; keyboard dialogs; reduced motion; axe checks; responsive widths 390/768/1440; first-viewport demo placement. No external requests or browser storage writes occurred in the core journey.
- A separate real-file drag/drop browser journey passed: header row five, correct four selected column names/roles, Analysis initially unchecked, searchable One value grouping and 94-record generation.
- Reset/failure checks use a real browser worker with a controlled startup exception, avoiding cached-module routing assumptions. Late AI responses cannot restore cleared results.
- Independent openpyxl/OOXML inspection verified KPI cells/merges, native chart series/caches and nonnegative absolute-outflow chart values. Native Excel desktop rendering has not been manually certified.
- Formatting and whitespace checks passed. Source/public documentation scan found no prior-product names, metadata identifiers, domains or ecosystem links. Private differential harnesses and customer workbooks stay outside tracked product sources.

## Numerical evidence

A localized 94-record source detected header row five and matched the independently executed acceptance baseline: 52 inflows, 42 outflows, inflows 12,643.28, outflows -10,367.01, net 2,276.27.

The available downloaded 71-record workbook matched: 34 inflows, 37 outflows, inflows 7,919.00, outflows -9,018.17, net -1,099.17. This was tested as a saved workbook; the separate raw third-quarter source shown in the screenshots was not present among the located attachments. A synthetic merged-preamble fixture separately reproduces and guards the raw-header failure.

The 2,000-record export/reopen test retains exact monetary totals. A 50,000-record arithmetic test passed with preparation around 0.19–0.23 seconds in the final runs on this host; this does not claim equivalent end-to-end workbook performance on every device. Workbook jobs run in a worker and chart/table/value-list rendering is bounded.

## Changed files

- `src/App.tsx`, `src/style.css`: hero demo, drop-zone entry routing, focus/scroll behavior, independent footer and AI messaging.
- `src/Wizard.tsx`, `src/GroupValues.tsx`: source preview, selected-column suggestions, report defaults, time summaries and searchable grouping controls.
- `src/engine.ts`, `src/domain.ts`: header/column discovery, aliases, normalized sorting, grouping modes and validation.
- `src/files.ts`, `src/analysis-workbook.ts`, `src/xlsx-charts.ts`: reusable analysis worksheet writer, native chart types/cache data and workbook formatting.
- `src/Analytics.tsx`, `src/Experience.tsx`: AI wording.
- `tests/core.test.ts`, `tests/parity.test.ts`, `tests/browser.ts`, `tests/reset-browser.ts`: regression coverage and intentional Analysis selection in export tests.
- `README.md`, `TEST_REPORT.md`: product wording and acceptance evidence.

## Remaining boundaries

OpenAI/Mastra server code remains implemented, but no real model request was made in this pass. Owner will configure the server-side key later; live model behavior, evidence quality and deployed backend access remain acceptance steps after configuration. Controlled transport tests are explicitly not provider responses.

The actual demo recording is not supplied. Email remains a clearly labeled coming-soon popup, with no sending service; no login/database was introduced. Supported input remains UTF-8 CSV and unencrypted XLSX within documented limits; macros, arbitrary formula recalculation, legacy XLS and FX conversion are outside scope. PDF built-in fonts primarily cover Latin text. No claim of universal pixel-identical Excel rendering or every possible workbook layout is made.
