import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ExcelJS from "exceljs";
const base = process.env.EF_BASE_URL || "http://127.0.0.1:5180";
fs.mkdirSync("work", { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
const errors: string[] = [],
  external: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (
    !r.url().startsWith(base) &&
    !r.url().startsWith("blob:") &&
    !r.url().startsWith("data:")
  )
    external.push(r.url());
});
await page.goto(base);
await page.screenshot({ path: "work/home-desktop.png", fullPage: true });
for (const width of [390, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const demo = await page
    .locator(".hero-video .video-placeholder")
    .boundingBox();
  assert.ok(
    demo && demo.y >= 0 && demo.y + demo.height < 900,
    "Demo must be visible on first view",
  );
  if (width === 390)
    await page.screenshot({ path: "work/home-mobile.png", fullPage: true });
}
await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
const axe = async () =>
  await page.evaluate(async () =>
    (await (window as any).axe.run()).violations.map((v: any) => ({
      id: v.id,
      nodes: v.nodes.map((n: any) => n.target),
    })),
  );
assert.deepEqual(await axe(), []);
await page.getByRole("button", { name: "Try a sample", exact: true }).click();
try {
  await page
    .getByRole("heading", { name: "Choose your report columns." })
    .waitFor({ timeout: 60000 });
} catch (error) {
  console.log(
    "Sample failure state:",
    await page.locator("body").innerText(),
    errors,
  );
  await page.screenshot({ path: "work/sample-failure.png" });
  await browser.close();
  throw error;
}
await page.getByRole("button", { name: "Continue →", exact: true }).click();
assert.equal(
  await page.getByLabel("Date role", { exact: true }).inputValue(),
  "Date",
);
assert.equal(
  await page.getByLabel("Amount role", { exact: true }).inputValue(),
  "Amount",
);
await page.getByLabel("Date role", { exact: true }).selectOption("");
await page.getByRole("button", { name: "← Back", exact: true }).click();
await page.getByRole("button", { name: "Continue →", exact: true }).click();
assert.equal(
  await page.getByLabel("Date role", { exact: true }).inputValue(),
  "",
);
await page.getByLabel("Date role", { exact: true }).selectOption("Date");
await page.getByRole("button", { name: "Continue →", exact: true }).click();
await page.getByRole("checkbox", { name: "Analysis", exact: true }).check();
for (let i = 0; i < 2; i++)
  await page
    .getByRole("button", { name: "+ Add group analysis", exact: true })
    .click();
await page
  .getByRole("combobox", { name: /Group By/ })
  .nth(0)
  .selectOption("5");
await page
  .getByRole("combobox", { name: /Group By/ })
  .nth(1)
  .selectOption("7");
const firstGroup = page.locator("fieldset").first();
await firstGroup
  .getByRole("combobox", { name: /Include values/ })
  .selectOption("one");
assert.ok((await firstGroup.getByRole("radio").count()) > 0);
await firstGroup.getByRole("radio").first().check();
await firstGroup
  .getByRole("combobox", { name: /Include values/ })
  .selectOption("selected");
assert.ok((await firstGroup.getByRole("checkbox").count()) > 1);
await firstGroup
  .getByRole("button", { name: "Select all values", exact: true })
  .click();
await firstGroup
  .getByRole("combobox", { name: /Include values/ })
  .selectOption("all");
await page.getByRole("button", { name: "Continue →", exact: true }).click();
assert.match(await page.locator(".success").innerText(), /2,000 records/);
await page.getByRole("button", { name: "Generate report →" }).click();
await page.locator("#download-report").waitFor({ timeout: 90000 });
assert.equal(
  await page.locator(".kpi").last().locator("b").innerText(),
  "2,000",
);
const bytes = await page
  .locator("#download-report")
  .evaluate(async (a: any) =>
    Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
  );
fs.writeFileSync("work/generated-report.xlsx", Buffer.from(bytes));
const w = new ExcelJS.Workbook();
await w.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
assert.equal(w.getWorksheet("Report Data")!.rowCount, 2001);
assert.equal(w.worksheets.filter((s) => s.name.startsWith("Group ")).length, 2);
await page.screenshot({ path: "work/results-desktop.png", fullPage: true });
assert.deepEqual(await axe(), []);
await page.getByRole("button", { name: "Open Live Analytics →" }).click();
await page.getByRole("tab", { name: "Trends", exact: true }).click();
await page.getByLabel("Time level").selectOption("quarter");
await page.getByRole("tab", { name: "Groups", exact: true }).click();
await page.getByRole("tab", { name: "Transactions", exact: true }).click();
await page.getByLabel("Search current records").fill("Synthetic");
assert.ok((await page.locator("tbody tr").count()) > 0);
await page.getByRole("tab", { name: "AI Insights", exact: true }).click();
await page
  .getByRole("button", { name: "Generate AI insights", exact: true })
  .click();
await page
  .getByRole("alert")
  .filter({ hasText: "AI analysis unavailable" })
  .waitFor();
assert.ok(
  await page.getByRole("button", { name: "← Report & downloads" }).isEnabled(),
);
// A controlled transport fixture tests client grounding, PDF/Excel updates and reset without claiming a real model call.
await page.route("**/api/analyze", async (route) => {
  const { payload } = route.request().postDataJSON();
  await route.fulfill({
    json: {
      sessionId: payload.sessionId,
      findings: [
        {
          title: "Checked net flow",
          explanation: "The current net flow is {{kpi.net}}.",
          metricIds: ["kpi.net"],
          evidenceIds: [],
          importance: "medium",
          limitation: "Only the selected records are included.",
        },
      ],
      answer: "Net flow is {{kpi.net}}.",
      metricIds: ["kpi.net"],
      evidenceIds: [],
      language: payload.language,
    },
  });
});
await page
  .getByRole("button", { name: "Generate AI insights", exact: true })
  .click();
await page
  .getByText("Insights checked against supplied references.", { exact: false })
  .waitFor();
await page
  .getByLabel("Your question", { exact: true })
  .fill("What is the net flow?");
await page.getByRole("button", { name: "Send question", exact: true }).click();
await page.locator(".chat").waitFor();
await page.getByRole("button", { name: "← Report & downloads" }).click();
await page
  .getByRole("link", { name: "↓ Updated Excel + AI findings" })
  .waitFor();
const pdfURL = await page
  .getByRole("link", { name: "↓ Download AI PDF" })
  .getAttribute("href");
assert.ok(pdfURL?.startsWith("blob:"));
const updated = await page
  .locator("#download-report")
  .evaluate(async (a: any) =>
    Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
  );
const updatedBook = new ExcelJS.Workbook();
await updatedBook.xlsx.load(Buffer.from(updated) as unknown as ArrayBuffer);
assert.ok(updatedBook.getWorksheet("AI Findings"));
await page.getByRole("button", { name: "Send by Email", exact: true }).click();
assert.equal(await page.locator("dialog input").count(), 0);
await page.keyboard.press("Escape");
assert.equal(await page.locator("dialog").count(), 0);
await page
  .getByRole("button", { name: "Start New Report", exact: true })
  .click();
assert.equal(await page.locator(".chat").count(), 0);
assert.equal(await page.locator("#download-report").count(), 0);
await page
  .getByRole("button", { name: "Explore existing report", exact: false })
  .click();
await page
  .locator("input[type=file]")
  .setInputFiles("work/generated-report.xlsx");
await page.locator("#download-report").waitFor({ timeout: 90000 });
assert.equal(
  await page.locator(".kpi").last().locator("b").innerText(),
  "2,000",
);
await page
  .getByRole("button", { name: "Start New Report", exact: true })
  .click();
fs.writeFileSync(
  "work/sample.csv",
  'Date;Description;Amount;Currency\n2026-01-01;"Café, receipt";19,20;EUR\n2026-01-02;Payment;-5,10;EUR',
);
await page
  .getByRole("button", { name: "Upload source file", exact: false })
  .click();
await page.locator("input[type=file]").setInputFiles("work/sample.csv");
await page.getByRole("heading", { name: "Where are the records?" }).waitFor();
await page.getByRole("button", { name: "Continue →", exact: true }).click();
await page.getByRole("button", { name: "Continue →", exact: true }).click();
await page.getByLabel("Text number format").selectOption("comma");
await page.getByLabel("Amount role", { exact: true }).selectOption("Amount");
await page.getByRole("button", { name: "Continue →", exact: true }).click();
await page.getByRole("button", { name: "Continue →", exact: true }).click();
await page.getByRole("button", { name: "Generate report →" }).click();
await page.locator("#download-report").waitFor();
assert.equal(
  await page.locator(".kpi").nth(2).locator("b").innerText(),
  "14.10",
);
await page.setViewportSize({ width: 390, height: 844 });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.screenshot({ path: "work/results-mobile.png", fullPage: true });
assert.deepEqual(await axe(), []);
await page
  .getByRole("button", { name: "Start New Report", exact: true })
  .click();
await page.setViewportSize({ width: 1440, height: 1000 });
await page
  .getByRole("button", { name: "Build your workbook", exact: false })
  .click();
await page
  .getByRole("button", { name: "Custom Workbook", exact: false })
  .click();
for (let i = 0; i < 4; i++)
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
await page
  .getByRole("button", { name: "Generate blank workbook", exact: true })
  .click();
await page.getByRole("link", { name: "Download blank workbook" }).waitFor();
await page
  .getByRole("button", { name: "Generate sample workbook", exact: true })
  .click();
await page.getByRole("button", { name: "Analyze this sample now →" }).waitFor();
await page.getByRole("button", { name: "Analyze this sample now →" }).click();
await page
  .getByRole("heading", { name: "Choose your report columns." })
  .waitFor();
await page
  .getByRole("button", { name: "Start New Report", exact: true })
  .click();
for (const name of ["Quick Guide", "Our Story"]) {
  await page.locator("nav").getByRole("button", { name, exact: true }).click();
  const n = name === "Quick Guide" ? 8 : 6;
  for (let i = 0; i < n - 1; i++)
    await page.getByRole("button", { name: "Next →", exact: true }).click();
  await page.getByRole("button", { name: "Return to workspace" }).click();
}
await page.emulateMedia({ reducedMotion: "reduce" });
await page
  .locator("nav")
  .getByRole("button", { name: "Watch Demo", exact: true })
  .click();
assert.equal(await page.locator("dialog iframe").count(), 0);
await page.keyboard.press("Escape");
assert.equal(
  await page.evaluate(() => localStorage.length + sessionStorage.length),
  0,
);
assert.deepEqual(errors, []);
assert.deepEqual(external, []);
console.log(
  "PASS browser: homepage/mobile/axe, sample 2000, manual overrides, two groups, XLSX roundtrip/reopen parity, CSV locale, all analytics tabs, AI outage, mocked transport grounding/PDF/updated Excel/chat, reset, email popup, Builder, guide/story, reduced motion, no external requests/storage.",
);
await browser.close();
