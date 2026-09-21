# Inco AI

Fast open-weight chatbot for **[thenionic](https://thenionic.com)** (Nico Guarnes).  
API wrapper around [Ollama](https://ollama.com) · default model **`qwen2.5:1.5b`**.

Public API (when running): **`http://HOST:8787`**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Ready check |
| `POST` | `/v1/chat` | Chat |

---

## One command run (Docker)

**Requires:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose).

```bash
git clone https://github.com/Nikkolas-Cage/inco-chatbot.git && cd inco-chatbot && docker compose up -d --build
```

That one command clones, builds, starts Inco + Ollama, and publishes **`:8787`**. First boot pulls the model (a few minutes). Then:

```bash
curl http://127.0.0.1:8787/health
```

You should see `"ok":true` and `"modelReady":true`.

| Service | Port | Public? |
|---------|------|---------|
| **Inco API** | **8787** | **Yes — expose this** |
| Ollama | 11434 | Internal only (not published) |

Stop:

```bash
docker compose down
```

Wipe model cache:

```bash
docker compose down -v
```

### Smaller / faster model

```bash
INCO_MODEL=qwen2.5:0.5b docker compose up -d --build
```

### Custom host port

```bash
# map host 8080 → container 8787
INCO_PUBLISH_PORT=8080 docker compose up -d --build
curl http://127.0.0.1:8080/health
```

---

## Deploy publicly

Inco listens on **`0.0.0.0:8787`** inside Docker. Point your host / reverse proxy / cloud port at **8787** (or `INCO_PUBLISH_PORT`).

### VPS (recommended)

```bash
git clone https://github.com/Nikkolas-Cage/inco-chatbot.git && cd inco-chatbot && docker compose up -d --build
# open firewall (example): ufw allow 8787/tcp
```

Put HTTPS in front (Caddy / Nginx / Cloudflare Tunnel), e.g. `https://inco.yourdomain.com` → `127.0.0.1:8787`.

### Environment

| Variable | Default | Notes |
|----------|---------|--------|
| `PORT` / `INCO_PORT` | `8787` | Listen port inside the container |
| `INCO_HOST` | `0.0.0.0` | Bind all interfaces (required for public) |
| `INCO_PUBLISH_PORT` | `8787` | Host port published by Compose |
| `OLLAMA_URL` | `http://ollama:11434` | Internal Ollama service |
| `INCO_MODEL` | `qwen2.5:1.5b` | Ollama model tag |
| `CORS_ORIGIN` | `*` | Optional allowlist (comma-separated) |

Copy `.env.example` → `.env` if you want local overrides.

### thenionic

```bash
# thenionic .env / production
INCO_AI_URL=https://inco.yourdomain.com
# or local:
# INCO_AI_URL=http://127.0.0.1:8787
```

---

## API

### `GET /health`

```json
{
  "ok": true,
  "name": "Inco AI",
  "model": "qwen2.5:1.5b",
  "modelReady": true
}
```

### `POST /v1/chat`

```bash
curl -s http://127.0.0.1:8787/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"What does Nico build?"}]}'
```

```json
{
  "ok": true,
  "reply": "...",
  "provider": "inco",
  "model": "qwen2.5:1.5b",
  "ms": 420
}
```

---

## Local (no Docker)

```bash
brew install ollama   # or https://ollama.com/download
ollama serve
ollama pull qwen2.5:1.5b
npm start
# → http://127.0.0.1:8787
```

For LAN / public bind without Docker:

```bash
INCO_HOST=0.0.0.0 INCO_PORT=8787 npm start
```

---

## Repo layout

```
Dockerfile            # Inco Node API
docker-compose.yml    # ollama + inco (one command)
docker-entrypoint.sh  # wait for Ollama, pull model, start
server.js             # HTTP API
knowledge/thenionic.md
```

MIT-ready for personal portfolio use. Keep Ollama off the public internet — only expose **Inco :8787**.
