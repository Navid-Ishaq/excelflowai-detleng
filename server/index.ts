import { createServer } from "node:http";
import { z } from "zod";
import { analyze } from "./agent";
import { verifyPayload } from "../src/grounding";
const allowed = new Set(
  (process.env.ALLOWED_ORIGIN || "http://127.0.0.1:5180")
    .split(",")
    .map((v) => v.trim()),
);
const attempts = new Map<string, { count: number; until: number }>();
let active = 0;
const bodySchema = z.object({
  payload: z.unknown(),
  question: z.string().max(1500).default(""),
  history: z
    .array(
      z.object({
        question: z.string().max(1500),
        answer: z.string().max(2500),
      }),
    )
    .max(4)
    .default([]),
});
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const origin = req.headers.origin;
  if (origin && !allowed.has(origin)) {
    res.writeHead(403).end();
    return;
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  const send = (status: number, value: unknown) => {
    if (!res.destroyed) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    }
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (req.url === "/api/health" && req.method === "GET") {
    send(200, {
      status: "ok",
      aiConfigured: !!process.env.OPENAI_API_KEY,
      storage: false,
    });
    return;
  }
  if (req.url !== "/api/analyze" || req.method !== "POST") {
    send(404, { error: "Not found" });
    return;
  }
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    send(415, { error: "Use JSON." });
    return;
  }
  const now = Date.now();
  for (const [key, v] of attempts) if (v.until < now) attempts.delete(key);
  const key = req.socket.remoteAddress || "unknown";
  const rate = attempts.get(key) || { count: 0, until: now + 60000 };
  if (rate.count >= 6 || active >= 4) {
    send(429, { error: "Please retry later." });
    return;
  }
  rate.count++;
  attempts.set(key, rate);
  let size = 0;
  const chunks: Buffer[] = [];
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  const timeout = setTimeout(() => controller.abort(), 85000);
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 350000) {
        send(413, { error: "Analysis context is too large." });
        return;
      }
      chunks.push(chunk);
    }
    const body = bodySchema.parse(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      ),
      rawPayload = body.payload;
    let payload;
    try {
      payload = verifyPayload(rawPayload);
    } catch {
      send(400, { error: "Invalid or unreconciled analysis context." });
      return;
    }
    if (!process.env.OPENAI_API_KEY) {
      send(503, {
        error: "AI analysis unavailable; configure the server API key.",
      });
      return;
    }
    active++;
    try {
      const result = await analyze(
        payload,
        body.question,
        body.history,
        controller.signal,
      );
      send(200, result);
    } finally {
      active--;
    }
  } catch (e) {
    send(e instanceof z.ZodError || e instanceof SyntaxError ? 400 : 502, {
      error:
        "AI analysis unavailable or invalid context; please review and retry.",
    });
  } finally {
    clearTimeout(timeout);
  }
});
server.requestTimeout = 90000;
server.headersTimeout = 15000;
const port = Number(process.env.PORT || 8787);
server.listen(port, "0.0.0.0", () =>
  console.log(
    `ExcelFlow AI backend ready on port ${port}. Request content logging is disabled.`,
  ),
);
const stop = () => {
  server.close();
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
