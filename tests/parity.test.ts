import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { loadSource, exportReport } from "../src/files";
import { initialConfig } from "../src/domain";
import { prepare, suggest, sourceColumns, kpis } from "../src/engine";
test("merged preamble: exact header, physical column names, roles and 71 data records", async () => {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("Records");
  s.mergeCells("B2:J2");
  s.getCell("B2").value = "Activity statement";
  s.mergeCells("B3:J3");
  s.getCell("B3").value = "Generated report";
  s.getRow(5).values = [
    null,
    "F.Valor",
    "Fecha",
    "Concepto",
    "Movimiento",
    "Importe",
    "Divisa",
    "Disponible",
    "Divisa",
    "Observaciones",
  ];
  for (let i = 0; i < 71; i++)
    s.getRow(i + 6).values = [
      null,
      "30/09/2026",
      "30/09/2026",
      "Receipt",
      "Transfer",
      i < 34 ? 100 : -50,
      "EUR",
      100,
      "EUR",
      "Reviewed",
    ];
  const source = await loadSource(
    (await w.xlsx.writeBuffer()) as ArrayBuffer,
    "statement.xlsx",
  );
  assert.equal(source.header, 4);
  assert.deepEqual(sourceColumns(source), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const c = {
    ...initialConfig(),
    selected: [1, 3, 5, 9],
    reports: ["Report Data", "Inflows", "Outflows", "Analysis"],
  };
  c.mapping = suggest(source, c).mapping;
  assert.deepEqual(c.mapping, { Date: 1, Description: 3, Amount: 5, Notes: 9 });
  const ds = prepare(source, c);
  assert.equal(ds.records.length, 71);
  assert.equal(ds.audit.invalidAmounts, 0);
  assert.equal(kpis(ds.records).inCount, 34);
  assert.equal(kpis(ds.records).outCount, 37);
  const bytes = await exportReport(ds),
    out = new ExcelJS.Workbook();
  await out.xlsx.load(bytes);
  const summary = out.getWorksheet("Analysis - Summary")!;
  assert.equal(summary.getCell("A7").value, "Total Inflows");
  assert.equal(summary.getCell("J8").value, 71);
  assert.ok(summary.model.merges.includes("A1:L1"));
  assert.ok(summary.model.merges.includes("A8:C8"));
  assert.equal(summary.views[0].showGridLines, false);
  const zip = await JSZip.loadAsync(bytes),
    charts = await Promise.all(
      [1, 2, 3].map((i) =>
        zip.file(`xl/charts/chart${i}.xml`)!.async("string"),
      ),
    );
  assert.match(charts[0], /absolute outflow magnitude/);
  assert.match(charts[0], /strCache/);
  assert.match(charts[0], /numCache/);
  assert.match(charts[1], /lineChart/);
  assert.match(charts[2], /doughnutChart/);
  assert.equal(out.getWorksheet("Report Data")!.rowCount, 72);
  const reopened = await loadSource(bytes, "report.xlsx");
  assert.ok(reopened.recognized);
  assert.equal(
    prepare(reopened, {
      ...c,
      selected: [0, 1, 2, 3],
      mapping: reopened.mapping!,
    }).records.length,
    71,
  );
});
test("defaults and normalized sorting preserve the reporting workflow", () => {
  assert.deepEqual(initialConfig().reports, [
    "Report Data",
    "Inflows",
    "Outflows",
  ]);
  const source = {
    name: "data.csv",
    sheet: "Data",
    sheets: ["Data"],
    header: 0,
    rows: [
      ["Date", "Amount"],
      ["01/02/2026", -2],
      ["31/01/2026", -10],
      ["02/02/2026", 3],
    ],
  };
  const c = {
    ...initialConfig(),
    selected: [0, 1],
    mapping: { Date: 0, Amount: 1 },
    sort: 0,
  };
  assert.equal(prepare(source, c).records[0].day, "2026-01-31");
  assert.equal(prepare(source, { ...c, sort: 1 }).records[0].amount, -10);
  const g = {
    column: 0,
    level: "value" as const,
    values: [],
    mode: "selected" as const,
    sort: "label" as const,
    descending: false,
    chart: false,
  };
  assert.throws(
    () => prepare(source, { ...c, reports: ["Analysis"], groups: [g] }),
    /Choose at least one/,
  );
});
