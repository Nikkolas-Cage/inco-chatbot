/**
 * Inco AI — local open-weight assistant for thenionic.
 * Speaks to Ollama (default model: qwen2.5:1.5b).
 * Docker: INCO_HOST=0.0.0.0 OLLAMA_URL=http://ollama:11434
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.INCO_PORT) || 8787;
const HOST = process.env.INCO_HOST || "127.0.0.1";
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(
  /\/$/,
  "",
);
const MODEL = process.env.INCO_MODEL || "qwen2.5:1.5b";

const knowledgePath = path.join(__dirname, "knowledge", "thenionic.md");
const KNOWLEDGE = fs.readFileSync(knowledgePath, "utf8");

const SYSTEM = `${KNOWLEDGE}

Respond as Inco AI only. Prefer concrete thenionic facts from the brief above.`;

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 48_000) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-10)
    .map((m) => ({
      role: m.role,
      content: String(m.content || "").trim().slice(0, 1200),
    }))
    .filter((m) => m.content);
}

async function ollamaChat(messages) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 220,
      },
      messages: [{ role: "system", content: SYSTEM }, ...messages],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`ollama_${res.status}:${err.slice(0, 180)}`);
  }

  const data = await res.json();
  const text = data?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("ollama_empty");
  }
  return text.trim();
}

async function ollamaAlive() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { ok: false, models: [] };
    const data = await res.json();
    const models = Array.isArray(data.models)
      ? data.models.map((m) => m.name)
      : [];
    return { ok: true, models };
  } catch {
    return { ok: false, models: [] };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 204, { ok: true });
  }

  if (req.method === "GET" && req.url === "/health") {
    const ollama = await ollamaAlive();
    const hasModel = ollama.models.some(
      (n) => n === MODEL || n.startsWith(`${MODEL}:`) || n.startsWith("qwen2.5:1.5b"),
    );
    return send(res, ollama.ok ? 200 : 503, {
      ok: ollama.ok,
      name: "Inco AI",
      model: MODEL,
      ollama: OLLAMA_URL,
      modelReady: hasModel,
      models: ollama.models,
    });
  }

  if (req.method === "POST" && (req.url === "/v1/chat" || req.url === "/chat")) {
    const started = Date.now();
    try {
      const body = await readJson(req);
      const messages = normalizeMessages(body.messages);
      if (!messages.length) {
        return send(res, 400, { ok: false, error: "empty_messages" });
      }
      const reply = await ollamaChat(messages);
      return send(res, 200, {
        ok: true,
        reply: reply.slice(0, 1600),
        provider: "inco",
        model: MODEL,
        ms: Date.now() - started,
      });
    } catch (err) {
      console.error("[inco]", err.message || err);
      return send(res, 502, {
        ok: false,
        error: "inco_unavailable",
        detail: String(err.message || err).slice(0, 200),
        model: MODEL,
        hint:
          "Start Ollama (`ollama serve`) and run `npm run pull` in the inco-ai folder.",
      });
    }
  }

  send(res, 404, { ok: false, error: "not_found" });
});

server.listen(PORT, HOST, () => {
  console.log(`> Inco AI on http://${HOST}:${PORT}`);
  console.log(`> model ${MODEL} via ${OLLAMA_URL}`);
  console.log(`> health  GET /health`);
  console.log(`> chat    POST /v1/chat`);
});
