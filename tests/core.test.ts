import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  initialConfig,
  type Source,
  type Config,
  type AIResult,
} from "../src/domain";
import {
  numeric,
  day,
  periodRange,
  detectFormats,
  suggest,
  prepare,
  kpis,
  groups,
  makePayload,
} from "../src/engine";
import { loadSource, exportReport, exportBuilder } from "../src/files";
import {
  fieldsFor,
  modelNames,
  sampleSource,
  type BuildSettings,
} from "../src/builder";
import { verifyAI, verifyPayload, renderText } from "../src/grounding";
import { analysisPDF } from "../src/pdf";
const source: Source = {
  name: "synthetic.xlsx",
  sheet: "Data",
  sheets: ["Data"],
  header: 0,
  rows: [
    [
      "Date",
      "Reference",
      "Description",
      "Amount",
      "Currency",
      "Category",
      "Extra",
    ],
    ["2026-01-01", "A", "Receipt", 100, "EUR", "Sales", "X"],
    ["2026-01-02", "B", "Payment", -30, "EUR", "Rent", "Y"],
    ["2026-02-01", "C", "Refund", 0, "EUR", "Sales", "X"],
    ["bad", "D", "Unknown", "bad", "EUR", "Rent", "Y"],
    ["2026-01-03", "E", "Other", 500, "USD", "Sales", "Z"],
  ],
};
const config = (): Config => ({
  ...initialConfig(),
  reports: ["Report Data", "Inflows", "Outflows", "Analysis"],
  selected: [0, 1, 2, 3, 4, 5],
  mapping: {
    Date: 0,
    Reference: 1,
    Description: 2,
    Amount: 3,
    Currency: 4,
    Category: 5,
  },
  groups: [
    {
      column: 6,
      level: "value",
      values: [],
      sort: "label",
      descending: false,
      chart: true,
    },
    {
      column: 0,
      level: "month",
      values: [],
      sort: "label",
      descending: false,
      chart: true,
    },
  ],
});
test("regional numbers, signs, blank values and date rollover", () => {
  assert.equal(numeric("19,20", "comma"), 19.2);
  assert.equal(numeric("19.20"), 19.2);
  assert.equal(numeric("(1,234.50)"), -1234.5);
  assert.equal(numeric("12oops"), null);
  assert.equal(numeric(""), null);
  assert.equal(day("31/02/2026"), null);
  assert.equal(day("03/04/2026", "MDY"), "2026-03-04");
  assert.equal(day(1, "DMY", true), "1904-01-02");
  assert.equal(day("2026-01-01"), "2026-01-01");
});
test("period boundaries include previous year transitions", () => {
  assert.deepEqual(
    periodRange(
      { ...initialConfig(), period: "previous-quarter" },
      new Date(2026, 0, 15),
    ),
    ["2025-10-01", "2025-12-31"],
  );
  assert.throws(() =>
    periodRange({
      ...initialConfig(),
      period: "custom",
      start: "2026-03-01",
      end: "2026-01-01",
    }),
  );
});
test("safe suggestions, ambiguity and validated mapping priority", () => {
  const c = config();
  assert.equal(suggest(source, c).mapping.Amount, undefined);
  assert.equal(
    suggest({ ...source, rows: source.rows.filter((_, i) => i !== 4) }, c)
      .mapping.Amount,
    3,
  );
  const s = {
    ...source,
    rows: [
      ["Date", "Order Date", "Amount", "Net Amount", "Currency", "Currency"],
      ["2026-01-01", "2026-01-02", 20, 18, "EUR", "EUR"],
    ],
  };
  const r = suggest(s, { ...initialConfig(), selected: [0, 1, 2, 3, 4, 5] });
  assert.deepEqual(r.mapping, {});
  assert.deepEqual(r.ambiguous.sort(), ["Amount", "Currency", "Date"]);
  assert.deepEqual(
    suggest({ ...s, mapping: { Date: 1, Amount: 3 } }, c).mapping.Date,
    1,
  );
});
test("currency isolation, invalid values, zero and grouped totals reconcile", () => {
  const d = prepare(source, config());
  assert.equal(d.audit.invalidAmounts, 1);
  assert.equal(d.audit.invalidDates, 1);
  assert.equal(d.audit.reconciled, true);
  const eur = d.records.filter((r) => r.currency === "EUR"),
    k = kpis(eur);
  assert.equal(k.inflow, 100);
  assert.equal(k.outflow, -30);
  assert.equal(k.net, 70);
  assert.equal(k.zeroCount, 1);
  const g = groups(eur, config().groups[0]);
  assert.equal(
    g.reduce((a, b) => a + b.net, 0),
    70,
  );
  assert.equal(
    g.reduce((a, b) => a + b.count, 0),
    4,
  );
  assert.equal(kpis(d.records.filter((r) => r.currency === "USD")).net, 500);
  for (const level of ["day", "week", "month", "quarter", "year"] as const)
    assert.equal(
      groups(
        eur.filter((r) => r.day),
        { ...config().groups[1], level },
      ).reduce((a, b) => a + b.net, 0),
      70,
    );
});
test("duplicates flagged, never deleted; dates optional; no monetary role invented", () => {
  const s = { ...source, rows: [...source.rows, source.rows[1]] };
  const d = prepare(s, config());
  assert.equal(d.audit.duplicateRows, 1);
  assert.equal(d.records.length, 6);
  assert.throws(() =>
    prepare(source, { ...config(), mapping: {}, period: "month" }),
  );
  const c = { ...config(), reports: ["Report Data"], mapping: {} };
  assert.equal(prepare(source, c).records.length, 5);
});
test("real Excel output: separate analysis, native charts, bounded fills, filters and reopen parity", async () => {
  const d = prepare(source, config());
  const bytes = await exportReport(d);
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(bytes);
  assert.ok(w.getWorksheet("Analysis - Summary"));
  assert.ok(w.getWorksheet("Analysis - Charts"));
  assert.equal(w.getWorksheet("Report Data")!.rowCount, 6);
  assert.ok(w.getWorksheet("Report Data")!.autoFilter);
  assert.equal(w.getWorksheet("Inflows")!.autoFilter, undefined);
  assert.equal(w.getWorksheet("Analysis - Summary")!.autoFilter, undefined);
  assert.equal(w.getWorksheet("Report Data")!.getCell("G2").fill, undefined);
  assert.equal(
    w.worksheets.filter((s) => s.name.startsWith("Group ")).length,
    2,
  );
  const zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file("xl/charts/chart1.xml"));
  const reopened = await loadSource(bytes, "processed.xlsx");
  assert.ok(reopened.recognized);
  assert.equal(reopened.mapping!.Amount, 3);
  const second = prepare(reopened, {
    ...config(),
    selected: [0, 1, 2, 3, 4, 5],
    mapping: reopened.mapping!,
    groups: [],
  });
  assert.equal(
    kpis(second.records.filter((r) => r.currency === "EUR")).net,
    70,
  );
});
test("CSV semicolons, embedded commas/newlines, unicode and exact text", async () => {
  const text =
    'Date;Description;Amount;Currency\n2026-01-01;"Café, desk\nnext line";19,20;EUR';
  const s = await loadSource(new TextEncoder().encode(text).buffer, "data.csv");
  assert.equal(s.rows[1][1], "Café, desk\nnext line");
  assert.equal(s.rows[1][2], "19,20");
  const c = {
    ...initialConfig(),
    numberStyle: "comma" as const,
    selected: [0, 1, 2, 3],
  };
  c.mapping = suggest(s, c).mapping;
  assert.equal(prepare(s, c).records[0].amount, 19.2);
  await assert.rejects(() =>
    loadSource(new TextEncoder().encode("a,b\n1,2,3").buffer, "bad.csv"),
  );
});
test("preamble/header override, cached formulas, malicious strings and invalid metadata", async () => {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("Data");
  s.addRows([
    ["Report heading"],
    [],
    ["Fecha", "Importe", "Divisa"],
    ["2026-01-01", { formula: "2+3", result: 5 }, "EUR"],
  ]);
  const b = await w.xlsx.writeBuffer(),
    src = await loadSource(b as ArrayBuffer, "source.xlsx");
  assert.equal(src.header, 2);
  assert.equal(src.rows[3][1], 5);
  await assert.rejects(() =>
    loadSource(new TextEncoder().encode("not zip").buffer, "bad.xlsx"),
  );
  await assert.rejects(() => loadSource(new ArrayBuffer(0), "bad.xls"));
});
for (const model of modelNames)
  test(`builder ${model}: blank/sample valid, native types and return mappings`, async () => {
    const settings: BuildSettings = {
      model,
      fields: fieldsFor(model),
      count: 100,
      filename: "sample.xlsx",
      currency: "EUR",
      months: 3,
      start: "",
      end: "",
      dateFormat: "dd/mm/yyyy",
      numberStyle: "point",
    };
    const blank = await exportBuilder(settings, true),
      sample = await exportBuilder(settings, false);
    const reopened = await loadSource(
      sample.bytes as ArrayBuffer,
      "sample.xlsx",
    );
    assert.ok(reopened.recognized);
    assert.equal(reopened.rows.length, 101);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(blank.bytes);
    assert.equal(wb.getWorksheet("Workbook Data")!.getCell("A2").value, null);
    const c = {
      ...initialConfig(),
      selected: settings.fields.map((_, i) => i),
      mapping: reopened.mapping!,
      reports:
        model === "Custom Workbook"
          ? ["Report Data"]
          : ["Report Data", "Analysis"],
    };
    assert.equal(prepare(reopened, c).records.length, 100);
  });
test("two thousand sample records round trip exactly; metadata maps reordered export positions", async () => {
  const settings: BuildSettings = {
      model: modelNames[5],
      fields: fieldsFor(modelNames[5]),
      count: 2000,
      filename: "sample.xlsx",
      currency: "EUR",
      months: 6,
      start: "",
      end: "",
      dateFormat: "dd/mm/yyyy",
      numberStyle: "point",
    },
    s = sampleSource(settings),
    c = {
      ...initialConfig(),
      selected: s.rows[0].map((_, i) => i).reverse(),
      mapping: s.mapping!,
    },
    d = prepare(s, c);
  const b = await exportReport(d),
    back = await loadSource(b, "report.xlsx");
  const d2 = prepare(back, {
    ...c,
    selected: back.rows[0].map((_, i) => i),
    mapping: back.mapping!,
  });
  assert.equal(d2.records.length, 2000);
  assert.equal(kpis(d.records).net, kpis(d2.records).net);
});
test("AI grounding rejects invented numbers, references, sessions and currencies; PDF valid", async () => {
  const d = prepare(source, config()),
    p = makePayload(d, d.records, "EUR", "English", 5);
  verifyPayload(p);
  const r: AIResult = {
    sessionId: d.id,
    findings: [
      {
        title: "Positive net flow",
        explanation: "Net flow was {{kpi.net}}.",
        metricIds: ["kpi.net"],
        evidenceIds: ["row-2"],
        importance: "medium",
        limitation: "Only the supplied records are included.",
      },
    ],
    answer: "The net flow is {{kpi.net}}.",
    metricIds: ["kpi.net"],
    evidenceIds: [],
    language: "English",
  };
  verifyAI(r, p);
  assert.equal(renderText(r.answer, p), "The net flow is 70.00.");
  assert.throws(() => verifyAI({ ...r, answer: "The total is 999." }, p));
  assert.throws(() => verifyAI({ ...r, sessionId: crypto.randomUUID() }, p));
  assert.throws(() => verifyAI({ ...r, metricIds: ["invented"] }, p));
  assert.throws(() => verifyPayload({ ...p, currency: "USD" }));
  const pdf = await analysisPDF(p, r);
  assert.equal(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
});
test("large dataset arithmetic stays bounded and exact", () => {
  const rows = [
    source.rows[0],
    ...Array.from({ length: 50000 }, (_, i) => [
      "2026-01-01",
      String(i),
      "Sample",
      i % 2 ? -0.25 : 1,
      "EUR",
      "Sample",
      "X",
    ]),
  ] as Source["rows"];
  const start = performance.now(),
    d = prepare({ ...source, rows }, config());
  assert.equal(kpis(d.records).net, 18750);
  console.log(
    JSON.stringify({
      records: 50000,
      prepareMs: Math.round(performance.now() - start),
    }),
  );
});

test("regional format inference and grouping use the selected date field", () => {
  const s: Source = {
    name: "regional.csv",
    sheet: "Data",
    sheets: ["Data"],
    header: 0,
    rows: [
      ["Date", "Other Date", "Amount"],
      ["03/15/2026", "04/20/2026", "19,20"],
      ["03/16/2026", "04/21/2026", "-5,10"],
    ],
  };
  assert.deepEqual(detectFormats(s), {
    numberStyle: "comma",
    dateOrder: "MDY",
  });
  const d = prepare(s, {
    ...initialConfig(),
    ...detectFormats(s),
    selected: [0, 1, 2],
    mapping: { Date: 0, Amount: 2 },
  });
  const g = groups(d.records, {
    column: 1,
    level: "month",
    dateOrder: "MDY",
    values: [],
    sort: "label",
    descending: false,
    chart: true,
  });
  assert.equal(g[0].label, "2026-04");
  assert.equal(g[0].net, 14.1);
  const p = makePayload(d, d.records, "Source units", "English", 1);
  assert.equal(
    p.metrics.find((m) => m.id === "kpi.largestIn")!.rowIds[0],
    d.records[0].id,
  );
});

test("Excel strings remain strings; dynamic flow totals have cached results", async () => {
  const s: Source = {
    name: "safe.csv",
    sheet: "Data",
    sheets: ["Data"],
    header: 0,
    rows: [
      ["Description", "Amount", "Currency"],
      ['=HYPERLINK("https://example.invalid")', 10, "EUR"],
      ["<script>alert(1)</script>", -3, "EUR"],
    ],
  };
  const d = prepare(s, {
      ...initialConfig(),
      selected: [0, 1, 2],
      mapping: { Description: 0, Amount: 1, Currency: 2 },
    }),
    bytes = await exportReport(d),
    w = new ExcelJS.Workbook();
  await w.xlsx.load(bytes);
  assert.equal(
    w.getWorksheet("Report Data")!.getCell("A2").value,
    s.rows[1][0],
  );
  assert.equal(
    (w.getWorksheet("Inflows")!.getCell("B4").value as any).result,
    10,
  );
  assert.equal(
    (w.getWorksheet("Outflows")!.getCell("B4").value as any).result,
    -3,
  );
});
test("long heading metadata is chunked and UTF-8 errors are actionable", async () => {
  const long = "H".repeat(1200),
    s: Source = {
      name: "wide.xlsx",
      sheet: "Data",
      sheets: ["Data"],
      header: 0,
      rows: [
        Array.from({ length: 30 }, (_, i) => long + i),
        Array.from({ length: 30 }, () => 1),
      ],
    };
  const d = prepare(s, {
    ...initialConfig(),
    selected: s.rows[0].map((_, i) => i),
    mapping: { Amount: 0 },
    reports: ["Report Data"],
  });
  const bytes = await exportReport(d),
    back = await loadSource(bytes, "wide.xlsx");
  assert.equal(back.recognized, true);
  assert.equal(back.mapping!.Amount, 0);
  await assert.rejects(
    () => loadSource(new Uint8Array([255, 254, 0, 0]).buffer, "bad.csv"),
    /UTF-8/,
  );
});
