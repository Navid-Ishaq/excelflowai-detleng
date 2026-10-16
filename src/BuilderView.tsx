import { useState, useRef, useEffect } from "react";
import {
  fieldsFor,
  modelNames,
  type BuildSettings,
  type Field,
  validateBuild,
} from "./builder";
import { type Source, roles } from "./domain";
import { task, cancelTasks } from "./tasks";
export function Builder({
  onUse,
  reset,
  makeURL,
}: {
  onUse: (s: Source, b: ArrayBuffer) => Promise<void>;
  reset: () => void;
  makeURL: (b: ArrayBuffer, t: string) => string;
}) {
  const [step, setStep] = useState(0),
    [settings, setSettings] = useState<BuildSettings>({
      model: modelNames[0],
      fields: fieldsFor(modelNames[0]),
      count: 2000,
      filename: "excelflow-workbook.xlsx",
      currency: "EUR",
      months: 3,
      start: "",
      end: "",
      dateFormat: "dd/mm/yyyy",
      numberStyle: "point",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [output, setOutput] = useState<{
      url: string;
      source: Source;
      bytes: ArrayBuffer;
      blank: boolean;
    } | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  const set = (x: Partial<BuildSettings>) => {
    setSettings({ ...settings, ...x });
    setOutput(null);
  };
  const update = (id: string, x: Partial<Field>) =>
    set({
      fields: settings.fields.map((f) => (f.id === id ? { ...f, ...x } : f)),
    });
  async function build(blank: boolean) {
    try {
      validateBuild(settings);
      setError("");
      setBusy(true);
      const result = await task<{ source: Source; bytes: ArrayBuffer }>({
        type: "builder",
        settings,
        blank,
      });
      if (alive.current)
        setOutput({
          ...result,
          blank,
          url: makeURL(
            result.bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ),
        });
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORKBOOK BUILDER</span>
          <h1>A useful beginning.</h1>
          <p>
            A blank structure or a fictional sample. Built around your business.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            cancelTasks();
            reset();
          }}
        >
          Back to home
        </button>
      </div>
      <ol className="stepper">
        {["Type", "Columns", "Field setup", "Settings", "Review"].map(
          (n, i) => (
            <li
              key={n}
              className={step === i ? "active" : ""}
              aria-current={step === i ? "step" : undefined}
            >
              {i + 1} {n}
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
        {step === 0 && (
          <>
            <h2>What are you working on?</h2>
            <div className="template-grid">
              {modelNames.map((n) => (
                <button
                  className="template"
                  aria-pressed={settings.model === n}
                  key={n}
                  onClick={() => set({ model: n, fields: fieldsFor(n) })}
                >
                  <span>▦</span>
                  <b>{n}</b>
                  <small>
                    {n === "Custom Workbook"
                      ? "Start with your own structure"
                      : "Recommended fields, fully editable"}
                  </small>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Make room for what matters.</h2>
            <p>
              Add, rename, reorder or remove fields. No fixed schema is
              required.
            </p>
            {settings.fields.map((f, i) => (
              <div className="field-row" key={f.id}>
                <label>
                  Field {i + 1}
                  <input
                    value={f.name}
                    onChange={(e) => update(f.id, { name: e.target.value })}
                  />
                </label>
                <div className="actions">
                  <button
                    className="secondary"
                    aria-label={`Move ${f.name} up`}
                    disabled={!i}
                    onClick={() => {
                      const a = [...settings.fields];
                      [a[i - 1], a[i]] = [a[i], a[i - 1]];
                      set({ fields: a });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    className="secondary"
                    aria-label={`Move ${f.name} down`}
                    disabled={i === settings.fields.length - 1}
                    onClick={() => {
                      const a = [...settings.fields];
                      [a[i], a[i + 1]] = [a[i + 1], a[i]];
                      set({ fields: a });
                    }}
                  >
                    ↓
                  </button>
                  <button
                    className="secondary"
                    aria-label={`Remove ${f.name}`}
                    onClick={() =>
                      set({
                        fields: settings.fields.filter((x) => x.id !== f.id),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              className="secondary"
              onClick={() =>
                set({
                  fields: [
                    ...settings.fields,
                    {
                      id: crypto.randomUUID(),
                      name: "Custom field " + (settings.fields.length + 1),
                      type: "text",
                      role: "",
                      required: false,
                      options: "",
                    },
                  ],
                })
              }
            >
              + Add field
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Give every field a purpose.</h2>
            {settings.fields.map((f) => (
              <fieldset key={f.id}>
                <legend>{f.name}</legend>
                <div className="two">
                  <label>
                    Cell type
                    <select
                      value={f.type}
                      onChange={(e) =>
                        update(f.id, { type: e.target.value as Field["type"] })
                      }
                    >
                      {["text", "number", "date", "list"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reporting role
                    <select
                      value={f.role}
                      onChange={(e) => update(f.id, { role: e.target.value })}
                    >
                      <option value="">No role</option>
                      {roles.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) =>
                      update(f.id, { required: e.target.checked })
                    }
                  />
                  Required input
                </label>
                {f.type === "list" && (
                  <label>
                    Dropdown choices, separated by commas
                    <input
                      value={f.options}
                      onChange={(e) =>
                        update(f.id, { options: e.target.value })
                      }
                    />
                  </label>
                )}
              </fieldset>
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <h2>Set the working details.</h2>
            <div className="two">
              <label>
                Filename
                <input
                  value={settings.filename}
                  onChange={(e) =>
                    set({
                      filename: e.target.value.replace(/[<>:"/\\|?*]/g, ""),
                    })
                  }
                />
              </label>
              <label>
                Prepared / sample rows
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={settings.count}
                  onChange={(e) => set({ count: Number(e.target.value) })}
                />
              </label>
              <label>
                Default currency
                <input
                  maxLength={3}
                  value={settings.currency}
                  onChange={(e) =>
                    set({ currency: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <label>
                Sample period
                <select
                  value={settings.months}
                  onChange={(e) => set({ months: Number(e.target.value) })}
                >
                  {[1, 3, 6, 12].map((n) => (
                    <option value={n} key={n}>
                      {n} month(s)
                    </option>
                  ))}
                  <option value={0}>Custom range</option>
                </select>
              </label>
              <label>
                Date display format
                <select
                  value={settings.dateFormat}
                  onChange={(e) => set({ dateFormat: e.target.value })}
                >
                  {["dd/mm/yyyy", "mm/dd/yyyy", "yyyy-mm-dd"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Text numeric input convention
                <select
                  value={settings.numberStyle}
                  onChange={(e) =>
                    set({ numberStyle: e.target.value as "point" | "comma" })
                  }
                >
                  <option value="point">Decimal point</option>
                  <option value="comma">Decimal comma</option>
                </select>
              </label>
            </div>
            {!settings.months && (
              <div className="two">
                <label>
                  From
                  <input
                    type="date"
                    value={settings.start}
                    onChange={(e) => set({ start: e.target.value })}
                  />
                </label>
                <label>
                  Through
                  <input
                    type="date"
                    value={settings.end}
                    onChange={(e) => set({ end: e.target.value })}
                  />
                </label>
              </div>
            )}
            <p className="hint">
              Excel displays native numbers using your regional settings. The
              convention above describes subsequently entered text amounts.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <h2>Your workbook, ready to begin.</h2>
            <p>
              <b>{settings.model}</b> · {settings.fields.length} fields ·{" "}
              {settings.count.toLocaleString()} rows · {settings.currency}
            </p>
            <p>{settings.fields.map((f) => f.name).join(" · ")}</p>
            <div className="two">
              <article className="audit">
                <h3>Blank workbook</h3>
                <p>
                  Prepared entry rows, typed formats and configured dropdowns.
                  No fictional transactions.
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => void build(true)}
                >
                  Generate blank workbook
                </button>
              </article>
              <article className="audit">
                <h3>Sample workbook</h3>
                <p>
                  Clearly fictional records for practice and demos. Never real
                  customer information.
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void build(false)}
                >
                  Generate sample workbook
                </button>
              </article>
            </div>
            {busy && <p role="status">Preparing your workbook locally…</p>}
            {output && (
              <div className="success">
                <p>✓ {output.blank ? "Blank" : "Sample"} workbook ready.</p>
                <div className="actions">
                  <a
                    className="primary"
                    href={output.url}
                    download={
                      settings.filename.endsWith(".xlsx")
                        ? settings.filename
                        : settings.filename + ".xlsx"
                    }
                  >
                    Download {output.blank ? "blank" : "sample"} workbook
                  </a>
                  {!output.blank && (
                    <button
                      className="secondary"
                      onClick={() => void onUse(output.source, output.bytes)}
                    >
                      Analyze this sample now →
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div className="wizard-nav">
          <button
            className="secondary"
            disabled={!step || busy}
            onClick={() => setStep(step - 1)}
          >
            ← Back
          </button>
          {step < 4 && (
            <button
              className="primary"
              onClick={() => {
                try {
                  if (step > 0) validateBuild(settings);
                  setError("");
                  setStep(step + 1);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Continue →
            </button>
          )}
        </div>
      </section>
    </>
  );
}
