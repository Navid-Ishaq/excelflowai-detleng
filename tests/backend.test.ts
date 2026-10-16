import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { initialConfig, type Source } from "../src/domain";
import { prepare, makePayload } from "../src/engine";
test(
  "backend health, origin, validation, payload limits, missing-key outage and rate limit",
  { timeout: 25000 },
  async () => {
    const port = 18000 + Math.floor(Math.random() * 1000);
    const child = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "server/index.ts"],
      {
        env: {
          ...process.env,
          PORT: String(port),
          OPENAI_API_KEY: "",
          ALLOWED_ORIGIN: "http://127.0.0.1:5180",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let log = "";
    child.stdout.on("data", (b) => (log += String(b)));
    child.stderr.on("data", (b) => (log += String(b)));
    try {
      for (let i = 0; i < 100 && !log.includes("backend ready"); i++)
        await new Promise((r) => setTimeout(r, 100));
      assert.match(log, /backend ready/);
      const base = `http://127.0.0.1:${port}`;
      assert.equal(
        (await (await fetch(base + "/api/health")).json()).aiConfigured,
        false,
      );
      const s: Source = {
        name: "test.csv",
        header: 0,
        sheet: "Data",
        sheets: ["Data"],
        rows: [
          ["Amount", "Currency"],
          [10, "EUR"],
          [-3, "EUR"],
        ],
      };
      const d = prepare(s, {
        ...initialConfig(),
        selected: [0, 1],
        mapping: { Amount: 0, Currency: 1 },
      });
      const payload = makePayload(d, d.records, "EUR", "English", 1);
      const post = (body: unknown, origin = "http://127.0.0.1:5180") =>
        fetch(base + "/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: origin },
          body: JSON.stringify(body),
        });
      assert.equal(
        (await post({ payload }, "https://untrusted.invalid")).status,
        403,
      );
      assert.equal(
        (await post({ payload: { ...payload, currency: "USD" } })).status,
        400,
      );
      assert.equal((await post({ payload })).status, 503);
      assert.equal(
        (await post({ payload, padding: "x".repeat(350000) })).status,
        413,
      );
      for (let i = 0; i < 3; i++)
        assert.equal((await post({ payload })).status, 503);
      assert.equal((await post({ payload })).status, 429);
      assert.ok(!log.includes("test.csv"));
    } finally {
      child.kill();
    }
  },
);
