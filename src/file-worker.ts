import { loadSource, exportReport, exportBuilder } from "./files";
self.onmessage = async ({ data: m }) => {
  try {
    const result =
      m.type === "load"
        ? await loadSource(m.bytes, m.name, m.sheet, m.delimiter)
        : m.type === "report"
          ? await exportReport(m.dataset, m.findings)
          : await exportBuilder(m.settings, m.blank);
    self.postMessage({ id: m.id, result });
  } catch (e) {
    self.postMessage({
      id: m.id,
      error:
        e instanceof Error ? e.message : "Could not process this workbook.",
    });
  }
};
