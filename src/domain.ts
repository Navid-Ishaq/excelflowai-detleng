export const roles = [
  "Date",
  "Amount",
  "Description",
  "Details",
  "Notes",
  "Category",
  "Currency",
  "Balance",
  "Reference",
] as const;
export type Role = (typeof roles)[number];
export type Value = string | number | boolean | null;
export type Source = {
  name: string;
  rows: Value[][];
  header: number;
  sheet: string;
  sheets: string[];
  date1904?: boolean;
  numberStyle?: "point" | "comma";
  dateOrder?: "DMY" | "MDY" | "YMD";
  mapping?: Mapping;
  recognized?: boolean;
  warning?: string;
};
export type Mapping = Partial<Record<Role, number>>;
export type GroupConfig = {
  dateOrder?: "DMY" | "MDY" | "YMD";
  date1904?: boolean;
  column: number;
  level: "value" | "day" | "week" | "month" | "quarter" | "year";
  values: string[];
  mode?: "all" | "one" | "selected";
  sort: "label" | "net" | "count" | "inflow" | "outflow";
  descending: boolean;
  chart: boolean;
};
export type Config = {
  date1904?: boolean;
  selected: number[];
  mapping: Mapping;
  numberStyle: "point" | "comma";
  dateOrder: "DMY" | "MDY" | "YMD";
  reports: string[];
  timeGrouping?: "auto" | "day" | "week" | "month" | "quarter" | "year";
  period: string;
  start: string;
  end: string;
  sort: number | null;
  descending: boolean;
  groups: GroupConfig[];
};
export type RecordRow = {
  id: string;
  row: number;
  values: Value[];
  amount: number | null;
  day: string | null;
  currency: string;
};
export type KPI = {
  inflow: number;
  outflow: number;
  net: number;
  count: number;
  inCount: number;
  outCount: number;
  zeroCount: number;
  averageIn: number | null;
  averageOut: number | null;
  largestIn: number | null;
  largestOut: number | null;
  ratio: number | null;
  margin: number | null;
};
export type GroupRow = KPI & { label: string; ids: string[] };
export type Audit = {
  invalidAmounts: number;
  missingAmounts: number;
  invalidDates: number;
  duplicateRows: number;
  unknownCurrencies: string[];
  reconciled: boolean;
};
export type Dataset = {
  id: string;
  name: string;
  headers: string[];
  config: Config;
  records: RecordRow[];
  sourceCount: number;
  audit: Audit;
  created: string;
};
export type Metric = {
  id: string;
  label: string;
  value: number | string;
  currency: string;
  rowIds: string[];
};
export type Payload = {
  mapping: Record<string, string>;
  locale: { numberStyle: "point" | "comma"; dateOrder: "DMY" | "MDY" | "YMD" };
  sessionId: string;
  filename: string;
  period: string;
  language: string;
  currency: string;
  metrics: Metric[];
  groups: { label: string; net: number; count: number; rowIds: string[] }[];
  trends: { label: string; net: number }[];
  quality: Audit;
  evidence: {
    id: string;
    day: string | null;
    amount: number | null;
    currency: string;
  }[];
};
export type Finding = {
  title: string;
  explanation: string;
  metricIds: string[];
  evidenceIds: string[];
  importance: "high" | "medium" | "low";
  limitation: string;
};
export type AIResult = {
  sessionId: string;
  findings: Finding[];
  answer: string;
  metricIds: string[];
  evidenceIds: string[];
  language: string;
};
export const initialConfig = (): Config => ({
  selected: [],
  mapping: {},
  numberStyle: "point",
  dateOrder: "DMY",
  reports: ["Report Data", "Inflows", "Outflows"],
  period: "all",
  start: "",
  end: "",
  sort: null,
  descending: false,
  groups: [],
});
export const label = (v: Value | undefined, i: number) =>
  String(v ?? "").trim() || `Column ${i + 1}`;
export const money = (n: number | null) =>
  n == null
    ? "Not available"
    : new Intl.NumberFormat("en", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
