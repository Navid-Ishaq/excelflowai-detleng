import { jsPDF } from "jspdf";
import { type Payload, type AIResult, money } from "./domain";
import { renderText } from "./grounding";
export async function analysisPDF(p: Payload, r: AIResult) {
  const doc = new jsPDF();
  let y = 22;
  const line = (text: string, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 172);
    for (const l of lines) {
      if (y > 272) {
        doc.addPage();
        y = 22;
      }
      doc.text(l, 19, y);
      y += size * 0.48 + 2;
    }
    y += 3;
  };
  doc.setTextColor("#312e81");
  line("ExcelFlow AI | Evidence-based analysis", 20, true);
  doc.setTextColor("#334155");
  line(`Source: ${p.filename}`);
  line(
    `Prepared: ${new Date().toISOString().slice(0, 10)} | ${p.currency} | ${p.language}`,
  );
  line(`Period: ${p.period}`);
  line("Checked indicators", 14, true);
  for (const m of p.metrics.filter((x) => x.id.startsWith("kpi.")))
    line(
      `${m.label}: ${typeof m.value === "number" ? money(m.value) : m.value} [${m.id}]`,
    );
  line("AI findings", 14, true);
  for (const f of r.findings) {
    line(f.title, 13, true);
    line(renderText(f.explanation, p));
    line(`Metrics: ${f.metricIds.join(", ")}`);
    line(`Evidence: ${f.evidenceIds.join(", ") || "Aggregate context"}`);
    if (f.limitation) line("Limitations: " + f.limitation);
  }
  if (p.trends.length) {
    if (y > 190) {
      doc.addPage();
      y = 22;
    }
    line("Recent net-flow trend", 14, true);
    const points = p.trends.slice(-8),
      max = Math.max(1, ...points.map((x) => Math.abs(x.net)));
    for (const point of points) {
      line(`${point.label}: ${money(point.net)}`, 9);
      doc.setFillColor(point.net < 0 ? "#be123c" : "#4f46e5");
      doc.rect(19, y, Math.max(1, (Math.abs(point.net) / max) * 145), 3, "F");
      y += 8;
    }
  }
  line("Scope and limitations", 14, true);
  line(
    "Calculations use the selected source records. Missing or invalid inputs can limit conclusions. Different currencies are not converted or combined. AI text is checked for supported references and numeric placeholders; it is not a guarantee of business completeness or advice. Group and row evidence may be bounded samples.",
  );
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.text(
      `ExcelFlow AI by DeTLeng | ${page} / ${doc.getNumberOfPages()}`,
      19,
      287,
    );
  }
  return doc.output("arraybuffer");
}
