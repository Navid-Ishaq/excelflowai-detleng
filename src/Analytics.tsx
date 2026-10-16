import { useState, useMemo, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import {
  type Dataset,
  type RecordRow,
  type AIResult,
  type Payload,
  money,
} from "./domain";
import { kpis, groups, makePayload } from "./engine";
import { verifyAI, renderText } from "./grounding";
Chart.register(...registerables);
function Plot({
  labels,
  values,
  title,
  type = "bar",
  secondary,
}: {
  labels: string[];
  values: number[];
  title: string;
  type?: "bar" | "line";
  secondary?: number[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const chart = new Chart(ref.current!, {
      type,
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            backgroundColor: "#4f46e5",
            borderColor: "#4f46e5",
            borderWidth: 2,
            tension: 0,
            ...(type === "line" ? { pointRadius: 3 } : {}),
          },
          ...(secondary
            ? [
                {
                  label: "Outflow magnitude",
                  data: secondary,
                  backgroundColor: "#0f766e",
                  borderColor: "#0f766e",
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? false
          : undefined,
        plugins: { legend: { display: !!secondary } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#e5e7eb" } },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 30, autoSkip: true, maxTicksLimit: 12 },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [
    JSON.stringify(labels),
    JSON.stringify(values),
    JSON.stringify(secondary),
    type,
  ]);
  return (
    <div className="chart-wrap">
      <canvas
        ref={ref}
        role="img"
        aria-label={`${title}. Values available in the table below.`}
      />
    </div>
  );
}
export function Analytics({
  dataset: ds,
  compact = false,
  onAI,
}: {
  dataset: Dataset;
  compact?: boolean;
  onAI: (r: AIResult, pdf: ArrayBuffer, payload: Payload) => Promise<void>;
}) {
  const [t, setT] = useState("Overview"),
    [currency, setCurrency] = useState(
      ds.records[0]?.currency || "Source units",
    ),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [column, setColumn] = useState(
      ds.config.mapping.Category ?? ds.config.selected[0],
    ),
    [chosen, setChosen] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [level, setLevel] = useState<"day" | "week" | "month" | "quarter" | "year">(
      "month",
    ),
    [metric, setMetric] = useState("net"),
    [page, setPage] = useState(0),
    [language, setLanguage] = useState(
      /fecha|importe|concepto/i.test(ds.headers.join(" "))
        ? "Spanish"
        : /betrag|datum/i.test(ds.headers.join(" "))
          ? "German"
          : "English",
    ),
    [question, setQuestion] = useState(""),
    [chat, setChat] = useState<{ q: string; r: AIResult; p: Payload }[]>([]),
    [insights, setInsights] = useState<{
      result: AIResult;
      payload: Payload;
    } | null>(null),
    [aiBusy, setAiBusy] = useState(false),
    [error, setError] = useState(""),
    [evidence, setEvidence] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [cumulative, setCumulative] = useState(false);
  const abort = useRef<AbortController | null>(null),
    alive = useRef(true),
    requestId = useRef(0);
  useEffect(
    () => () => {
      alive.current = false;
      abort.current?.abort();
    },
    [],
  );
  function invalidate() {
    requestId.current++;
    abort.current?.abort();
    setAiBusy(false);
    setInsights(null);
    setChat([]);
    setError("");
    setChosen([]);
    setPage(0);
  }
  const currencies = useMemo(
    () => [...new Set(ds.records.map((r) => r.currency))],
    [ds],
  );
  const available = useMemo(
    () =>
      [
        ...new Set(
          ds.records
            .filter((r) => r.currency === currency)
            .map((r) => String(r.values[column] ?? "").trim() || "(Blank)"),
        ),
      ].sort(),
    [ds, currency, column],
  );
  const rows = useMemo(
    () =>
      ds.records.filter(
        (r) =>
          r.currency === currency &&
          (!from || (r.day != null && r.day >= from)) &&
          (!to || (r.day != null && r.day <= to)) &&
          (!chosen.length ||
            chosen.includes(
              String(r.values[column] ?? "").trim() || "(Blank)",
            )),
      ),
    [ds, currency, from, to, column, chosen],
  );
  const k = useMemo(() => kpis(rows), [rows]);
  const groupRows = useMemo(
    () =>
      groups(rows, {
        column,
        level: "value",
        values: [],
        sort: metric === "count" ? "count" : "net",
        descending: true,
        chart: true,
      }),
    [rows, column, metric],
  );
  const time = useMemo(
    () =>
      groups(
        rows.filter((r) => r.day),
        {
          column: ds.config.mapping.Date ?? 0,
          level,
          dateOrder: ds.config.dateOrder,
          date1904: ds.config.date1904,
          values: [],
          sort: "label",
          descending: false,
          chart: true,
        },
      ),
    [rows, level],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!evidence.length || evidence.includes(r.id)) &&
          (!search ||
            r.values.some((v) =>
              String(v ?? "")
                .toLowerCase()
                .includes(search.toLowerCase()),
            )),
      ),
    [rows, search, evidence],
  );
  const visible = filtered.slice(page * 50, (page + 1) * 50);
  const payload = useMemo(() => {
    const p = makePayload(ds, rows, currency, language, column);
    p.period = `${from || "source start"} through ${to || "source end"}; ${chosen.length ? "selected group values" : "all group values"}`;
    return p;
  }, [ds, rows, currency, language, column, from, to, chosen]);
  async function requestAI(q = "") {
    if (!rows.length || ds.config.mapping.Amount == null) return;
    setError("");
    setAiBusy(true);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const id = ++requestId.current;
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const url =
        (import.meta.env.VITE_AI_URL || "/api").replace(/\/$/, "") + "/analyze";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          question: q,
          history: chat
            .slice(-4)
            .map((x) => ({ question: x.q, answer: x.r.answer })),
        }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw Error(
          response.status === 503
            ? "AI analysis unavailable. Configure the server API key, or retry later."
            : response.status === 429
              ? "Too many requests. Please wait a minute and retry."
              : "AI analysis unavailable; please retry.",
        );
      const result = verifyAI(await response.json(), payload);
      if (!alive.current || id !== requestId.current) return;
      if (q) {
        setChat([...chat, { q, r: result, p: payload }]);
        setQuestion("");
      } else {
        setInsights({ result, payload });
        const { analysisPDF } = await import("./pdf");
        const pdf = await analysisPDF(payload, result);
        if (alive.current && id === requestId.current)
          await onAI(result, pdf, payload);
      }
    } catch (e) {
      if (alive.current && id === requestId.current)
        setError(
          (e as Error).name === "AbortError"
            ? "AI request stopped or timed out. Your local reports are still available."
            : (e as Error).message,
        );
    } finally {
      clearTimeout(timer);
      if (alive.current && id === requestId.current) setAiBusy(false);
    }
  }
  const metricValue = (g: typeof k) =>
    metric === "count"
      ? g.count
      : metric === "inflow"
        ? g.inflow
        : metric === "outflow"
          ? g.outflow
          : g.net;
  const trendSeries = useMemo(() => {
    let total = 0;
    return time.map((g) => {
      const value = metricValue(g);
      total += value;
      return cumulative ? total : value;
    });
  }, [time, metric, cumulative]);
  const readEvidence = (ids: string[]) => {
    setEvidence(ids);
    setT("Transactions");
    setPage(0);
  };
  return (
    <section className="analytics">
      <div className="panel filters">
        <div>
          <span className="eyebrow">
            {compact ? "REPORT OVERVIEW" : "EXPLORE THE CURRENT DATASET"}
          </span>
          <p>
            {rows.length.toLocaleString()} records · {currency} · filters apply
            to every view
          </p>
        </div>
        <div className="filter-controls">
          <label>
            Currency
            <select
              value={currency}
              onChange={(e) => {
                invalidate();
                setCurrency(e.target.value);
              }}
            >
              {currencies.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              disabled={ds.config.mapping.Date == null}
              value={from}
              onChange={(e) => {
                invalidate();
                setFrom(e.target.value);
              }}
            />
          </label>
          <label>
            Through
            <input
              type="date"
              disabled={ds.config.mapping.Date == null}
              value={to}
              onChange={(e) => {
                invalidate();
                setTo(e.target.value);
              }}
            />
          </label>
          <button
            className="secondary"
            onClick={() => {
              invalidate();
              setFrom("");
              setTo("");
              setChosen([]);
              setSearch("");
              setEvidence([]);
            }}
          >
            Reset filters
          </button>
        </div>
      </div>
      {from && to && from > to && (
        <p className="warning">
          The start date is after the end date. Choose a valid range.
        </p>
      )}
      <div className="tabs" role="tablist" aria-label="Analytics views">
        {[
          "Overview",
          "Flow",
          "Trends",
          "Groups",
          "Transactions",
          "Explorer",
          "AI Insights",
        ].map((n) => (
          <button
            role="tab"
            tabIndex={t === n ? 0 : -1}
            onKeyDown={(e) => {
              const items = [
                "Overview",
                "Flow",
                "Trends",
                "Groups",
                "Transactions",
                "Explorer",
                "AI Insights",
              ];
              let next = items.indexOf(t);
              if (e.key === "ArrowRight") next = (next + 1) % items.length;
              else if (e.key === "ArrowLeft")
                next = (next + items.length - 1) % items.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = items.length - 1;
              else return;
              e.preventDefault();
              setT(items[next]);
              setPage(0);
              document
                .getElementById("tab-" + items[next].replaceAll(" ", ""))
                ?.focus();
            }}
            id={"tab-" + n.replaceAll(" ", "")}
            aria-controls="analytics-panel"
            aria-selected={t === n}
            key={n}
            onClick={() => {
              setT(n);
              setPage(0);
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="analytics-panel"
        aria-labelledby={"tab-" + t.replaceAll(" ", "")}
      >
        {["Overview", "Flow"].includes(t) && (
          <>
            <div className="kpi-grid">
              {[
                ["Inflows", k.inflow],
                ["Outflows", k.outflow],
                ["Net flow", k.net],
                ["Transactions", k.count],
              ].map(([name, value]) => (
                <article className="panel kpi" key={String(name)}>
                  <span>{name}</span>
                  <b className={Number(value) < 0 ? "negative" : ""}>
                    {name === "Transactions"
                      ? Number(value).toLocaleString()
                      : ds.config.mapping.Amount == null
                        ? "Not mapped"
                        : money(Number(value))}
                  </b>
                  <small>
                    {name === "Transactions" ? "matching records" : currency}
                  </small>
                </article>
              ))}
            </div>
            <div className="two">
              <article className="panel">
                <h2>Money in. Money out.</h2>
                <p>Outflows use their absolute magnitude in this comparison.</p>
                <Plot
                  labels={["Inflows", "Outflows"]}
                  values={[k.inflow, Math.abs(k.outflow)]}
                  title="Flow comparison"
                />
                <table>
                  <caption className="sr-only">Flow comparison values</caption>
                  <thead>
                    <tr>
                      <th>Measure</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Inflows</td>
                      <td>{money(k.inflow)}</td>
                    </tr>
                    <tr>
                      <td>Outflows</td>
                      <td>{money(k.outflow)}</td>
                    </tr>
                  </tbody>
                </table>
              </article>
              <article className="panel">
                <h2>The details behind the total.</h2>
                <dl className="metrics">
                  {[
                    ["Inflow transactions", k.inCount],
                    ["Outflow transactions", k.outCount],
                    ["Zero-value transactions", k.zeroCount],
                    ["Average inflow", money(k.averageIn)],
                    ["Average outflow", money(k.averageOut)],
                    ["Largest inflow", money(k.largestIn)],
                    ["Largest outflow", money(k.largestOut)],
                    [
                      "Inflow / outflow ratio",
                      k.ratio == null
                        ? "Not available"
                        : k.ratio.toFixed(2) + "×",
                    ],
                    [
                      "Net flow margin",
                      k.margin == null
                        ? "Not available"
                        : (k.margin * 100).toFixed(2) + "%",
                    ],
                  ].map(([name, value]) => (
                    <div key={String(name)}>
                      <dt>{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            </div>
            <article className="panel">
              <h2>Data quality, made visible.</h2>
              <p>
                {ds.audit.missingAmounts} missing amounts ·{" "}
                {ds.audit.invalidAmounts} invalid amounts ·{" "}
                {ds.audit.invalidDates} date issues · {ds.audit.duplicateRows}{" "}
                duplicate-looking records
              </p>
              <p className="hint">
                These are source-wide checks before period filtering.
                Duplicate-looking records are included, not removed.
                Reconciliation checks arithmetic consistency, not real-world
                completeness.
              </p>
            </article>
          </>
        )}
        {t === "Trends" && (
          <article className="panel">
            <h2>Change over time.</h2>
            {ds.config.mapping.Date == null ? (
              <p className="warning">
                Map a Date field to enable time analysis.
              </p>
            ) : (
              <>
                <div className="two">
                  <label>
                    Time level
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as typeof level)}
                    >
                      {["day", "week", "month", "quarter", "year"].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Measure
                    <select
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                    >
                      {["net", "inflow", "outflow", "count"].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={cumulative}
                    onChange={(e) => setCumulative(e.target.checked)}
                  />
                  Show cumulative chart values
                </label>
                <p className="hint">
                  Chart shows the latest 120 time buckets; the table shows the
                  latest 200. Cumulative values include all earlier matching
                  records.
                </p>
                <Plot
                  type="line"
                  labels={time.slice(-120).map((x) => x.label)}
                  values={trendSeries.slice(-120)}
                  title={`${metric} trend`}
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Inflows</th>
                        <th>Outflows</th>
                        <th>Net flow</th>
                        <th>Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {time.slice(-200).map((g) => (
                        <tr key={g.label}>
                          <td>{g.label}</td>
                          <td>{money(g.inflow)}</td>
                          <td>{money(g.outflow)}</td>
                          <td>{money(g.net)}</td>
                          <td>{g.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </article>
        )}
        {(t === "Groups" || t === "Explorer") && (
          <article className="panel">
            <h2>
              {t === "Explorer"
                ? "Follow a question. Find a pattern."
                : "See what contributes."}
            </h2>
            <div className="two">
              <label>
                Group By
                <select
                  value={column}
                  onChange={(e) => {
                    invalidate();
                    setColumn(Number(e.target.value));
                  }}
                >
                  {ds.headers.map((n, i) => (
                    <option value={i} key={i}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Measure
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  {["net", "inflow", "outflow", "count"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <details>
              <summary>
                Choose group values · {chosen.length || "all"} selected
              </summary>
              <label>
                Search group values
                <input
                  type="search"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />
              </label>
              <div className="value-list">
                {available
                  .filter((v) =>
                    v.toLowerCase().includes(groupSearch.toLowerCase()),
                  )
                  .slice(0, 500)
                  .map((v) => (
                    <label className="check-row" key={v}>
                      <input
                        type="checkbox"
                        checked={chosen.includes(v)}
                        onChange={(e) => {
                          requestId.current++;
                          abort.current?.abort();
                          setAiBusy(false);
                          setInsights(null);
                          setChosen(
                            e.target.checked
                              ? [...chosen, v]
                              : chosen.filter((x) => x !== v),
                          );
                        }}
                      />
                      {v}
                    </label>
                  ))}
              </div>
              {available.length > 500 && (
                <p className="hint">
                  First 500 values shown. All values are included until you
                  select a subset.
                </p>
              )}
            </details>
            <Plot
              labels={groupRows.slice(0, 10).map((g) => g.label)}
              values={groupRows.slice(0, 10).map(metricValue)}
              title={`Leading groups by ${metric}`}
            />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Inflows</th>
                    <th>Outflows</th>
                    <th>Net flow</th>
                    <th>Records</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.slice(0, 200).map((g) => (
                    <tr key={g.label}>
                      <td>{g.label}</td>
                      <td>{money(g.inflow)}</td>
                      <td>{money(g.outflow)}</td>
                      <td>{money(g.net)}</td>
                      <td>{g.count}</td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => readEvidence(g.ids)}
                        >
                          View rows
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              Chart shows up to ten groups; table up to two hundred. Evidence
              opens up to twenty supporting rows per group.
            </p>
          </article>
        )}
        {t === "Transactions" && (
          <article className="panel">
            <h2>Every record has context.</h2>
            <div className="two">
              <label>
                Search current records
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <p>
                {filtered.length.toLocaleString()} matching records{" "}
                {evidence.length > 0 && (
                  <button
                    className="text-button"
                    onClick={() => setEvidence([])}
                  >
                    Clear evidence selection
                  </button>
                )}
              </p>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Source row</th>
                    {ds.config.selected.map((i) => (
                      <th key={i}>{ds.headers[i]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      {ds.config.selected.map((i) => (
                        <td key={i}>{String(r.values[i] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="actions">
              <button
                className="secondary"
                disabled={!page}
                onClick={() => setPage(page - 1)}
              >
                Previous page
              </button>
              <span>
                Page {page + 1} of{" "}
                {Math.max(1, Math.ceil(filtered.length / 50))}
              </span>
              <button
                className="secondary"
                disabled={(page + 1) * 50 >= filtered.length}
                onClick={() => setPage(page + 1)}
              >
                Next page
              </button>
            </div>
          </article>
        )}
        {t === "AI Insights" && (
          <article className="panel">
            <span className="eyebrow">EVIDENCE BEFORE EXPLANATION</span>
            <h2>Ask better questions.</h2>
            <p>
              Optional AI uses checked summaries and selected evidence remotely.
              No full workbook upload. Local reports work even when AI is
              unavailable.
            </p>
            <label>
              Response language
              <select
                value={language}
                onChange={(e) => {
                  invalidate();
                  setLanguage(e.target.value);
                }}
              >
                {["English", "Spanish", "German"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <details>
              <summary>Preview exactly what will be shared</summary>
              <pre className="payload">{JSON.stringify(payload, null, 2)}</pre>
            </details>
            <p className="hint">
              By requesting insights or sending a question, you authorize
              sending this context and your question to the configured backend
              and OpenAI. Recent questions and answers in this session accompany
              follow-ups.
            </p>
            <button
              className="primary"
              disabled={
                aiBusy || !rows.length || ds.config.mapping.Amount == null
              }
              onClick={() => void requestAI()}
            >
              {aiBusy
                ? "Working with the checked context…"
                : "Generate AI insights"}
            </button>
            {aiBusy && (
              <button
                className="secondary"
                onClick={() => {
                  requestId.current++;
                  abort.current?.abort();
                  setAiBusy(false);
                }}
              >
                Cancel AI request
              </button>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {insights && (
              <div className="findings">
                {insights.result.findings.map((f, i) => (
                  <article className="audit" key={i}>
                    <span className="pill">{f.importance}</span>
                    <h3>{f.title}</h3>
                    <p>{renderText(f.explanation, insights.payload)}</p>
                    <p className="hint">{f.limitation}</p>
                    <p>Metrics: {f.metricIds.join(", ")}</p>
                    {f.evidenceIds.length > 0 && (
                      <button
                        className="text-button"
                        onClick={() => readEvidence(f.evidenceIds)}
                      >
                        Open supporting records →
                      </button>
                    )}
                  </article>
                ))}
                <p className="success">
                  Insights checked against supplied references. Updated Excel
                  and AI PDF are available on the report page.
                </p>
              </div>
            )}
            <hr />
            <h3>Ask your data</h3>
            <p className="hint">
              Questions apply to the current filtered currency and period. The
              assistant cannot access facts absent from this context.
            </p>
            {chat.map((x, i) => (
              <div className="chat" key={i}>
                <b>You</b>
                <p>{x.q}</p>
                <b>ExcelFlow AI</b>
                <p>{renderText(x.r.answer, x.p)}</p>
                <small>
                  {x.p.currency} · {x.p.period} · {x.r.metricIds.join(", ")}
                </small>
                {x.r.evidenceIds.length > 0 && (
                  <button
                    className="text-button"
                    onClick={() => readEvidence(x.r.evidenceIds)}
                  >
                    Supporting records
                  </button>
                )}
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (question.trim()) void requestAI(question.trim());
              }}
            >
              <label>
                Your question
                <textarea
                  maxLength={1500}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What contributed most to outflows?"
                />
              </label>
              <button
                className="primary"
                disabled={
                  aiBusy || !question.trim() || ds.config.mapping.Amount == null
                }
              >
                Send question
              </button>
            </form>
          </article>
        )}
      </div>
    </section>
  );
}
