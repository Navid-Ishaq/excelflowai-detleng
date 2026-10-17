import { useState, useRef, useEffect, type ReactNode } from "react";
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="secondary" aria-label="Close dialog" onClick={close}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
const guide = [
  [
    "Choose your starting point",
    "Upload XLSX or CSV, explore a saved report, or build a blank or fictional sample workbook.",
    "What do you want to do?",
  ],
  [
    "Give columns meaning",
    "Check your sheet and header, choose columns, then review suggested roles. Balance and Amount have different meanings.",
    "You remain in control.",
  ],
  [
    "Choose your reports",
    "Select transaction sheets, analysis and independent group reports. Fields omitted from display can still be grouped.",
    "One source. Several perspectives.",
  ],
  [
    "Set the period",
    "Use the final review controls for a month, quarter, year or custom range. Date filtering requires a mapped Date field.",
    "Boundaries include both dates.",
  ],
  [
    "Read the results",
    "Download the new Excel workbook and open Live Analytics. Different currencies stay separate.",
    "Your original stays unchanged.",
  ],
  [
    "Explore your data",
    "Use periods, groups and currency filters. Look at trends and trace details back to record references.",
    "Check the context before comparing.",
  ],
  [
    "Use AI by choice",
    "Preview selected context before requesting AI. Checked metrics support the response; an unavailable answer is never invented.",
    "AI explains. Calculations establish the figures.",
  ],
  [
    "Return whenever you need",
    "Reopen your exported report through Explore. Start New Report clears the active session.",
    "Ready to begin?",
  ],
];
const story = [
  [
    "A simple question",
    "What would make a spreadsheet easier to act on? ExcelFlow AI begins with the owner who needs clarity, not another complicated tool.",
    "Clarity is the starting point.",
  ],
  [
    "Build trust in the numbers",
    "Dates, signs, missing amounts and currencies need explicit handling before a chart or explanation can help.",
    "Calculations before interpretation.",
  ],
  [
    "Give owners control",
    "Guided mapping and flexible grouping help different workbooks fit a useful reporting structure.",
    "Different businesses. Familiar steps.",
  ],
  [
    "Make patterns visible",
    "Tables preserve detail. Charts and interactive exploration reveal changes, concentrations and exceptions.",
    "Move from records to perspective.",
  ],
  [
    "Explain with evidence",
    "AI adds a conversational layer. Its statements must refer to the checked context available in the current session.",
    "Useful answers have a foundation.",
  ],
  [
    "Keep the experience honest",
    "This portfolio product demonstrates practical reporting, transparent limits and thoughtful AI integration.",
    "A useful tool should be understandable.",
  ],
];
export function Experience({ kind, done }: { kind: string; done: () => void }) {
  const [step, setStep] = useState(0),
    [answer, setAnswer] = useState("");
  const scenes = kind === "guide" ? guide : story,
    s = scenes[step];
  return (
    <section className="experience">
      <span className="eyebrow">
        {kind === "guide" ? "HOW TO USE IT · 2–3 MINUTES" : "WHY IT EXISTS"} ·{" "}
        {step + 1} / {scenes.length}
      </span>
      <progress
        value={step + 1}
        max={scenes.length}
        aria-label="Guide progress"
      />
      <h3>{s[0]}</h3>
      <p className="lead">{s[1]}</p>
      <div className="story-note">{s[2]}</div>
      {kind === "guide" && step === 1 && (
        <fieldset>
          <legend>Which field represents a transaction value?</legend>
          {["Amount", "Balance"].map((v) => (
            <button className="secondary" key={v} onClick={() => setAnswer(v)}>
              {v}
            </button>
          ))}
          {answer && (
            <p role="status">
              {answer === "Amount"
                ? "Correct. Signed Amount identifies inflows and outflows."
                : "Balance is the remaining account value. Choose Amount for transaction flows."}
            </p>
          )}
        </fieldset>
      )}
      <div className="actions">
        <button
          className="secondary"
          disabled={!step}
          onClick={() => {
            setStep(step - 1);
            setAnswer("");
          }}
        >
          ← Back
        </button>
        <button
          className="primary"
          onClick={() => {
            if (step === scenes.length - 1) done();
            else {
              setStep(step + 1);
              setAnswer("");
            }
          }}
        >
          {step === scenes.length - 1 ? "Return to workspace" : "Next →"}
        </button>
      </div>
    </section>
  );
}
