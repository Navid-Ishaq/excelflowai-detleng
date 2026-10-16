import { z } from "zod";
import { type Payload, type AIResult, money } from "./domain";
const text = z.string().max(2500);
export const responseSchema = z.object({
  sessionId: z.string(),
  findings: z
    .array(
      z.object({
        title: z.string().max(150),
        explanation: text,
        metricIds: z.array(z.string()).max(20),
        evidenceIds: z.array(z.string()).max(30),
        importance: z.enum(["high", "medium", "low"]),
        limitation: text,
      }),
    )
    .max(8),
  answer: text,
  metricIds: z.array(z.string()).max(20),
  evidenceIds: z.array(z.string()).max(30),
  language: z.enum(["English", "Spanish", "German"]),
});
const metric = z.object({
  id: z.string().max(100),
  label: z.string().max(200),
  value: z.union([z.number().finite(), z.string().max(200)]),
  currency: z.string().max(30),
  rowIds: z.array(z.string().max(50)).max(30),
});
export const payloadSchema = z.object({
  mapping: z.record(z.string().max(50), z.string().max(200)),
  locale: z.object({
    numberStyle: z.enum(["point", "comma"]),
    dateOrder: z.enum(["DMY", "MDY", "YMD"]),
  }),
  sessionId: z.string().uuid(),
  filename: z.string().max(200),
  period: z.string().max(250),
  language: z.enum(["English", "Spanish", "German"]),
  currency: z.string().max(30),
  metrics: z.array(metric).max(250),
  groups: z
    .array(
      z.object({
        label: z.string().max(250),
        net: z.number().finite(),
        count: z.number().int().nonnegative(),
        rowIds: z.array(z.string().max(50)).max(30),
      }),
    )
    .max(30),
  trends: z
    .array(z.object({ label: z.string().max(50), net: z.number().finite() }))
    .max(60),
  quality: z.object({
    invalidAmounts: z.number().nonnegative(),
    missingAmounts: z.number().nonnegative(),
    invalidDates: z.number().nonnegative(),
    duplicateRows: z.number().nonnegative(),
    unknownCurrencies: z.array(z.string().max(30)).max(256),
    reconciled: z.boolean(),
  }),
  evidence: z
    .array(
      z.object({
        id: z.string().max(50),
        day: z.string().nullable(),
        amount: z.number().finite().nullable(),
        currency: z.string().max(30),
      }),
    )
    .max(30),
});
export function verifyPayload(input: unknown): Payload {
  const p = payloadSchema.parse(input);
  if (!p.quality.reconciled)
    throw Error("Resolve reconciliation before AI analysis.");
  const ids = p.metrics.map((m) => m.id);
  if (new Set(ids).size !== ids.length)
    throw Error("Metric references must be unique.");
  const get = (id: string) => p.metrics.find((m) => m.id === id)?.value;
  for (const name of [
    "inflow",
    "outflow",
    "net",
    "count",
    "inCount",
    "outCount",
    "zeroCount",
  ])
    if (typeof get("kpi." + name) !== "number")
      throw Error("Required checked metrics are missing.");
  if (
    Math.abs(
      Number(get("kpi.inflow")) +
        Number(get("kpi.outflow")) -
        Number(get("kpi.net")),
    ) > 1e-6
  )
    throw Error("Totals do not reconcile.");
  if (Number(get("kpi.inflow")) < 0 || Number(get("kpi.outflow")) > 0)
    throw Error("Flow signs do not reconcile.");
  if (
    p.evidence.some((r) => r.currency !== p.currency) ||
    p.metrics.some((m) => m.currency !== p.currency)
  )
    throw Error("Currencies must stay separate.");
  return p;
}
export function verifyAI(input: unknown, p: Payload): AIResult {
  const r = responseSchema.parse(input);
  if (r.sessionId !== p.sessionId)
    throw Error("Response belongs to an expired session.");
  if (r.language !== p.language)
    throw Error("Response language does not match.");
  const metrics = new Set(p.metrics.map((m) => m.id)),
    rows = new Set(p.evidence.map((e) => e.id));
  for (const g of p.groups) for (const id of g.rowIds) rows.add(id);
  const blocks = [
    ...r.findings,
    {
      title: "",
      explanation: r.answer,
      metricIds: r.metricIds,
      evidenceIds: r.evidenceIds,
      limitation: "",
    },
  ];
  for (const b of blocks) {
    if (
      b.metricIds.some((id) => !metrics.has(id)) ||
      b.evidenceIds.some((id) => !rows.has(id))
    )
      throw Error("AI cited a reference outside the checked context.");
    const combined = [b.title, b.explanation, b.limitation].join(" ");
    const tokens = [...combined.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]);
    if (tokens.some((id) => !metrics.has(id) || !b.metricIds.includes(id)))
      throw Error("AI used an unsupported metric.");
    const prose = combined.replace(/\{\{[^}]+\}\}/g, "");
    if (/\d/.test(prose))
      throw Error("AI supplied an unverified number. Please retry.");
    if (/\{\{|\}\}/.test(prose))
      throw Error("AI response has an invalid metric placeholder.");
  }
  return r;
}
export function renderText(s: string, p: Payload) {
  return s.replace(/\{\{([^}]+)\}\}/g, (_, id: string) => {
    const m = p.metrics.find((x) => x.id === id);
    if (!m) return "Unavailable";
    return typeof m.value === "number" ? money(m.value) : m.value;
  });
}
