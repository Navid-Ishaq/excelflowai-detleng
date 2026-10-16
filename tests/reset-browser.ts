import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const base = process.env.EF_BASE_URL || "http://127.0.0.1:5180";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const p = await b.newPage();
try {
  fs.mkdirSync("work", { recursive: true });
  fs.writeFileSync(
    "work/reset.csv",
    "Date,Amount,Currency\n2026-01-01,20,EUR\n2026-01-02,-5,EUR",
  );
  await p.goto(base);
  await p
    .getByRole("button", { name: "Upload source file", exact: false })
    .click();
  await p.locator("input[type=file]").setInputFiles("work/reset.csv");
  await p.getByRole("heading", { name: "Where are the records?" }).waitFor();
  for (let i = 0; i < 4; i++)
    await p.getByRole("button", { name: "Continue →", exact: true }).click();
  await p.getByRole("button", { name: "Generate report →" }).click();
  await p.locator("#download-report").waitFor();
  await p.getByRole("tab", { name: "AI Insights", exact: true }).click();
  await p.route("**/api/analyze", async (route) => {
    const { payload } = route.request().postDataJSON();
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await route.fulfill({
        json: {
          sessionId: payload.sessionId,
          findings: [],
          answer: "Late response",
          metricIds: [],
          evidenceIds: [],
          language: "English",
        },
      });
    } catch {}
  });
  const request = p.waitForRequest("**/api/analyze");
  await p
    .getByRole("button", { name: "Generate AI insights", exact: true })
    .click();
  await request;
  await p
    .getByRole("button", { name: "Start New Report", exact: true })
    .click();
  await p.waitForTimeout(1200);
  assert.equal(await p.getByText("Late response", { exact: true }).count(), 0);
  assert.equal(await p.locator("#download-report").count(), 0);
  assert.ok(
    await p
      .getByRole("button", { name: "Try a sample", exact: true })
      .isVisible(),
  );
  assert.equal(
    await p.evaluate(() => localStorage.length + sessionStorage.length),
    0,
  );
  await p.route("**/*file-worker*", (route) => route.abort());
  await p
    .getByRole("button", { name: "Upload source file", exact: false })
    .click();
  await p.locator("input[type=file]").setInputFiles("work/reset.csv");
  await p.getByRole("alert").waitFor();
  assert.equal(await p.locator("[aria-busy=true]").count(), 0);
  console.log(
    "PASS stale AI response after reset, memory/storage clearing and failed worker recovery.",
  );
} finally {
  await b.close();
}
