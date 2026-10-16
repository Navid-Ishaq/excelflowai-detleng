import { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  type Source,
  type Config,
  type Dataset,
  initialConfig,
  type AIResult,
  type Payload,
} from "./domain";
import { prepare, suggest, detectFormats } from "./engine";
import { renderText } from "./grounding";
import { task, cancelTasks } from "./tasks";
import { Wizard } from "./Wizard";
const Builder = lazy(() =>
  import("./BuilderView").then((m) => ({ default: m.Builder })),
);
const Analytics = lazy(() =>
  import("./Analytics").then((m) => ({ default: m.Analytics })),
);
import { Experience, Modal } from "./Experience";
export function App() {
  const [view, setView] = useState("home"),
    [source, setSource] = useState<Source | null>(null),
    [config, setConfig] = useState<Config>(initialConfig),
    [dataset, setDataset] = useState<Dataset | null>(null),
    [original, setOriginal] = useState<{
      bytes: ArrayBuffer;
      name: string;
    } | null>(null),
    [report, setReport] = useState(""),
    [ai, setAI] = useState<AIResult | null>(null),
    [pdf, setPDF] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [modal, setModal] = useState(""),
    [step, setStep] = useState(0),
    [menu, setMenu] = useState(false),
    [preview, setPreview] = useState(false);
  const generation = useRef(0),
    urls = useRef<string[]>([]),
    input = useRef<HTMLInputElement>(null),
    mode = useRef("create");
  const makeURL = (bytes: ArrayBuffer | Uint8Array | Blob, type: string) => {
    const u = URL.createObjectURL(
      bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type }),
    );
    urls.current.push(u);
    return u;
  };
  useEffect(
    () => () => {
      cancelTasks();
      urls.current.forEach(URL.revokeObjectURL);
    },
    [],
  );
  useEffect(() => {
    document.getElementById("content")?.focus();
  }, [view]);
  function reset() {
    generation.current++;
    cancelTasks();
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];
    setSource(null);
    setConfig(initialConfig());
    setDataset(null);
    setOriginal(null);
    setReport("");
    setAI(null);
    setPDF("");
    setBusy("");
    setError("");
    setPreview(false);
    setStep(0);
    setView("home");
  }
  function upload(explore = false) {
    mode.current = explore ? "explore" : "create";
    input.current!.value = "";
    input.current!.click();
  }
  async function read(file: File) {
    reset();
    const token = ++generation.current;
    setBusy("Reading your file locally");
    setView("wizard");
    try {
      const bytes = await file.arrayBuffer();
      const model = await task<Source>({
        type: "load",
        bytes,
        name: file.name,
      });
      if (token !== generation.current) return;
      setOriginal({ bytes, name: file.name });
      setSource(model);
      const c = { ...initialConfig(), ...detectFormats(model) };
      c.selected = model.rows[model.header].map((_, i) => i);
      c.mapping = suggest(model, c).mapping;
      setConfig(c);
      setStep(mode.current === "explore" ? 3 : 1);
      if (
        mode.current === "explore" &&
        model.recognized &&
        c.mapping.Amount != null
      ) {
        await generate(model, c, token);
      } else if (mode.current === "explore")
        setError(
          "Confirm the source and Amount mapping to explore this workbook.",
        );
    } catch (e) {
      if (token === generation.current) setError((e as Error).message);
    } finally {
      if (token === generation.current) setBusy("");
    }
  }
  async function changeSheet(sheet: string, delimiter?: string) {
    if (!original) return;
    const token = ++generation.current;
    setBusy("Inspecting your source");
    try {
      const next = await task<Source>({
        type: "load",
        bytes: original.bytes,
        name: original.name,
        sheet,
        delimiter,
      });
      if (token !== generation.current) return;
      setSource(next);
      const c = { ...initialConfig(), ...detectFormats(next) };
      c.selected = next.rows[next.header].map((_, i) => i);
      c.mapping = suggest(next, c).mapping;
      setConfig(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function generate(s = source!, c = config, existingToken?: number) {
    const token = existingToken ?? generation.current;
    setError("");
    try {
      const ds = prepare(s, c);
      setBusy("Building your Excel report");
      const bytes = await task<ArrayBuffer>({ type: "report", dataset: ds });
      if (token !== generation.current) return;
      setReport(
        makeURL(
          bytes,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
      );
      setDataset(ds);
      setAI(null);
      setPDF("");
      setView("results");
    } catch (e) {
      if (token === generation.current) setError((e as Error).message);
    } finally {
      if (token === generation.current) setBusy("");
    }
  }
  async function useSample(model: Source, bytes: ArrayBuffer) {
    reset();
    setSource(model);
    setOriginal({ bytes, name: model.name });
    const c = { ...initialConfig(), ...detectFormats(model) };
    c.selected = model.rows[0].map((_, i) => i);
    c.mapping = suggest(model, c).mapping;
    if (c.mapping.Amount == null) c.reports = ["Report Data"];
    setConfig(c);
    setStep(2);
    setView("wizard");
  }
  async function trySample() {
    const { fieldsFor } = await import("./builder");
    const settings = {
      model: "Complete Business Workbook",
      fields: fieldsFor("Complete Business Workbook"),
      count: 2000,
      filename: "excelflow-sample.xlsx",
      currency: "EUR",
      months: 3,
      start: "",
      end: "",
      dateFormat: "dd/mm/yyyy",
      numberStyle: "point",
    };
    const token = ++generation.current;
    setBusy("Preparing a fictional sample");
    try {
      const result = await task<{ bytes: ArrayBuffer; source: Source }>({
        type: "builder",
        settings,
        blank: false,
      });
      if (token === generation.current)
        await useSample(result.source, result.bytes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const originalURL = useRef("");
  useEffect(() => {
    if (original) {
      originalURL.current = makeURL(original.bytes, "application/octet-stream");
    } else originalURL.current = "";
  }, [original]);
  const updateAI = async (
    result: AIResult,
    pdfBytes: ArrayBuffer,
    context: Payload,
  ) => {
    const token = generation.current;
    const bytes = await task<ArrayBuffer>({
      type: "report",
      dataset,
      findings: result.findings.map((f) => ({
        ...f,
        explanation: `[${context.currency}; ${context.period}] ${renderText(f.explanation, context)}`,
      })),
    });
    if (token !== generation.current) return;
    setAI(result);
    setPDF(makeURL(pdfBytes, "application/pdf"));
    setReport(
      makeURL(
        bytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    );
  };
  const summaries = dataset
    ? [...new Set(dataset.records.map((r) => r.currency))]
    : [];
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="top">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (view !== "home") reset();
          }}
        >
          <img src="./icon.svg" alt="" width="38" height="38" />
          <span>
            ExcelFlow <b>AI</b>
            <small>BY DETLENG</small>
          </span>
        </a>
        <button
          className="menu"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          ☰
        </button>
        <nav className={menu ? "open" : ""} aria-label="Main navigation">
          {[
            ["guide", "Quick Guide"],
            ["story", "Our Story"],
            ["privacy", "Privacy"],
            ["about", "About"],
            ["demo", "Watch Demo"],
          ].map(([key, text]) => (
            <button
              key={key}
              className="nav-link"
              onClick={() => {
                setModal(key);
                setMenu(false);
              }}
            >
              {text}
            </button>
          ))}
        </nav>
        <span className="local-badge">● Local calculations</span>
      </header>
      <input
        hidden
        type="file"
        ref={input}
        accept=".xlsx,.csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void read(f);
        }}
      />
      <main id="content" tabIndex={-1} className="shell">
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Dismiss message" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {busy ? (
          <section className="panel loading" aria-busy="true">
            <span className="spinner" />
            <h1>{busy}</h1>
            <p>
              Your workbook stays in this browser while we prepare the next
              step.
            </p>
            <progress aria-label="Processing file" />
            <button className="secondary" onClick={reset}>
              Cancel and start fresh
            </button>
          </section>
        ) : (
          <>
            {view === "home" && (
              <>
                <section className="hero">
                  <div>
                    <span className="eyebrow">
                      YOUR SPREADSHEETS. A CLEARER PERSPECTIVE.
                    </span>
                    <h1>
                      From everyday data
                      <br />
                      to your next <em>good decision.</em>
                    </h1>
                    <p className="lead">
                      Build clear Excel reports, explore the numbers, and ask
                      better questions—with evidence-based AI when you need it.
                    </p>
                    <div className="actions">
                      <button className="primary" onClick={() => upload()}>
                        Upload Excel / CSV ↗
                      </button>
                      <button
                        className="secondary"
                        onClick={() => void trySample()}
                      >
                        Try a sample
                      </button>
                    </div>
                    <p className="micro">
                      No account needed · Original file unchanged · You control
                      AI sharing
                    </p>
                  </div>
                  <div
                    className="hero-dashboard"
                    aria-label="Illustrative dashboard with fictional figures"
                  >
                    <div className="mini-title">
                      <span>YOUR BUSINESS, IN VIEW</span>
                      <span className="pill">Fictional example</span>
                    </div>
                    <div className="mini-kpis">
                      <div>
                        <small>Money in</small>
                        <b>24,800</b>
                        <span>EUR</span>
                      </div>
                      <div>
                        <small>Money out</small>
                        <b>18,400</b>
                        <span>EUR</span>
                      </div>
                      <div>
                        <small>Net flow</small>
                        <b className="positive">6,400</b>
                        <span>EUR</span>
                      </div>
                    </div>
                    <div className="demo-bars" aria-hidden="true">
                      {[40, 64, 46, 82, 62, 96, 74, 100, 82, 90].map((v, i) => (
                        <div key={i}>
                          <i style={{ height: v + "%" }} />
                          <i style={{ height: v * 0.7 + "%" }} />
                        </div>
                      ))}
                    </div>
                    <div className="mini-title">
                      <span>REPORT → EXPLORE → UNDERSTAND</span>
                      <span>✦</span>
                    </div>
                    <div className="insight-demo">
                      <b>Clarity before complexity.</b>
                      <p>
                        Checked calculations first. Optional AI explanations
                        second.
                      </p>
                    </div>
                  </div>
                </section>
                <section
                  className="entry-grid"
                  aria-label="Start your workspace"
                >
                  {[
                    {
                      title: "Create a report",
                      tag: "01 / CREATE",
                      text: "Bring an Excel or CSV file. Choose the columns, period and reports that matter.",
                      action: "Upload source file",
                      fn: () => upload(),
                    },
                    {
                      title: "Explore a report",
                      tag: "02 / EXPLORE",
                      text: "Reopen a saved report and take a closer look with interactive analytics.",
                      action: "Explore existing report",
                      fn: () => upload(true),
                    },
                    {
                      title: "Build a workbook",
                      tag: "03 / BUILD",
                      text: "Start with a blank structure or realistic fictional data. Make it yours.",
                      action: "Build your workbook",
                      fn: () => {
                        reset();
                        setView("builder");
                      },
                    },
                  ].map((x) => (
                    <article className="panel entry" key={x.tag}>
                      <span className="eyebrow">{x.tag}</span>
                      <h2>{x.title}</h2>
                      <p>{x.text}</p>
                      <button className="text-button" onClick={x.fn}>
                        {x.action} →
                      </button>
                    </article>
                  ))}
                </section>
                <section className="how">
                  <span className="eyebrow">
                    A SIMPLE ROUTE TO BETTER REPORTING
                  </span>
                  <h2>Bring the file. Keep the control.</h2>
                  <div className="three">
                    <p>
                      <b>01 / Make it meaningful</b>Choose your source, columns
                      and reporting roles.
                    </p>
                    <p>
                      <b>02 / See the whole picture</b>Generate Excel tables,
                      group reports and interactive charts.
                    </p>
                    <p>
                      <b>03 / Ask with confidence</b>Request optional AI
                      explanations grounded in checked metrics.
                    </p>
                  </div>
                </section>
                <section className="demo-section">
                  <div>
                    <span className="eyebrow">SEE IT IN ACTION</span>
                    <h2>A guided look, coming soon.</h2>
                    <p>
                      Our demo video will show the complete journey. Until then,
                      try the sample or take the interactive Quick Guide.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => setModal("guide")}
                    >
                      Open Quick Guide
                    </button>
                  </div>
                  <div className="video-placeholder">
                    <span>▷</span>
                    <b>Demo video coming soon</b>
                    <small>No video has been published yet.</small>
                  </div>
                </section>
              </>
            )}
            {view === "wizard" && (
              <Wizard
                source={source}
                config={config}
                setConfig={setConfig}
                setSource={setSource}
                step={step}
                setStep={setStep}
                changeSheet={changeSheet}
                upload={() => upload()}
                generate={() => void generate()}
                reset={reset}
              />
            )}
            {view === "builder" && (
              <Suspense
                fallback={
                  <section className="panel" role="status">
                    Preparing Workbook Builder…
                  </section>
                }
              >
                <Builder onUse={useSample} reset={reset} makeURL={makeURL} />
              </Suspense>
            )}
            {view === "results" && dataset && (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">YOUR REPORT IS READY</span>
                    <h1>A clearer picture.</h1>
                    <p>
                      {dataset.name} · {dataset.records.length.toLocaleString()}{" "}
                      records · {summaries.join(" / ")}
                    </p>
                  </div>
                  <button className="secondary" onClick={reset}>
                    Start New Report
                  </button>
                </div>
                <div className="success">
                  ✓ Calculations reconciled by currency.{" "}
                  {summaries.length > 1
                    ? "Multiple currencies are shown separately."
                    : "Your original source is unchanged."}
                </div>
                <div className="downloads">
                  <a
                    className="secondary"
                    href={originalURL.current}
                    download={original?.name}
                  >
                    ↓ Download original
                  </a>
                  <a
                    className="primary"
                    id="download-report"
                    href={report}
                    download={
                      ai
                        ? "excelflow-report-with-ai.xlsx"
                        : "excelflow-report.xlsx"
                    }
                  >
                    ↓{" "}
                    {ai
                      ? "Updated Excel + AI findings"
                      : "Download Excel report"}
                  </a>
                  {pdf ? (
                    <a
                      className="secondary"
                      href={pdf}
                      download="excelflow-ai-analysis.pdf"
                    >
                      ↓ Download AI PDF
                    </a>
                  ) : (
                    <button className="secondary" disabled>
                      AI PDF · generate insights first
                    </button>
                  )}
                </div>
                <div className="actions">
                  <button
                    className="primary"
                    onClick={() => setView("analytics")}
                  >
                    Open Live Analytics →
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? "Hide preview" : "Preview report"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setStep(5);
                      setView("wizard");
                    }}
                  >
                    Adjust settings
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setModal("email")}
                  >
                    Send by Email
                  </button>
                </div>
                {preview && (
                  <div className="panel">
                    <h2>Report Data preview</h2>
                    <p>
                      First twenty records. Your Excel includes every matching
                      record.
                    </p>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {config.selected.map((i) => (
                              <th key={i}>{dataset.headers[i]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dataset.records.slice(0, 20).map((r) => (
                            <tr key={r.id}>
                              {config.selected.map((i) => (
                                <td key={i}>{String(r.values[i] ?? "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
            {view === "analytics" && dataset && (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">LIVE ANALYTICS</span>
                    <h1>Your business, in perspective.</h1>
                    <p>{dataset.name}</p>
                  </div>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => setView("results")}
                    >
                      ← Report & downloads
                    </button>
                    <button className="secondary" onClick={reset}>
                      Start New Report
                    </button>
                  </div>
                </div>
              </>
            )}
            {dataset && ["results", "analytics"].includes(view) && (
              <Suspense
                fallback={
                  <section className="panel" role="status">
                    Preparing analytics…
                  </section>
                }
              >
                <Analytics
                  key={dataset.id}
                  dataset={dataset}
                  compact={view === "results"}
                  onAI={updateAI}
                />
              </Suspense>
            )}
          </>
        )}
      </main>
      <footer className="shell">
        <div>
          <b>
            ExcelFlow AI <span>by DeTLeng</span>
          </b>
          <p>Clear reports. Considered decisions.</p>
        </div>
        <div>
          <button onClick={() => setModal("privacy")}>Privacy</button>
          <button onClick={() => setModal("guide")}>Quick Guide</button>
          <button onClick={() => setModal("about")}>About</button>
        </div>
        <small>
          Spreadsheet calculations are local. Optional AI uses selected context
          remotely.
        </small>
      </footer>
      {modal && (
        <Modal
          title={
            {
              guide: "Quick Guide",
              story: "The story of ExcelFlow AI",
              privacy: "Your data, your choice",
              about: "About ExcelFlow AI",
              demo: "Watch Demo",
              email: "Email Delivery — Coming Soon",
            }[modal] || ""
          }
          close={() => setModal("")}
        >
          {modal === "guide" || modal === "story" ? (
            <Experience kind={modal} done={() => setModal("")} />
          ) : modal === "privacy" ? (
            <>
              <p>
                Excel and CSV parsing, calculations, grouping, charts, workbook
                creation and downloads happen on your device. We do not write
                your records or conversations to browser storage.
              </p>
              <p>
                AI is optional. When you explicitly request insights or send a
                question, checked summaries, group labels and a limited set of
                relevant row references, dates and amounts are sent to our AI
                backend and OpenAI. The request preview shows this context. Your
                full workbook is not uploaded by default.
              </p>
              <p>
                The application has no user database or permanent workbook/chat
                storage. Processing providers have their own policies; no
                zero-retention guarantee is implied. Avoid sending confidential
                information without authorization.
              </p>
              <p>
                Start New Report clears active data and cancels pending
                requests. Previously downloaded files remain on your device. Use
                fictional data for public demos.
              </p>
            </>
          ) : modal === "about" ? (
            <>
              <p>
                ExcelFlow AI by DeTLeng is an independent portfolio application
                for spreadsheet reporting and evidence-based decision support.
              </p>
              <p>
                Build a workbook, create a report, explore trends, and
                optionally ask an AI assistant to explain checked results. This
                is reporting support, not an accounting system or financial
                advice.
              </p>
              <p>
                Supported input: XLSX and UTF-8 CSV, up to 20 MB, 200,000
                records and 256 columns. Workbook formulas use saved values;
                arbitrary formulas, macros, legacy XLS and currency conversion
                are not supported.
              </p>
            </>
          ) : modal === "demo" ? (
            <>
              <div className="video-placeholder">
                <span>▷</span>
                <b>Demo video coming soon</b>
              </div>
              <p>
                A real walkthrough will be added when it is ready. You can use
                the interactive Quick Guide today.
              </p>
              <button className="primary" onClick={() => setModal("guide")}>
                Open Quick Guide
              </button>
            </>
          ) : (
            <>
              <p>
                This feature is not available yet. Upon user request, email
                delivery may be added in a future update. It will allow you to
                send your original Excel workbook, processed Excel report, and
                AI analysis PDF to your preferred email address.
              </p>
              <p>
                For now, enjoy downloading all three files directly to your
                device!
              </p>
              <p>Thank you for using ExcelFlow AI by DeTLeng.</p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
