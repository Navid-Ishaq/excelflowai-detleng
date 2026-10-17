# Business Workbook Builder

Tier 4, implemented in the existing product on 8 October 2026.

## Shared architecture

`builder-schema.js` owns templates, stable field IDs, selected order, native types, roles, validation, settings, limits and filenames. `builder-data.js` supplies reproducible seeded synthetic records. `builder-output.js` consumes that same schema for both outputs, writes standard XLSX through the existing ExcelJS dependency and exposes a source adapter. `builder-worker.js` keeps generation off the UI thread; `builder-view.js`/`builder.css` provide the guided experience, bounded preview, explicit twin actions and worker/Blob cleanup.

The direct sample handoff uses `sourceModel()` and the existing app's column/role/report/period workflow. It reuses `prepare`, the Excel report generator, comprehensive Analysis, universal grouping and shared Live Analytics. No second reporting or KPI implementation exists. Builder changes do not alter locked report AutoFilter rules or existing chart-sheet behavior.

## Templates and fields

Sales & Orders includes unit price, quantity, optional discount/tax rates and signed total. Products is an activity/stock movement ledger, not a static master. Customers and Suppliers are activity ledgers with consistent entity IDs. Transactions supplies a universal signed ledger. Complete combines sales, purchases, expenses, refunds, fees, adjustments and transfers. Custom starts empty and supports all 11 field types, optional core roles and up to 64 fields.

Owners can select recommended/all fields, clear optional fields, add/remove fields, rename headings, change types/roles/required flags and move fields using explicit accessible buttons. Unique headings and singular roles are enforced. Dropdowns are available for text-like fields; numeric/date fields use native validation. Free-text categories remain flexible unless the owner explicitly configures a list.

Dates are real Excel dates; amounts/numbers remain numeric; percentages are fraction values with percentage formats; IDs are text. Amount presentation has two decimals and negative red text. Native quantity defaults show whole units. The selected dot/comma convention describes later text-number parsing; Excel controls native numeric separators using regional settings. Currency is a single chosen ISO code with no conversion.

## Outputs and sample model

Blank output reserves exactly the requested data-entry rows and columns, applies styling/formats/dropdowns and has no transaction values or formulas. It can be downloaded and filled later. There is no immediate blank handoff.

Sample output creates the exact requested number of clean synthetic records. Reused product/customer/supplier pools give consistent identities and categories. Weighted selections create common and rare groups, varying basket sizes and service values. Ordered dates span the chosen calendar months/custom inclusive range with uneven weekday activity. Purchases/supplier payments/refunds have event-aware signed amounts; stock transfers/adjustments have zero monetary impact. Fee descriptions/categories are consistent; expense product/service labels identify the expense rather than an unrelated goods item. Sales totals reconcile quantity × unit price × (1 − selected discount rate) × (1 + selected tax rate); unused rates are zero. Sample values are precomputed numbers, not executable formulas.

Every sample experience explicitly says it is synthetic demonstration/testing data. Entity names are fictional, references are DEMO-prefixed, and no personal banking/contact records are used. Internal seeded generation makes tests reproducible; users receive a fresh seed. No external generation service is involved.

## Versioned metadata and safe return

Hidden `_EF_Metadata` starts with `ExcelFlowAIBuilderMetadata` in A1. Chunked JSON in column B records product, schema version 1, Builder schema version 1, template/version/name, workbook name, generated timestamp, output mode, sampleData, capacity/count, formats/currency, source sheet/header and ordered fields with stable IDs, labels, types, roles, required state and validation. It contains no business record copies, credentials or session secrets. `_EF_Lists` is veryHidden and supplies named dropdown ranges.

`builder-import.js` verifies the marker/schema/structure and matches unique current headings to metadata identities. Reordering is restored by unique label matching. Changed/missing/duplicate headings do not receive guessed roles; the source screen explains what needs confirmation. Damaged/future metadata falls back to ordinary source review and manual mapping. Changing the header row deliberately clears metadata-derived mapping. Ordinary source uploads and saved Report Data metadata retain their existing import behavior.

Prepared completely empty rows are ignored by the established source preparation engine. Entry beyond prepared capacity remains readable by the source importer, but formatting/validation must be extended in Excel by the owner. Sample Builder files are source workbooks: use Create. Explore continues to require a processed ExcelFlow AI report containing Report Data.

## Limits

- Initial supported capacity is 100–5,000 rows and 1–64 selected fields; list validation supports up to 50 values of 100 characters each.
- Blank totals are owner-entered values. This tier does not add automatic formula totals, recalculation, inventory balances or an ERP.
- Native validation helps data entry but cannot enforce complete rows when users paste or leave cells empty. The importer retains its existing invalid/blank amount treatment.
- Advanced synthetic profiles and multi-currency simulation are intentionally omitted; the shared monetary engines still support currency isolation on user data.
- Numeric display follows Excel locale; the input convention applies to text parsing only.
- Native Microsoft Excel automation was blocked by environment access restrictions; structural parsing and independent rendered inspection passed. This is not a native repair-dialog/interactive dropdown certification.
- Automated sandbox downloads are verified by fetching and reopening the exact generated download Blob bytes.

All processing stays on-device after bundled assets load. Nothing was pushed or deployed.
