import { useState, useMemo } from "react";
import {
  type Source,
  type Dataset,
  type Config,
  type GroupConfig,
  type Role,
  roles,
  label,
  money,
} from "./domain";
import { GroupValues } from "./GroupValues";
import { suggest, prepare, kpis, sourceColumns } from "./engine";
type Props = {
  source: Source | null;
  config: Config;
  setConfig: (c: Config) => void;
  setSource: (s: Source) => void;
  step: number;
  setStep: (n: number) => void;
  changeSheet: (s: string, d?: string) => Promise<void>;
  upload: () => void;
  dropFile: (file: File) => void;
  generate: () => void;
  reset: () => void;
};
export function Wizard({
  source: s,
  config: c,
  setConfig,
  setSource,
  step,
  setStep,
  changeSheet,
  upload,
  dropFile,
  generate,
  reset,
}: Props) {
  const [error, setError] = useState(""),
    [manual, setManual] = useState<number[]>([]);
  const set = (v: Partial<Config>) => setConfig({ ...c, ...v });
  const available = useMemo(() => (s ? sourceColumns(s) : []), [s]);
  const names = s?.rows[s.header]?.map(label) || [];
  const suggestions = s ? suggest(s, c) : null;
  let preview: Dataset | string | undefined;
  try {
    if (s && step === 5) preview = prepare(s, c);
  } catch (e) {
    if (step === 5) preview = (e as Error).message;
  }
  function next() {
    setError("");
    if (!s) return;
    if (step === 2 && !c.selected.length) {
      setError("Choose at least one column.");
      return;
    }
    if (step === 2) {
      const proposed = suggest(s, c).mapping;
      const mapping = { ...c.mapping };
      for (const role of roles)
        if (
          mapping[role] == null &&
          proposed[role] != null &&
          !manual.includes(proposed[role]!)
        )
          mapping[role] = proposed[role];
      set({ mapping });
    }
    if (step === 3) {
      const values = Object.values(c.mapping);
      if (new Set(values).size !== values.length) {
        setError("Each role must use a different column.");
        return;
      }
    }
    if (step === 4 && !c.reports.length) {
      setError("Choose at least one report.");
      return;
    }
    setStep(Math.min(5, step + 1));
  }
  function setRole(i: number, v: string) {
    const mapping = { ...c.mapping };
    for (const role of roles) if (mapping[role] === i) delete mapping[role];
    if (v) {
      const existing = mapping[v as Role];
      if (existing != null && existing !== i) {
        setError(`${v} is already assigned. Clear its previous column first.`);
        return;
      }
      mapping[v as Role] = i;
    }
    setManual([...manual, i]);
    set({ mapping });
    setError("");
  }
  function group(index: number, value: Partial<GroupConfig>) {
    set({
      groups: c.groups.map((g, i) => (i === index ? { ...g, ...value } : g)),
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CREATE YOUR REPORT</span>
          <h1>Make the data work for you.</h1>
          <p>Choose what matters. Keep every decision visible.</p>
        </div>
        <button className="secondary" onClick={reset}>
          Start New Report
        </button>
      </div>
      <ol className="stepper">
        {["Upload", "Source", "Columns", "Roles", "Reports", "Generate"].map(
          (n, i) => (
            <li
              aria-current={step === i ? "step" : undefined}
              className={step === i ? "active" : step > i ? "done" : ""}
              key={n}
            >
              {step > i ? "✓" : i + 1} {n}
            </li>
          ),
        )}
      </ol>
      <section className="panel wizard">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!s ? (
          <>
            <h2>Bring your source file.</h2>
            <p>Choose an XLSX or UTF-8 CSV file. Maximum 20 MB.</p>
            <div
              className="upload-dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) dropFile(file);
              }}
            >
              <strong>Drop your Excel or CSV file here</strong>
              <p>Your file is processed locally in your browser.</p>
              <button className="primary" onClick={upload}>
                Choose file
              </button>
            </div>
          </>
        ) : (
          <>
            {step === 1 && (
              <>
                <h2>Where are the records?</h2>
                <p>
                  {s.name} · {s.sheets.length} sheet(s)
                </p>
                {s.warning && <p className="warning">{s.warning}</p>}
                {s.recognized && (
                  <p className="success">
                    ExcelFlow AI workbook recognized. Review the saved mappings
                    in the next steps.
                  </p>
                )}
                <div className="two">
                  <label>
                    Source worksheet
                    <select
                      value={s.sheet}
                      onChange={(e) => void changeSheet(e.target.value)}
                    >
                      {s.sheets.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Header row
                    <input
                      type="number"
                      min={1}
                      max={s.rows.length}
                      value={s.header + 1}
                      onChange={(e) => {
                        const h = Math.max(
                          0,
                          Math.min(
                            s.rows.length - 1,
                            Number(e.target.value) - 1,
                          ),
                        );
                        const source = {
                          ...s,
                          header: h,
                          mapping: undefined,
                          recognized: false,
                        };
                        setSource(source);
                        const selected = sourceColumns(source);
                        setConfig({
                          ...c,
                          selected,
                          mapping: suggest(source, { ...c, selected }).mapping,
                          groups: [],
                        });
                        setManual([]);
                      }}
                    />
                  </label>
                </div>
                {/\.csv$/i.test(s.name) && (
                  <label>
                    CSV delimiter
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        void changeSheet(s.sheet, e.target.value)
                      }
                    >
                      <option value="">Detect automatically</option>
                      <option value=",">Comma</option>
                      <option value=";">Semicolon</option>
                      <option value={"\t"}>Tab</option>
                      <option value="|">Pipe</option>
                    </select>
                  </label>
                )}
                <p className="hint">
                  We suggest a likely header. Check the preview before
                  continuing. Footer totals in your source should not be treated
                  as transactions.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {available.map((i) => (
                          <th key={i}>{names[i]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.rows.slice(s.header + 1, s.header + 21).map((r, i) => (
                        <tr key={i}>
                          {available.map((j) => (
                            <td key={j}>{String(r[j] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2>Choose your report columns.</h2>
                <p>
                  Other source columns remain available for grouping in this
                  session.
                </p>
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() => set({ selected: available })}
                  >
                    Select all
                  </button>
                  <button
                    className="secondary"
                    onClick={() => set({ selected: [], mapping: {} })}
                  >
                    Clear all
                  </button>
                </div>
                <div className="column-list">
                  {available.map((i) => (
                    <label className="check-row" key={i}>
                      <input
                        type="checkbox"
                        checked={c.selected.includes(i)}
                        onChange={(e) => {
                          const selected = e.target.checked
                            ? [...c.selected, i].sort((a, b) => a - b)
                            : c.selected.filter((x) => x !== i);
                          set({
                            selected,
                            mapping: Object.fromEntries(
                              Object.entries(c.mapping).filter(([, id]) =>
                                selected.includes(id),
                              ),
                            ),
                          });
                        }}
                      />
                      <span>
                        <b>{names[i]}</b>
                        <small>
                          Column {i + 1} ·{" "}
                          {s.rows
                            .slice(s.header + 1, s.header + 4)
                            .map((r) => String(r[i] ?? ""))
                            .join(" / ")}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Give your columns meaning.</h2>
                <div className="success">
                  <b>
                    {s.recognized
                      ? "Saved mappings recognized."
                      : "We’ve suggested the column roles for you."}
                  </b>
                  <p>
                    Review and change anything you want. Continue accepts your
                    visible choices.
                  </p>
                </div>
                {suggestions?.ambiguous
                  .filter((role) => c.mapping[role as Role] == null)
                  .map((role) => (
                    <p className="warning" key={role}>
                      More than one interpretation is possible for {role}.
                      Choose the column you want.
                    </p>
                  ))}
                {c.selected.map((i) => (
                  <label className="mapping" key={i}>
                    <span>
                      {names[i]} <small>· column {i + 1}</small>
                      {!manual.includes(i) &&
                        Object.values(c.mapping).includes(i) && (
                          <span className="pill">
                            {s.recognized ? "Recognized" : "Suggested"} ✓
                          </span>
                        )}
                    </span>
                    <select
                      aria-label={`${names[i]} role`}
                      value={roles.find((r) => c.mapping[r] === i) || ""}
                      onChange={(e) => setRole(i, e.target.value)}
                    >
                      <option value="">No role</option>
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <div className="two">
                  <label>
                    Text number format
                    <select
                      value={c.numberStyle}
                      onChange={(e) =>
                        set({
                          numberStyle: e.target.value as Config["numberStyle"],
                        })
                      }
                    >
                      <option value="point">1,234.56 — decimal point</option>
                      <option value="comma">1.234,56 — decimal comma</option>
                    </select>
                  </label>
                  <label>
                    Text date order
                    <select
                      value={c.dateOrder}
                      onChange={(e) =>
                        set({
                          dateOrder: e.target.value as Config["dateOrder"],
                        })
                      }
                    >
                      {["DMY", "MDY", "YMD"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="hint">
                  Native numbers are read directly. Source text remains
                  available for audit. Review mixed or ambiguous regional
                  formats.
                </p>
                <div className="two">
                  <label>
                    Sort by
                    <select
                      value={c.sort ?? ""}
                      onChange={(e) =>
                        set({
                          sort:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">Source order</option>
                      {c.selected.map((i) => (
                        <option value={i} key={i}>
                          {names[i]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Direction
                    <select
                      value={c.descending ? "desc" : "asc"}
                      onChange={(e) =>
                        set({ descending: e.target.value === "desc" })
                      }
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </label>
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <h2>Choose the perspectives you need.</h2>
                <div className="four">
                  {["Report Data", "Inflows", "Outflows", "Analysis"].map(
                    (n) => (
                      <label className="check-row" key={n}>
                        <input
                          type="checkbox"
                          checked={c.reports.includes(n)}
                          onChange={(e) =>
                            set({
                              reports: e.target.checked
                                ? [...c.reports, n]
                                : c.reports.filter((x) => x !== n),
                            })
                          }
                        />
                        {n}
                      </label>
                    ),
                  )}
                </div>
                <p className="hint">
                  Include Report Data and Amount to reopen the downloaded report
                  for monetary analytics. Omitted source fields are available
                  only in this current session.
                </p>
                {c.reports.includes("Analysis") && (
                  <>
                    <label>
                      Time summary
                      <select
                        value={c.timeGrouping || "auto"}
                        onChange={(e) =>
                          set({
                            timeGrouping: e.target
                              .value as Config["timeGrouping"],
                          })
                        }
                      >
                        {[
                          "auto",
                          "day",
                          "week",
                          "month",
                          "quarter",
                          "year",
                        ].map((level) => (
                          <option key={level}>{level}</option>
                        ))}
                      </select>
                    </label>
                    <h3>Group your data, your way.</h3>
                    <p>
                      Add independent group reports. Each becomes a separate
                      worksheet.
                    </p>
                    {c.groups.map((g, index) => (
                      <fieldset key={index}>
                        <legend>Group analysis {index + 1}</legend>
                        <div className="two">
                          <label>
                            Group By
                            <select
                              value={g.column}
                              onChange={(e) =>
                                group(index, {
                                  column: Number(e.target.value),
                                  level:
                                    Number(e.target.value) === c.mapping.Date
                                      ? "day"
                                      : "value",
                                  values: [],
                                })
                              }
                            >
                              {available.map((i) => (
                                <option value={i} key={i}>
                                  {names[i]} · column {i + 1}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Grouping level
                            <select
                              value={g.level}
                              onChange={(e) =>
                                group(index, {
                                  level: e.target.value as GroupConfig["level"],
                                  values: [],
                                })
                              }
                            >
                              <option value="value">Individual values</option>
                              {["day", "week", "month", "quarter", "year"].map(
                                (n) => (
                                  <option key={n}>{n}</option>
                                ),
                              )}
                            </select>
                          </label>
                        </div>
                        <GroupValues
                          source={s}
                          config={c}
                          group={g}
                          index={index}
                          change={(v) => group(index, v)}
                        />
                        <div className="two">
                          <label>
                            Sort groups
                            <select
                              value={g.sort}
                              onChange={(e) =>
                                group(index, {
                                  sort: e.target.value as GroupConfig["sort"],
                                })
                              }
                            >
                              <option value="label">Group value</option>
                              <option value="inflow">Total inflows</option>
                              <option value="outflow">Total outflows</option>
                              <option value="net">Net flow</option>
                              <option value="count">Transaction count</option>
                            </select>
                          </label>
                          <label>
                            Direction
                            <select
                              value={g.descending ? "desc" : "asc"}
                              onChange={(e) =>
                                group(index, {
                                  descending: e.target.value === "desc",
                                })
                              }
                            >
                              <option value="asc">Ascending</option>
                              <option value="desc">Descending</option>
                            </select>
                          </label>
                        </div>
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={g.chart}
                            onChange={(e) =>
                              group(index, { chart: e.target.checked })
                            }
                          />
                          Include group chart when Analysis is selected
                        </label>
                        <button
                          className="secondary"
                          onClick={() =>
                            set({
                              groups: c.groups.filter((_, i) => i !== index),
                            })
                          }
                        >
                          Remove this group
                        </button>
                      </fieldset>
                    ))}
                    <button
                      className="secondary"
                      onClick={() =>
                        set({
                          groups: [
                            ...c.groups,
                            {
                              column: available[0],
                              mode: "all",
                              level:
                                available[0] === c.mapping.Date
                                  ? "day"
                                  : "value",
                              values: [],
                              sort: "label",
                              descending: false,
                              chart: false,
                            },
                          ],
                        })
                      }
                    >
                      + Add group analysis
                    </button>
                  </>
                )}
              </>
            )}
            {step === 5 && (
              <>
                <h2>A final look before you generate.</h2>
                <p>
                  {c.selected.length} columns · {c.reports.join(", ")} ·{" "}
                  {c.groups.length} group analyses
                </p>
                <h3>Choose your reporting period.</h3>
                <div className="periods">
                  {[
                    ["all", "All Records"],
                    ["month", "Current Month"],
                    ["previous-month", "Previous Month"],
                    ["quarter", "Current Quarter"],
                    ["previous-quarter", "Previous Quarter"],
                    ["year", "Current Year"],
                    ["custom", "Custom Range"],
                  ].map(([v, n]) => (
                    <button
                      className="secondary"
                      key={v}
                      aria-pressed={c.period === v}
                      disabled={v !== "all" && c.mapping.Date == null}
                      onClick={() => set({ period: v })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {c.period === "custom" && (
                  <div className="two">
                    <label>
                      From
                      <input
                        type="date"
                        value={c.start}
                        onChange={(e) => set({ start: e.target.value })}
                      />
                    </label>
                    <label>
                      Through
                      <input
                        type="date"
                        value={c.end}
                        onChange={(e) => set({ end: e.target.value })}
                      />
                    </label>
                  </div>
                )}
                {typeof preview === "string" ? (
                  <p className="error" role="alert">
                    {preview}
                  </p>
                ) : (
                  preview && (
                    <>
                      <div className="success">
                        {preview.records.length.toLocaleString()} records match
                        your selection.
                      </div>
                      <div className="audit">
                        <h3>Data quality review</h3>
                        <p>
                          {preview.audit.missingAmounts} missing amounts ·{" "}
                          {preview.audit.invalidAmounts} invalid amounts ·{" "}
                          {preview.audit.invalidDates} date issues ·{" "}
                          {preview.audit.duplicateRows} duplicate-looking rows
                        </p>
                        {preview.audit.unknownCurrencies.length > 0 && (
                          <p className="warning">
                            Review currencies:{" "}
                            {preview.audit.unknownCurrencies.join(", ")}
                          </p>
                        )}
                        <p>
                          Duplicate-looking records are flagged, never deleted.
                          Missing amounts remain in Report Data.
                        </p>
                      </div>
                      {[...new Set(preview.records.map((r) => r.currency))].map(
                        (cur) => {
                          const k = kpis(
                            preview.records.filter((r) => r.currency === cur),
                          );
                          return (
                            <p key={cur}>
                              <b>{cur}</b> · In {money(k.inflow)} · Out{" "}
                              {money(k.outflow)} · Net {money(k.net)}
                            </p>
                          );
                        },
                      )}
                    </>
                  )
                )}
              </>
            )}
            <div className="wizard-nav">
              <button
                className="secondary"
                onClick={() => (step <= 1 ? reset() : setStep(step - 1))}
              >
                ← Back
              </button>
              {step < 5 ? (
                <button className="primary" onClick={next}>
                  Continue →
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={typeof preview === "string" || !preview}
                  onClick={generate}
                >
                  Generate report →
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
