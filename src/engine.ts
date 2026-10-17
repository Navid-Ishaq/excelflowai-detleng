import {
  type Source,
  type Config,
  type Value,
  type Mapping,
  type KPI,
  type RecordRow,
  type Dataset,
  type GroupConfig,
  type GroupRow,
  type Payload,
  label,
} from "./domain";
export const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function numeric(
  v: Value | undefined,
  style: Config["numberStyle"] = "point",
): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  let s = v
    .trim()
    .replace(/[\s\u00a0]/g, "")
    .replace(/\u2212/g, "-");
  const neg = /^\(.*\)$/.test(s);
  if (neg) s = s.slice(1, -1);
  const pattern =
    style === "point"
      ? /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/
      : /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/;
  if (!pattern.test(s)) return null;
  s =
    style === "point"
      ? s.replaceAll(",", "")
      : s.replaceAll(".", "").replace(",", ".");
  const n = Number(s) * (neg ? -1 : 1);
  return Number.isFinite(n) ? n : null;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function day(
  v: Value | undefined,
  order: Config["dateOrder"] = "DMY",
  date1904 = false,
): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    if (v < 1 || v > 2958465) return null;
    const serial = Math.floor(v);
    return iso(
      new Date(
        Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 31) +
          (serial - (date1904 ? 0 : serial >= 60 ? 1 : 0)) * 86400000,
      ),
    );
  }
  if (typeof v !== "string") return null;
  let y: number, m: number, d: number;
  const s = v.trim();
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (match) [, y, m, d] = match.map(Number);
  else {
    match = s.match(/^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})$/);
    if (!match) return null;
    const n = match.slice(1).map(Number);
    [y, m, d] =
      order === "YMD"
        ? n
        : order === "MDY"
          ? [n[2], n[0], n[1]]
          : [n[2], n[1], n[0]];
  }
  if (y! < 1900 || y! > 9999) return null;
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.getUTCFullYear() === y! &&
    dt.getUTCMonth() === m! - 1 &&
    dt.getUTCDate() === d!
    ? iso(dt)
    : null;
}
export function periodRange(
  c: Pick<Config, "period" | "start" | "end">,
  now = new Date(),
): [string, string] | null {
  const y = now.getFullYear(),
    m = now.getMonth();
  const range = (a: Date, b: Date): [string, string] => [iso(a), iso(b)];
  switch (c.period) {
    case "all":
      return null;
    case "custom":
      if (!day(c.start, "YMD") || !day(c.end, "YMD") || c.start > c.end)
        throw Error("Choose a valid inclusive date range.");
      return [c.start, c.end];
    case "month":
      return range(
        new Date(Date.UTC(y, m, 1)),
        new Date(Date.UTC(y, m + 1, 0)),
      );
    case "previous-month":
      return range(
        new Date(Date.UTC(y, m - 1, 1)),
        new Date(Date.UTC(y, m, 0)),
      );
    case "quarter":
      return range(
        new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1)),
        new Date(Date.UTC(y, Math.floor(m / 3) * 3 + 3, 0)),
      );
    case "previous-quarter":
      return range(
        new Date(Date.UTC(y, Math.floor(m / 3) * 3 - 3, 1)),
        new Date(Date.UTC(y, Math.floor(m / 3) * 3, 0)),
      );
    case "year":
      return [`${y}-01-01`, `${y}-12-31`];
    default:
      throw Error("Unknown report period.");
  }
}
export function sum(values: number[]) {
  let total = 0,
    correction = 0;
  for (const x of values) {
    const adjusted = x - correction,
      next = total + adjusted;
    correction = next - total - adjusted;
    total = next;
  }
  return Math.round((total + Number.EPSILON) * 1e8) / 1e8;
}
export function kpis(rows: RecordRow[]): KPI {
  const ins = rows
      .filter((r) => r.amount != null && r.amount > 0)
      .map((r) => r.amount!),
    outs = rows
      .filter((r) => r.amount != null && r.amount < 0)
      .map((r) => r.amount!);
  const inflow = sum(ins),
    outflow = sum(outs),
    net = sum([inflow, outflow]);
  return {
    inflow,
    outflow,
    net,
    count: rows.length,
    inCount: ins.length,
    outCount: outs.length,
    zeroCount: rows.filter((r) => r.amount === 0).length,
    averageIn: ins.length ? inflow / ins.length : null,
    averageOut: outs.length ? outflow / outs.length : null,
    largestIn: ins.length
      ? ins.reduce((a, b) => Math.max(a, b), -Infinity)
      : null,
    largestOut: outs.length
      ? outs.reduce((a, b) => Math.min(a, b), Infinity)
      : null,
    ratio: outflow ? inflow / Math.abs(outflow) : null,
    margin: inflow ? net / inflow : null,
  };
}
export function bucket(date: string, level: string) {
  if (level === "year") return date.slice(0, 4);
  if (level === "quarter")
    return `${date.slice(0, 4)} Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`;
  if (level === "month") return date.slice(0, 7);
  if (level === "week") {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return iso(d);
  }
  return date;
}
export function groups(rows: RecordRow[], g: GroupConfig): GroupRow[] {
  const map = new Map<string, RecordRow[]>();
  for (const row of rows) {
    const raw = row.values[g.column];
    const key =
      g.level === "value"
        ? String(raw ?? "").trim() || "(Blank)"
        : day(raw, g.dateOrder || "DMY", g.date1904)
          ? bucket(day(raw, g.dateOrder || "DMY", g.date1904)!, g.level)
          : "(Invalid date)";
    if (
      ((g.mode && g.mode !== "all") || (!g.mode && g.values.length)) &&
      !g.values.includes(key)
    )
      continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return [...map]
    .map(([label, r]) => ({
      ...kpis(r),
      label,
      ids: r.slice(0, 20).map((x) => x.id),
    }))
    .sort(
      (a, b) =>
        (g.sort === "label"
          ? a.label.localeCompare(b.label, undefined, { numeric: true })
          : a[g.sort] - b[g.sort]) * (g.descending ? -1 : 1),
    );
}
const alias: Record<string, string[]> = {
  Date: [
    "date",
    "transactiondate",
    "txndate",
    "fecha",
    "fechavalor",
    "fvalor",
    "datum",
    "orderdate",
    "paymentdate",
    "settlementdate",
    "valuedate",
    "buchungsdatum",
    "dateoperation",
    "تاریخ",
  ],
  Amount: [
    "amount",
    "importe",
    "monto",
    "betrag",
    "montant",
    "netamount",
    "transactionamount",
    "txnamount",
    "value",
    "valor",
    "رقم",
  ],
  Description: [
    "description",
    "descripcion",
    "concepto",
    "concept",
    "beschreibung",
    "transactiondescription",
    "libelle",
    "تفصیل",
  ],
  Details: [
    "details",
    "detail",
    "transactiondetails",
    "detalle",
    "detalles",
    "movimiento",
    "movement",
  ],
  Category: ["category", "categories", "categoria", "categorie", "kategorie"],
  Notes: [
    "notes",
    "note",
    "notas",
    "observations",
    "observaciones",
    "remarks",
    "comment",
    "comments",
    "remarques",
    "anmerkungen",
  ],
  Reference: [
    "reference",
    "ref",
    "referencia",
    "referenz",
    "transactionref",
    "transactionreference",
    "txnref",
    "invoicereference",
  ],
  Currency: [
    "currency",
    "currencycode",
    "divisa",
    "moneda",
    "ccy",
    "devise",
    "wahrung",
  ],
  Balance: [
    "balance",
    "saldo",
    "bankbalance",
    "accountbalance",
    "solde",
    "kontostand",
  ],
};
export function suggest(
  source: Source,
  c: Config,
): { mapping: Mapping; ambiguous: string[] } {
  const mapping: Mapping = {},
    ambiguous: string[] = [],
    used = new Set<number>();
  for (const [role, id] of Object.entries(source.mapping || {})) {
    if (c.selected.includes(id) && !used.has(id)) {
      mapping[role as keyof Mapping] = id;
      used.add(id);
    }
  }
  const width = source.rows[source.header]?.length || 0;
  const candidates: Record<string, number[]> = {};
  for (let i = 0; i < width; i++) {
    if (!c.selected.includes(i) || used.has(i)) continue;
    const heading = normalize(label(source.rows[source.header][i], i));
    const vals = source.rows
      .slice(source.header + 1, source.header + 257)
      .map((r) => r[i])
      .filter((v) => v != null && v !== "")
      .slice(0, 128);
    const knownHeading = Object.values(alias).some((names) =>
      names.includes(heading),
    );
    if (!knownHeading && vals.length >= 3) {
      if (
        vals.every(
          (v) =>
            typeof v === "string" &&
            /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) &&
            day(v, c.dateOrder) != null,
        )
      )
        (candidates.Date ??= []).push(i);
      else if (
        vals.every(
          (v) =>
            typeof v === "string" &&
            /^[A-Z]{3}$/i.test(v) &&
            knownCurrency(v.toUpperCase()) &&
            knownCurrency(v.toUpperCase()),
        )
      )
        (candidates.Currency ??= []).push(i);
    }
    for (const [role, names] of Object.entries(alias)) {
      if (!names.includes(heading)) continue;
      const good = vals.length
        ? vals.filter((v) =>
            role === "Date"
              ? day(v, c.dateOrder, source.date1904) != null
              : role === "Amount" || role === "Balance"
                ? numeric(v, c.numberStyle) != null
                : role === "Currency"
                  ? typeof v === "string" &&
                    /^[A-Z]{3}$/i.test(v) &&
                    knownCurrency(v.toUpperCase())
                  : role === "Reference"
                    ? typeof v === "string" || typeof v === "number"
                    : typeof v === "string",
          ).length /
            vals.length >=
          0.9
        : !["Date", "Amount", "Balance", "Currency"].includes(role);
      if (
        good &&
        (role !== "Reference" ||
          new Set(vals.map(String)).size / Math.max(1, vals.length) >= 0.6)
      )
        (candidates[role] ??= []).push(i);
    }
  }
  for (const [role, ids] of Object.entries(candidates)) {
    if (mapping[role as keyof Mapping] != null) continue;
    const risky =
      role === "Amount" &&
      source.rows[source.header].some(
        (v, i) =>
          c.selected.includes(i) &&
          ["debit", "credit", "balance"].includes(normalize(String(v))) &&
          source.rows
            .slice(source.header + 1, source.header + 20)
            .some((r) => numeric(r[i], c.numberStyle) != null),
      );
    if (ids.length === 1 && !risky) mapping[role as keyof Mapping] = ids[0];
    else ambiguous.push(role);
  }
  return { mapping, ambiguous };
}
export function sourceColumns(source: Source) {
  const width = source.rows[source.header]?.length || 0,
    found = new Set<number>();
  for (let r = source.header; r < source.rows.length && found.size < width; r++)
    for (let i = 0; i < width; i++)
      if (
        !found.has(i) &&
        source.rows[r][i] != null &&
        source.rows[r][i] !== ""
      )
        found.add(i);
  return [...found].sort((a, b) => a - b);
}
export function inferHeader(rows: Value[][]) {
  let winner = 0,
    highest = -Infinity;
  // Workbook heading bands repeat merged text; genuine headers have distinct labels.
  rows.slice(0, 50).forEach((row, index) => {
    const filled = row.filter((v) => v != null && v !== "");
    const text = filled.filter((v) => typeof v === "string");
    if (text.length < 2) return;
    const unique = new Set(text.map((v) => String(v).trim())).size;
    const repeated = text.length - unique;
    const following = (rows[index + 1] || []).filter(
      (v) => v != null && v !== "",
    ).length;
    const score =
      text.length * 2 + filled.length + following / 10 - repeated * 4;
    if (score > highest) {
      highest = score;
      winner = index;
    }
  });
  return winner;
}
export function prepare(source: Source, c: Config): Dataset {
  if (!c.selected.length) throw Error("Choose at least one column.");
  if (!c.reports.length) throw Error("Choose at least one report.");
  const ids = Object.values(c.mapping);
  if (new Set(ids).size !== ids.length)
    throw Error("Each column can have only one role.");
  if (
    c.reports.some((s) => ["Inflows", "Outflows"].includes(s)) &&
    c.mapping.Amount == null
  )
    throw Error("Choose an Amount column for financial reports.");
  const range = periodRange(c);
  if (range && c.mapping.Date == null)
    throw Error("Map a Date column before filtering by period.");
  let invalidAmounts = 0,
    missingAmounts = 0,
    invalidDates = 0,
    duplicateRows = 0;
  const seen = new Set<string>();
  const records: RecordRow[] = [];
  for (let i = source.header + 1; i < source.rows.length; i++) {
    const values = source.rows[i];
    if (!values.some((v) => v !== null && v !== "")) continue;
    const signature = JSON.stringify(values);
    if (seen.has(signature)) duplicateRows++;
    seen.add(signature);
    const amount =
      c.mapping.Amount == null
        ? null
        : numeric(values[c.mapping.Amount], c.numberStyle);
    const date =
      c.mapping.Date == null
        ? null
        : day(values[c.mapping.Date], c.dateOrder, source.date1904);
    if (c.mapping.Amount != null && amount == null) {
      if (values[c.mapping.Amount] == null || values[c.mapping.Amount] === "")
        missingAmounts++;
      else invalidAmounts++;
    }
    if (c.mapping.Date != null && !date) invalidDates++;
    if (range && (!date || date < range[0] || date > range[1])) continue;
    const currency =
      c.mapping.Currency == null
        ? "Source units"
        : String(values[c.mapping.Currency] ?? "")
            .trim()
            .toUpperCase() || "Unspecified";
    records.push({
      id: `row-${i + 1}`,
      row: i + 1,
      values,
      amount,
      day: date,
      currency,
    });
  }
  if (!records.length)
    throw Error("No records match this period. Adjust your selection.");
  if (
    c.reports.some((s) => ["Inflows", "Outflows"].includes(s)) &&
    records.every((r) => r.amount == null)
  )
    throw Error(
      "The chosen Amount column has no valid numbers. Check its role and text number format.",
    );
  if (c.reports.includes("Analysis"))
    for (const g of c.groups) {
      if (g.mode === "one" && g.values.length !== 1)
        throw Error("Choose exactly one value for One value mode.");
      if (g.mode === "selected" && !g.values.length)
        throw Error("Choose at least one value for Selected values mode.");
    }
  if (c.sort != null)
    records.sort((a, b) => {
      const index = c.sort!;
      const x =
        index === c.mapping.Date
          ? a.day
          : index === c.mapping.Amount
            ? a.amount
            : a.values[index];
      const y =
        index === c.mapping.Date
          ? b.day
          : index === c.mapping.Amount
            ? b.amount
            : b.values[index];
      if (x == null) return y == null ? 0 : 1;
      if (y == null) return -1;
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), undefined, { numeric: true })) *
        (c.descending ? -1 : 1)
      );
    });
  const unknownCurrencies = [
    ...new Set(
      records
        .map((r) => r.currency)
        .filter(
          (v) =>
            v !== "Source units" &&
            (!/^[A-Z]{3}$/.test(v) || !knownCurrency(v)),
        ),
    ),
  ];
  const reconciled = [...new Set(records.map((r) => r.currency))].every(
    (cur) => {
      const r = records.filter((x) => x.currency === cur);
      return (
        Math.abs(sum(r.map((x) => x.amount ?? 0)) - kpis(r).net) < 0.000001
      );
    },
  );
  return {
    id: crypto.randomUUID(),
    name: source.name,
    headers: source.rows[source.header].map(label),
    config: structuredClone({
      ...c,
      date1904: source.date1904,
      groups: c.groups.map((g) => ({
        ...g,
        dateOrder: c.dateOrder,
        date1904: source.date1904,
      })),
    }),
    records,
    sourceCount: seen.size + duplicateRows,
    created: new Date().toISOString(),
    audit: {
      invalidAmounts,
      missingAmounts,
      invalidDates,
      duplicateRows,
      unknownCurrencies,
      reconciled,
    },
  };
}
function knownCurrency(code: string) {
  try {
    return Intl.supportedValuesOf("currency").includes(code);
  } catch {
    return true;
  }
}
export function makePayload(
  ds: Dataset,
  rows: RecordRow[],
  currency: string,
  language: string,
  groupColumn: number,
): Payload {
  const r = rows.filter((x) => x.currency === currency);
  const k = kpis(r);
  const metrics = Object.entries(k)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([key, value]) => ({
      id: `kpi.${key}`,
      label: key,
      value: value as number,
      currency,
      rowIds: r
        .filter((x) =>
          key === "largestIn"
            ? x.amount === k.largestIn
            : key === "largestOut"
              ? x.amount === k.largestOut
              : /inflow|inCount|averageIn/.test(key)
                ? x.amount != null && x.amount > 0
                : /outflow|outCount|averageOut/.test(key)
                  ? x.amount != null && x.amount < 0
                  : key === "zeroCount"
                    ? x.amount === 0
                    : true,
        )
        .slice(0, 8)
        .map((x) => x.id),
    }));
  const gs = groups(r, {
    column: groupColumn,
    level: "value",
    values: [],
    sort: "net",
    descending: true,
    chart: true,
  });
  const trends = groups(
    r.filter((x) => x.day),
    {
      column: ds.config.mapping.Date ?? 0,
      level: "month",
      dateOrder: ds.config.dateOrder,
      date1904: ds.config.date1904,
      values: [],
      sort: "label",
      descending: false,
      chart: true,
    },
  );
  for (const [i, g] of gs.slice(0, 30).entries()) {
    metrics.push({
      id: `group.${i}.net`,
      label: `Net flow: ${g.label}`,
      value: g.net,
      currency,
      rowIds: g.ids.slice(0, 8),
    });
    metrics.push({
      id: `group.${i}.count`,
      label: `Records: ${g.label}`,
      value: g.count,
      currency,
      rowIds: g.ids.slice(0, 8),
    });
  }
  for (const [i, t] of trends.slice(-60).entries())
    metrics.push({
      id: `trend.${i}.net`,
      label: `Net flow: ${t.label}`,
      value: t.net,
      currency,
      rowIds: t.ids.slice(0, 8),
    });
  if (trends.length >= 2) {
    const a = trends.at(-1)!,
      b = trends.at(-2)!;
    metrics.push({
      id: "comparison.netChange",
      label: `Net flow change from ${b.label} to ${a.label}`,
      value: sum([a.net, -b.net]),
      currency,
      rowIds: [],
    });
  }
  if (
    Math.abs(sum(gs.map((g) => g.net)) - k.net) > 1e-6 ||
    gs.reduce((n, g) => n + g.count, 0) !== r.length
  )
    throw Error("Grouped results did not reconcile.");
  const candidates = [...r]
    .filter((x) => x.amount != null)
    .sort((a, b) => Math.abs(b.amount!) - Math.abs(a.amount!))
    .slice(0, 3);
  for (const [index, row] of candidates.entries())
    metrics.push({
      id: `review.${index}.amount`,
      label: "Large magnitude transaction for review (not a confirmed anomaly)",
      value: row.amount!,
      currency,
      rowIds: [row.id],
    });
  const evidenceRows = [
    ...new Map(
      [...candidates, ...r.slice(0, 27)].map((row) => [row.id, row]),
    ).values(),
  ];
  return {
    mapping: Object.fromEntries(
      Object.entries(ds.config.mapping).map(([role, index]) => [
        role,
        ds.headers[index],
      ]),
    ),
    locale: {
      numberStyle: ds.config.numberStyle,
      dateOrder: ds.config.dateOrder,
    },
    sessionId: ds.id,
    filename: ds.name,
    period:
      ds.config.period === "custom"
        ? `${ds.config.start} to ${ds.config.end}`
        : ds.config.period,
    language,
    currency,
    metrics,
    groups: gs.slice(0, 30).map((g) => ({
      label: g.label,
      net: g.net,
      count: g.count,
      rowIds: g.ids,
    })),
    trends: trends.slice(-60).map((t) => ({ label: t.label, net: t.net })),
    quality: ds.audit,
    evidence: evidenceRows.map((x) => ({
      id: x.id,
      day: x.day,
      amount: x.amount,
      currency: x.currency,
    })),
  };
}

export function detectFormats(
  source: Source,
): Pick<Config, "numberStyle" | "dateOrder"> {
  const values = source.rows
    .slice(source.header + 1, source.header + 129)
    .flat()
    .filter((v) => typeof v === "string") as string[];
  const comma = values.filter((v) => /^[+-]?\d+,\d{1,2}$/.test(v)).length,
    point = values.filter((v) => /^[+-]?\d+\.\d{1,2}$/.test(v)).length;
  let dmy = 0,
    mdy = 0;
  for (const v of values) {
    const m = v.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-]\d{4}$/);
    if (m) {
      if (Number(m[1]) > 12) dmy++;
      if (Number(m[2]) > 12) mdy++;
    }
  }
  return {
    numberStyle:
      source.numberStyle || (comma >= 2 && !point ? "comma" : "point"),
    dateOrder: source.dateOrder || (!dmy && mdy ? "MDY" : "DMY"),
  };
}
