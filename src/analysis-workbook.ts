import ExcelJS from "exceljs";
import { type Dataset, type Value } from "./domain";
import { groups, kpis } from "./engine";
import { type ChartSpec } from "./xlsx-charts";
const amountFormat = "#,##0.00;[Red]-#,##0.00";
const shade = (color: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: color },
});
function cell(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  bold = false,
) {
  const c = sheet.getCell(row, col);
  c.value = value;
  c.font = { name: "Calibri", size: 11, bold, color: { argb: "FF163D36" } };
  c.alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true,
    indent: 1,
  };
  return c;
}
function band(s: ExcelJS.Worksheet, r: number, title: string) {
  s.mergeCells(r, 1, r, 12);
  cell(s, r, 1, title, true).font.size = 15;
  s.getRow(r).height = 32;
}
function navigation(
  s: ExcelJS.Worksheet,
  r: number,
  title: string,
  target: string,
) {
  s.mergeCells(r, 1, r, 4);
  const c = cell(
    s,
    r,
    1,
    { text: title, hyperlink: `#'${target.replaceAll("'", "''")}'!A1` },
    true,
  );
  c.fill = shade("FF08796E");
  c.font.color = { argb: "FFFFFFFF" };
  s.getRow(r).height = 28;
}
function base(s: ExcelJS.Worksheet) {
  for (let c = 1; c <= 12; c++) s.getColumn(c).width = 16;
  s.views = [{ state: "frozen", ySplit: 3, showGridLines: false }];
  s.properties.defaultRowHeight = 21;
  s.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
}
function table(
  s: ExcelJS.Worksheet,
  row: number,
  headers: string[],
  rows: Value[][],
) {
  headers.forEach((h, i) => {
    const c = cell(s, row, i + 1, h, true);
    c.fill = shade("FF163D36");
    c.border = {
      top: { style: "thin", color: { argb: "FFD7E2DA" } },
      bottom: { style: "thin", color: { argb: "FFD7E2DA" } },
      left: { style: "thin", color: { argb: "FFD7E2DA" } },
      right: { style: "thin", color: { argb: "FFD7E2DA" } },
    };
    c.font.color = { argb: "FFFFFFFF" };
  });
  s.getRow(row).height = 36;
  rows.forEach((values, index) => {
    values.forEach((v, i) => {
      const c = cell(s, row + index + 1, i + 1, v);
      c.border = {
        top: { style: "thin", color: { argb: "FFD7E2DA" } },
        bottom: { style: "thin", color: { argb: "FFD7E2DA" } },
        left: { style: "thin", color: { argb: "FFD7E2DA" } },
        right: { style: "thin", color: { argb: "FFD7E2DA" } },
      };
      if (typeof v === "number")
        c.numFmt = /count|transactions/i.test(headers[i]) ? "0" : amountFormat;
      if (index % 2 === 0) c.fill = shade("FFF0F6F3");
    });
    s.getRow(row + index + 1).height = 40;
  });
  return row + rows.length + 2;
}
export function analysisWorkbook(
  w: ExcelJS.Workbook,
  ds: Dataset,
): ChartSpec[] {
  const c = ds.config,
    s = w.addWorksheet("Analysis - Summary"),
    specs: ChartSpec[] = [];
  base(s);
  const period = c.period === "custom" ? `${c.start} to ${c.end}` : c.period;
  band(s, 1, "ExcelFlow AI | Executive Analysis");
  navigation(s, 2, "View Charts →", "Analysis - Charts");
  band(s, 3, `Period: ${period} · ${ds.records.length} transactions`);
  let row = 5;
  const currencies = [...new Set(ds.records.map((r) => r.currency))];
  const dates = ds.records
    .filter((r) => r.day)
    .map((r) => r.day!)
    .sort();
  const span = dates.length
    ? (Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / 86400000
    : 0;
  const level =
    c.timeGrouping && c.timeGrouping !== "auto"
      ? c.timeGrouping
      : span <= 45
        ? "day"
        : span > 730
          ? "quarter"
          : "month";
  const descriptors: [string, keyof ReturnType<typeof kpis>][] = [
    ["Total Inflows", "inflow"],
    ["Total Outflows", "outflow"],
    ["Net Flow", "net"],
    ["Total Transactions", "count"],
    ["Inflow Transactions", "inCount"],
    ["Outflow Transactions", "outCount"],
    ["Average Inflow", "averageIn"],
    ["Average Outflow", "averageOut"],
    ["Largest Inflow", "largestIn"],
    ["Largest Outflow", "largestOut"],
    ["Inflow / Outflow Ratio", "ratio"],
    ["Net Flow Margin", "margin"],
  ];
  if (ds.audit.invalidAmounts || ds.audit.missingAmounts) {
    band(
      s,
      row,
      `${ds.audit.invalidAmounts} invalid and ${ds.audit.missingAmounts} blank amounts excluded from monetary calculations; retained in record counts.`,
    );
    row += 2;
  }
  if (currencies.length > 1) {
    band(
      s,
      row,
      "Currencies are analyzed separately. No conversion or combined monetary total.",
    );
    row += 2;
  }
  for (const currency of currencies) {
    const records = ds.records.filter((r) => r.currency === currency),
      k = kpis(records);
    band(s, row, `Business overview — ${currency}`);
    row += 2;
    const defs =
      c.mapping.Amount == null
        ? descriptors.filter((x) => x[1] === "count")
        : descriptors;
    defs.forEach(([name, key], i) => {
      const r = row + Math.floor(i / 4) * 3,
        col = 1 + (i % 4) * 3;
      s.mergeCells(r, col, r, col + 2);
      cell(s, r, col, name, true);
      s.getRow(r).height = 28;
      s.mergeCells(r + 1, col, r + 1, col + 2);
      const v = cell(s, r + 1, col, k[key] ?? "N/A");
      v.font.size = 18;
      v.fill = shade("FFEAF3E6");
      v.numFmt =
        key === "margin"
          ? "0.00%"
          : ["count", "inCount", "outCount"].includes(key)
            ? "0"
            : key === "ratio"
              ? '0.00"×"'
              : amountFormat;
      s.getRow(r + 1).height = 34;
    });
    row += Math.ceil(defs.length / 4) * 3 + 1;
    const dated = records
      .filter((r) => r.day)
      .map((r) => r.day!)
      .sort();
    if (dated.length) {
      band(s, row++, `First transaction: ${dated[0]} | Last: ${dated.at(-1)}`);
      const active = new Set(dated).size;
      band(
        s,
        row,
        `Active transaction days: ${active} | Average transactions per active day: ${(records.length / active).toFixed(2)}`,
      );
      row += 2;
    }
    const time =
      c.mapping.Date == null
        ? []
        : groups(
            records.filter((r) => r.day),
            {
              column: c.mapping.Date,
              level: level as "day",
              dateOrder: c.dateOrder,
              date1904: c.date1904,
              values: [],
              sort: "label",
              descending: false,
              chart: true,
            },
          );
    let timeStart = 0;
    if (time.length) {
      band(s, row++, `Time summary — ${level}`);
      timeStart = row + 1;
      row = table(
        s,
        row,
        [
          "Period",
          "Inflows",
          "Outflows",
          "Net Flow",
          "Inflow Count",
          "Outflow Count",
          "Total Transactions",
        ],
        time.map((t) => [
          t.label,
          t.inflow,
          t.outflow,
          t.net,
          t.inCount,
          t.outCount,
          t.count,
        ]),
      );
      cell(s, timeStart - 1, 8, "Outflow magnitude (chart)");
      time.forEach((t, i) => cell(s, timeStart + i, 8, Math.abs(t.outflow)));
    } else {
      band(
        s,
        row,
        c.mapping.Date == null
          ? "Map Date to include time summary and Net Flow Trend."
          : "No valid dates: time summary and Net Flow Trend unavailable.",
      );
      row += 2;
    }
    if (c.mapping.Amount != null) {
      let start = timeStart,
        count = time.length;
      if (!time.length) {
        start = row;
        count = 2;
        cell(s, row, 1, "Inflows");
        cell(s, row++, 2, k.inflow);
        cell(s, row, 1, "Outflows");
        cell(s, row++, 2, Math.abs(k.outflow));
        row++;
      }
      specs.push({
        sheet: s.name,
        start,
        count,
        labelCol: 1,
        valueCol: 2,
        title: `Inflows vs Outflows (absolute outflow magnitude) — ${currency}`,
        series: time.length
          ? [
              { name: "Inflows", column: 2, color: "08796E" },
              { name: "Outflows (absolute)", column: 8, color: "BD694E" },
            ]
          : [{ name: "Flow magnitude", column: 2, color: "08796E" }],
      });
      if (time.length)
        specs.push({
          sheet: s.name,
          start: timeStart,
          count: time.length,
          labelCol: 1,
          valueCol: 4,
          title: `Net Flow Trend — ${currency}`,
          type: "line",
        });
      const mix = row;
      cell(s, row, 1, "Inflows");
      cell(s, row++, 2, k.inflow);
      cell(s, row, 1, "Outflows (absolute)");
      cell(s, row++, 2, Math.abs(k.outflow));
      row += 2;
      if (k.inflow || k.outflow)
        specs.push({
          sheet: s.name,
          start: mix,
          count: 2,
          labelCol: 1,
          valueCol: 2,
          title: `Flow Mix — ${currency}`,
          type: "doughnut",
        });
    }
    if (time.length && c.mapping.Amount != null) {
      band(s, row++, "Period highlights");
      const best = (
        key: "net" | "inflow" | "outflow" | "count",
        ascending = false,
      ) =>
        [...time].sort((a, b) => (a[key] - b[key]) * (ascending ? 1 : -1))[0];
      row = table(
        s,
        row,
        ["Business question", "Period", "Value"],
        [
          ["Best Net Flow Period", best("net").label, best("net").net],
          [
            "Highest Inflow Period",
            best("inflow").label,
            best("inflow").inflow,
          ],
          [
            "Highest Outflow Period",
            best("outflow", true).label,
            best("outflow", true).outflow,
          ],
          ["Most Active Period", best("count").label, best("count").count],
        ],
      );
    }
    const insight =
      c.groups[0]?.column ??
      c.mapping.Category ??
      c.mapping.Description ??
      c.mapping.Details;
    if (insight != null && c.mapping.Amount != null) {
      const ranked = groups(records, {
        column: insight,
        level: "value",
        values: [],
        sort: "label",
        descending: false,
        chart: false,
      });
      for (const [title, key, negative] of [
        ["Top 5 Inflow Groups", "inflow", false],
        ["Top 5 Outflow Groups", "outflow", true],
        ["Top 5 Net Positive Groups", "net", false],
        ["Top 5 Net Negative Groups", "net", true],
      ] as const) {
        band(s, row++, `${title} — ${ds.headers[insight]}`);
        row = table(
          s,
          row,
          [ds.headers[insight], "Amount", "Transactions"],
          ranked
            .filter((x) => (negative ? x[key] < 0 : x[key] > 0))
            .sort((a, b) => (a[key] - b[key]) * (negative ? 1 : -1))
            .slice(0, 5)
            .map((x) => [x.label, x[key], x.count]),
        );
      }
    }
    for (const negative of [false, true]) {
      const top = records
        .filter(
          (r) => r.amount != null && (negative ? r.amount < 0 : r.amount > 0),
        )
        .sort((a, b) => (a.amount! - b.amount!) * (negative ? 1 : -1))
        .slice(0, 5);
      if (!top.length) continue;
      band(
        s,
        row++,
        negative
          ? "Largest Outflow Transactions"
          : "Largest Inflow Transactions",
      );
      const description =
        c.mapping.Description ?? c.mapping.Details ?? c.mapping.Reference;
      row = table(
        s,
        row,
        [
          "Date",
          description == null ? "Transaction" : ds.headers[description],
          "Amount",
        ],
        top.map((r) => [
          r.day ?? "N/A",
          description == null ? "Source transaction" : r.values[description],
          r.amount,
        ]),
      );
    }
    row += 3;
  }
  s.pageSetup.printArea = `A1:L${row}`;
  for (const g of c.groups) {
    const root = ("Group - " + ds.headers[g.column])
      .replace(/[\\/*?:\[\]]/g, " ")
      .slice(0, 31);
    let name = root,
      suffix = 2;
    while (w.getWorksheet(name)) name = root.slice(0, 27) + " " + suffix++;
    const gs = w.addWorksheet(name);
    base(gs);
    band(gs, 1, `Grouped by: ${ds.headers[g.column]}`);
    navigation(gs, 2, "View Charts →", "Analysis - Charts");
    band(
      gs,
      3,
      `Period: ${period} | Mode: ${g.mode || "all"} | Level: ${g.level}`,
    );
    band(
      gs,
      5,
      `Included values: ${g.values.length ? g.values.join(", ") : "All Values"}`,
    );
    let r = 7;
    for (const currency of currencies) {
      const records = ds.records.filter((x) => x.currency === currency),
        items = groups(records, g);
      const membersByLabel = new Map<string, typeof records>();
      for (const record of records) {
        const label = groups([record], { ...g, mode: "all", values: [] })[0]
          ?.label;
        if (label != null) {
          if (!membersByLabel.has(label)) membersByLabel.set(label, []);
          membersByLabel.get(label)!.push(record);
        }
      }
      const hasDate = c.mapping.Date != null;
      r = table(
        gs,
        r,
        [
          ds.headers[g.column],
          "Currency",
          "Inflows",
          "Outflows",
          "Net Flow",
          "Inflow Count",
          "Outflow Count",
          "Total Transactions",
          "Average Transaction",
          "Largest Inflow",
          "Largest Outflow",
          ...(hasDate ? ["First Transaction", "Last Transaction"] : []),
        ],
        items.map((x) => {
          const members = membersByLabel.get(x.label) || [],
            dates = members
              .filter((m) => m.day)
              .map((m) => m.day!)
              .sort(),
            valid = members.filter((m) => m.amount != null).length;
          return [
            x.label,
            currency,
            x.inflow,
            x.outflow,
            x.net,
            x.inCount,
            x.outCount,
            x.count,
            valid ? x.net / valid : null,
            x.largestIn,
            x.largestOut,
            ...(hasDate ? [dates[0] ?? null, dates.at(-1) ?? null] : []),
          ];
        }),
      );
      if (g.chart && items.length) {
        band(gs, r++, `Top 10 Groups by Net Flow — ${currency}`);
        const top = [...items].sort((a, b) => b.net - a.net).slice(0, 10),
          start = r + 1;
        r = table(
          gs,
          r,
          [ds.headers[g.column], "Net Flow"],
          top.map((x) => [x.label, x.net]),
        );
        specs.push({
          sheet: name,
          start,
          count: top.length,
          labelCol: 1,
          valueCol: 2,
          title: `${ds.headers[g.column]} | Top 10 Groups by Net Flow — ${currency}`,
          horizontal: true,
        });
      }
    }
    gs.pageSetup.printArea = `A1:M${r}`;
  }
  const charts = w.addWorksheet("Analysis - Charts");
  base(charts);
  band(charts, 1, "ExcelFlow AI | Analysis Charts");
  navigation(charts, 2, "← View Summary", s.name);
  band(charts, 3, `Period: ${period} · ${ds.records.length} transactions`);
  specs.forEach((spec, i) => {
    const r = 5 + i * 24;
    band(charts, r, spec.title);
    navigation(
      charts,
      r + 1,
      spec.sheet === s.name ? "View Summary Table →" : "View Group Table →",
      spec.sheet,
    );
  });
  if (!specs.length)
    band(
      charts,
      5,
      "No charts available for the mapped roles and matching records.",
    );
  charts.pageSetup.printArea = `A1:L${Math.max(7, 5 + specs.length * 24)}`;
  for (const spec of specs) {
    const data = w.getWorksheet(spec.sheet)!;
    spec.labels = Array.from({ length: spec.count }, (_, i) =>
      String(data.getCell(spec.start + i, spec.labelCol).value ?? ""),
    );
    spec.values = (spec.series || [{ column: spec.valueCol }]).map((series) =>
      Array.from(
        { length: spec.count },
        (_, i) =>
          Number(data.getCell(spec.start + i, series.column).value) || 0,
      ),
    );
  }
  return specs;
}
