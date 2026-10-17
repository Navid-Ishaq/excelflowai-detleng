import ExcelJS from "exceljs";
import Papa from "papaparse";
import JSZip from "jszip";
import {
  type Source,
  type Config,
  type Dataset,
  type Value,
  type Finding,
  label,
} from "./domain";
import { inferHeader, numeric, day, kpis } from "./engine";
import { type BuildSettings, sampleSource, validateBuild } from "./builder";
import { analysisWorkbook } from "./analysis-workbook";
import { attachCharts } from "./xlsx-charts";
const LIMIT = 200000,
  MAXCOL = 256,
  MAXBYTES = 20 * 1024 * 1024;
const META = "_EF_Config";
function clean(v: unknown): Value {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return clean(o.result);
    if (Array.isArray(o.richText))
      return o.richText.map((t: { text: string }) => t.text).join("");
    if ("text" in o) return String(o.text);
    return null;
  }
  return typeof v === "number" || typeof v === "boolean" ? v : String(v);
}
async function readXlsx(bytes: ArrayBuffer) {
  if (bytes.byteLength > MAXBYTES)
    throw Error("Choose a file smaller than 20 MB.");
  const zip = await JSZip.loadAsync(bytes);
  let expanded = 0;
  const entries = Object.values(zip.files);
  if (entries.length > 4000)
    throw Error("This workbook contains too many objects.");
  for (const entry of entries) {
    expanded += Number(
      (entry as unknown as { _data?: { uncompressedSize: number } })._data
        ?.uncompressedSize || 0,
    );
    if (expanded > 200 * 1024 * 1024)
      throw Error("Expanded workbook exceeds the supported size.");
  }
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(bytes);
  return w;
}
export async function loadSource(
  bytes: ArrayBuffer,
  name: string,
  sheet?: string,
  delimiter?: string,
): Promise<Source> {
  if (bytes.byteLength > MAXBYTES)
    throw Error("Choose a file smaller than 20 MB.");
  if (/\.csv$/i.test(name)) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw Error(
        "This CSV is not valid UTF-8. Save it as UTF-8 CSV and try again.",
      );
    }
    const parsed = Papa.parse<string[]>(text, {
      skipEmptyLines: "greedy",
      delimiter: delimiter || "",
      delimitersToGuess: [",", ";", "\t", "|"],
    });
    if (parsed.errors.length)
      throw Error(
        "CSV structure is ambiguous or malformed. Check quotes and delimiter.",
      );
    const rows = parsed.data.map((r) => r.map((v) => (v === "" ? null : v)));
    if (
      rows.length > LIMIT + 50 ||
      Math.max(...rows.slice(0, 50).map((r) => r.length)) > MAXCOL
    )
      throw Error("CSV exceeds 200,000 records or 256 columns.");
    if (!rows.length) throw Error("This CSV has no records.");
    const width = Math.max(...rows.slice(0, 50).map((r) => r.length));
    if (rows.some((r) => r.length !== width))
      throw Error(
        "CSV rows have different widths. Confirm the delimiter and missing fields.",
      );
    return {
      name,
      sheet: "CSV data",
      sheets: ["CSV data"],
      rows,
      header: inferHeader(rows),
    };
  }
  if (!/\.xlsx$/i.test(name))
    throw Error(
      "Supported files are .xlsx and UTF-8 .csv. Convert legacy or encrypted files before uploading.",
    );
  const w = await readXlsx(bytes),
    sheets = w.worksheets
      .filter((s) => s.name !== META && s.name !== "_EF_Lists")
      .map((s) => s.name);
  if (!sheets.length) throw Error("No visible source worksheets found.");
  const nameOfSheet =
    sheet || sheets.find((s) => s === "Report Data") || sheets[0];
  const s = w.getWorksheet(nameOfSheet);
  if (!s) throw Error("Worksheet not found.");
  if (s.rowCount > LIMIT + 50 || s.columnCount > MAXCOL)
    throw Error("Worksheet exceeds 200,000 records or 256 columns.");
  const rows: Value[][] = [];
  for (let i = 1; i <= s.rowCount; i++) {
    const row = s.getRow(i);
    rows.push(
      Array.from({ length: s.columnCount }, (_, j) =>
        clean(row.getCell(j + 1).value),
      ),
    );
  }
  if (!rows.some((r) => r.some((v) => v !== null && v !== "")))
    throw Error("This worksheet is empty.");
  const source: Source = {
    name,
    sheet: nameOfSheet,
    sheets,
    rows,
    header: inferHeader(rows),
    date1904: !!w.properties.date1904,
  };
  const meta = w.getWorksheet(META);
  if (meta) {
    try {
      if (meta.getCell("A1").value !== "ExcelFlowAI:1") throw Error();
      if (meta.rowCount > 50) throw Error();
      let raw = "";
      for (let row = 1; row <= meta.rowCount; row++) {
        const part = meta.getCell(row, 2).value;
        if (typeof part !== "string") throw Error();
        raw += part;
      }
      if (raw.length > 1000000) throw Error();
      const m = JSON.parse(raw);
      if (m.sheet !== nameOfSheet) return source;
      if (
        !Array.isArray(m.headers) ||
        m.headers.length !== s.columnCount ||
        !m.headers.every(
          (h: string, i: number) => h === String(rows[0]?.[i] ?? ""),
        )
      )
        throw Error();
      if (
        !m.mapping ||
        Object.values(m.mapping).some(
          (i) =>
            !Number.isInteger(i) ||
            (i as number) < 0 ||
            (i as number) >= s.columnCount,
        ) ||
        new Set(Object.values(m.mapping)).size !== Object.keys(m.mapping).length
      )
        throw Error();
      const allowed = [
        "Date",
        "Amount",
        "Description",
        "Details",
        "Notes",
        "Category",
        "Currency",
        "Balance",
        "Reference",
      ];
      if (Object.keys(m.mapping).some((k) => !allowed.includes(k)))
        throw Error();
      source.mapping = m.mapping;
      if (["point", "comma"].includes(m.numberStyle))
        source.numberStyle = m.numberStyle;
      if (["DMY", "MDY", "YMD"].includes(m.dateOrder))
        source.dateOrder = m.dateOrder;
      source.header = 0;
      source.recognized = true;
    } catch {
      source.warning =
        "Saved column mappings could not be verified. Review roles manually.";
    }
  }
  return source;
}
const fill = (color: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: color },
});
const numfmt = "#,##0.00;[Red]-#,##0.00";
function styledTable(
  w: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: Value[][],
  start = 1,
  filter = false,
) {
  const s = w.getWorksheet(name) || w.addWorksheet(name);
  s.views = [{ state: "frozen", ySplit: start }];
  s.getRow(start).values = headers;
  headers.forEach((_, i) => {
    s.getColumn(i + 1).width = Math.min(
      48,
      Math.max(18, headers[i].length + 4),
    );
  });
  for (let i = 0; i < rows.length; i++)
    s.getRow(start + 1 + i).values = rows[i] as ExcelJS.CellValue[];
  for (let row = start; row <= start + rows.length; row++)
    for (let col = 1; col <= headers.length; col++) {
      const c = s.getCell(row, col);
      c.alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
        indent: 1,
      };
      c.font = {
        name: "Calibri",
        size: 11,
        ...(row === start ? { bold: true, color: { argb: "FFFFFFFF" } } : {}),
      };
      if (row === start) c.fill = fill("FF163D36");
      else if ((row - start) % 2 === 1) c.fill = fill("FFF0F6F3");
      if (typeof c.value === "number")
        c.numFmt = /count|transactions|records/i.test(headers[col - 1])
          ? "0"
          : numfmt;
    }
  s.getRow(start).height = 30;
  for (let row = start + 1; row <= start + rows.length; row++)
    s.getRow(row).height = Math.max(
      30,
      ...headers.map((_, i) =>
        Math.min(
          409,
          16 *
            (Math.ceil(
              String(s.getCell(row, i + 1).value ?? "").length /
                (s.getColumn(i + 1).width! - 3),
            ) +
              1),
        ),
      ),
    );
  if (filter)
    s.autoFilter = {
      from: { row: start, column: 1 },
      to: { row: start + rows.length, column: headers.length },
    };
  return s;
}
function metadata(
  w: ExcelJS.Workbook,
  headers: string[],
  mapping: Source["mapping"],
  sheet: string,
  numberStyle = "point",
  dateOrder = "DMY",
) {
  const s = w.addWorksheet(META, { state: "veryHidden" });
  const raw = JSON.stringify({
    brand: "ExcelFlow AI",
    version: 1,
    headers,
    mapping,
    sheet,
    numberStyle,
    dateOrder,
  });
  if (raw.length > 1000000)
    throw Error("Workbook headings exceed the supported metadata size.");
  for (let i = 0; i < raw.length; i += 20000)
    s.addRow([i ? "Continuation" : "ExcelFlowAI:1", raw.slice(i, i + 20000)]);
}
export async function exportReport(ds: Dataset, findings: Finding[] = []) {
  const w = new ExcelJS.Workbook();
  w.creator = "ExcelFlow AI by DeTLeng";
  w.created = new Date();
  w.calcProperties.fullCalcOnLoad = true;
  const c = ds.config,
    selected = c.selected;
  const headers = selected.map((i) => ds.headers[i]);
  const converted = (r: Dataset["records"][number]) =>
    selected.map((i) =>
      i === c.mapping.Amount && r.amount != null
        ? r.amount
        : i === c.mapping.Date && r.day
          ? new Date(r.day + "T00:00:00Z")
          : (r.values[i] ?? null),
    );
  for (const name of c.reports.filter((n) => n !== "Analysis")) {
    const rec =
      name === "Inflows"
        ? ds.records.filter((r) => r.amount != null && r.amount > 0)
        : name === "Outflows"
          ? ds.records.filter((r) => r.amount != null && r.amount < 0)
          : ds.records;
    const s = styledTable(
      w,
      name,
      headers,
      rec.map(converted) as Value[][],
      1,
      name === "Report Data",
    );
    if (c.mapping.Date != null && selected.includes(c.mapping.Date)) {
      const index = selected.indexOf(c.mapping.Date) + 1;
      for (let i = 2; i <= rec.length + 1; i++)
        s.getCell(i, index).numFmt =
          c.dateOrder === "MDY" ? "mm/dd/yyyy" : "dd/mm/yyyy";
    }
    if (c.mapping.Amount != null && selected.includes(c.mapping.Amount)) {
      const index = selected.indexOf(c.mapping.Amount) + 1;
      for (let i = 2; i <= rec.length + 1; i++) {
        s.getCell(i, index).numFmt = numfmt;
        s.getCell(i, index).fill = fill("FFE5F1FC");
      }
    }
    if (
      name !== "Report Data" &&
      c.mapping.Amount != null &&
      selected.includes(c.mapping.Amount)
    ) {
      const col = selected.indexOf(c.mapping.Amount) + 1,
        totalRow = rec.length + 3;
      s.getCell(totalRow, 1).value = "Total";
      if (new Set(rec.map((r) => r.currency)).size <= 1) {
        const letter = s.getColumn(col).letter;
        s.getCell(totalRow, col).value = {
          formula: rec.length
            ? `SUM(${letter}2:${letter}${rec.length + 1})`
            : "0",
          result: kpis(rec).net,
        };
        s.getCell(totalRow, col).numFmt = numfmt;
      } else
        s.getCell(totalRow, 2).value =
          "Mixed currencies: see Analysis by currency.";
    }
  }
  const summaries = c.reports.includes("Analysis")
    ? analysisWorkbook(w, ds)
    : [];
  if (findings.length)
    styledTable(
      w,
      "AI Findings",
      [
        "Finding",
        "Explanation",
        "Metric references",
        "Row references",
        "Importance",
        "Limitations",
      ],
      findings.map((f) => [
        f.title,
        f.explanation,
        f.metricIds.join(", "),
        f.evidenceIds.join(", "),
        f.importance,
        f.limitation,
      ]),
    );
  if (!w.worksheets.length) throw Error("Choose report sheets.");
  if (w.getWorksheet("Report Data"))
    metadata(
      w,
      headers,
      Object.fromEntries(
        Object.entries(c.mapping)
          .filter(([, i]) => selected.includes(i))
          .map(([key, i]) => [key, selected.indexOf(i)]),
      ),
      "Report Data",
    );
  const bytes = await w.xlsx.writeBuffer();
  return attachCharts(bytes as ArrayBuffer, summaries);
}
export async function exportBuilder(settings: BuildSettings, blank: boolean) {
  validateBuild(settings);
  const source = sampleSource(settings, blank),
    w = new ExcelJS.Workbook();
  w.creator = "ExcelFlow AI by DeTLeng";
  const s = styledTable(
    w,
    "Workbook Data",
    settings.fields.map((f) => f.name),
    source.rows.slice(1),
    1,
    true,
  );
  const capacity = settings.count;
  for (let row = 2; row <= capacity + 1; row++)
    for (let i = 0; i < settings.fields.length; i++) {
      const f = settings.fields[i],
        cell = s.getCell(row, i + 1);
      cell.alignment = { horizontal: "left", vertical: "middle" };
      if (f.type === "number") cell.numFmt = numfmt;
      if (f.type === "date") {
        cell.numFmt = settings.dateFormat;
        if (!blank && typeof cell.value === "string")
          cell.value = new Date(cell.value + "T12:00:00Z");
      }
      if (blank && row % 2 === 0) cell.fill = fill("FFF0F6F3");
      if (f.type === "list" && f.options.trim()) {
        const items = f.options
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        const lists =
          w.getWorksheet("_EF_Lists") ||
          w.addWorksheet("_EF_Lists", { state: "veryHidden" });
        items.forEach((v, j) => (lists.getCell(j + 1, i + 1).value = v));
        const col = s.getColumn(i + 1).letter;
        const listCol = lists.getColumn(i + 1).letter;
        cell.dataValidation = {
          type: "list",
          allowBlank: !f.required,
          formulae: [`'_EF_Lists'!$${listCol}$1:$${listCol}$${items.length}`],
          showErrorMessage: true,
          errorTitle: "Choose a listed value",
          error: "Use a value from the dropdown.",
        };
        void col;
      } else if (f.type === "number")
        cell.dataValidation = {
          type: "decimal",
          operator: "between",
          formulae: [-1e12, 1e12],
          allowBlank: !f.required,
        };
    }
  s.autoFilter = {
    from: "A1",
    to: s.getCell(capacity + 1, settings.fields.length).address,
  };
  metadata(
    w,
    settings.fields.map((f) => f.name),
    source.mapping,
    "Workbook Data",
    settings.numberStyle,
    settings.dateFormat.startsWith("yyyy")
      ? "YMD"
      : settings.dateFormat.startsWith("mm")
        ? "MDY"
        : "DMY",
  );
  return { bytes: await w.xlsx.writeBuffer(), source };
}
