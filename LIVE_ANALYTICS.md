# ExcelFlow AI Live Analytics

Tier 3 implementation, 8 October 2026. Local review only; no push or deployment.

## Architecture

Create and Explore feed one normalized contract: records (original values, normalized signed Amount, ISO day), generic columns with original headings, role mappings, original report period, and report/source information. `live-engine.js` uses the existing `analysis.js` calculation and Group By functions. `live-worker.js` holds one dataset and receives only filter changes. `live-view.js` owns dashboard state; `live-charts.js` manages and destroys locally bundled Chart.js charts. `existing-view.js` separates file selection/compatibility confirmation from dashboard rendering.

The report worker reads XLSX, validates resource/format constraints, and calls `report-import.js`. Reopened reports are recalculated from Report Data. Existing Summary/Charts sheets are retained as Excel outputs, but are never the primary browser calculation input. An edited or stale Analysis cell cannot alter dashboard totals.

## Owner experience

- Create/Explore entry cards and distinct file selectors; current-session result action and preserved Excel download.
- Executive KPIs: inflows/outflows/net/count, flow counts, averages, largest movements, ratio and margin. Date KPIs appear when mapped.
- Flow comparison and magnitude-labelled doughnut; chronological net trend, transaction volume and cumulative net flow; recorded-period highlights.
- Any available source column, original heading, searchable All/One/Selected values, 30-value pages; time levels and typed Amount grouping use the existing rules.
- Positive/negative/inflow/outflow/repeated-activity rankings, Top 5 concentration and focused group detail/comparison. Ranked bars can focus the dashboard on a group.
- Explorer metric/type/sort/Top N controls. Lines require a Date dimension and remain chronological. Doughnuts require no more than six nonnegative groups with nonzero total. All groups is allowed only for at most 20 groups; larger sets remain ranked/bounded.
- Global filters and active summary; currency isolation; safe zero/empty/missing Date states; 20-row transaction pages; chart data alternatives; sticky section navigation; responsive cards and charts.

## Portable workbook schema

New reports include hidden `_EF_Metadata`. A1 is `ExcelFlowAIMetadata`; column B contains JSON, split into 20,000-character chunks when needed. Schema version 1 contains product identifier, generation timestamp, Report Data name/header row, exported column IDs/keys/headings/positions, exported role mappings, actual reporting-period boundaries, parsing conventions and lightweight group configuration. No credentials, session identifiers or copies of transaction records are stored in metadata.

Metadata and worksheet headings/positions/roles are cross-validated. Unsupported versions, altered columns and malformed metadata produce actionable errors. A Report Data-only workbook is sufficient; derived sheets are optional. Missing metadata activates explicit Amount/Date/Description/Currency confirmation with number/date conventions. Missing Report Data is rejected rather than reconstructed from flows or charts.

Selected Date values are saved as native dates with explicit regional display formatting, preventing 1904 serial/date-order ambiguity on reopening. Amount remains numeric at original precision; two-decimal formatting affects presentation only. Existing AutoFilter, alignment, bounded fills, flow totals and Summary/Charts navigation rules remain covered by regression tests.

## Privacy, performance and limits

All file reading, normalization, calculations and visualization are local. No financial datasets or report history are stored in localStorage/cookies. File switches terminate obsolete workers, release dataset references and revoke obsolete Blob URLs. Spreadsheet text is escaped; formulas are not executed, only cached safe values are read. Unresolved Amount values are counted and flagged, not converted to zero monetary values. Macros and external workbook links are not executed or followed.

File selection is limited to 20 MB. ZIP central-directory checks reject encrypted/unsupported large ZIP formats and declared expanded contents over 150 MB. The existing-report adapter supports at most 200,000 rows and 256 columns. Browser resource/time failures remain possible below those limits; feedback and cancel/return actions are provided. Column count is cached once during worksheet extraction, removing a repeated large-file scan.

KPIs use all matching records. Detailed tables show 20 rows, unique selectors 30 values, ranked charts at most 20 groups. Time series exceeding 240 buckets combine neighboring buckets for display while retaining complete calculations and cumulative totals. This rendering aggregation is explicitly explained in the UI. Only recorded periods count toward the least-active-period insight.

Reopened files contain only exported fields and records. They cannot recover omitted source columns, periods excluded at generation, or a missing Report Data sheet. Currency conversion, encrypted/legacy XLS files, formula recalculation, account/history persistence and optional PNG chart export are outside this implementation. Native Excel UI checks were not repeated for this tier; XLSX integrity/style/metadata were verified programmatically and reopened independently.

## Validation

See TEST_REPORT.md for numerical parity, regression/security/accessibility and measured performance. Test-generated workbooks/screenshots/timing JSON are local ignored files under `work/`; no private sample is committed.
