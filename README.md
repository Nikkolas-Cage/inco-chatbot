# Inco AI

Fast local open-weight chatbot for **thenionic** (Nico Guarnes).

## Model

Default: **`qwen2.5:1.5b`** via [Ollama](https://ollama.com).

```bash
# smaller / faster
INCO_MODEL=qwen2.5:0.5b docker compose up -d --build
```

## Docker (recommended)

```bash
cd /path/to/inco-ai
docker compose up -d --build
# first boot pulls the model into the ollama volume — can take a few minutes

curl http://127.0.0.1:8787/health
```

Services:
- **inco** → `http://127.0.0.1:8787` (API)
- **ollama** → `http://127.0.0.1:11434`

Stop: `docker compose down`  
Wipe models: `docker compose down -v`

Point thenionic at it:

```bash
# thenionic .env.local
INCO_AI_URL=http://127.0.0.1:8787
```

## Local (without Docker)

```bash
brew install ollama
ollama serve
npm run pull
npm start
# → http://127.0.0.1:8787
```

## API

`POST /v1/chat`

```json
{
  "messages": [
    { "role": "user", "content": "What does Nico build?" }
  ]
}
```

Health: `GET /health`

## thenionic integration

The portfolio server calls Inco first at `INCO_AI_URL`. If Inco is down, thenionic falls back and logs the miss to admin inquiries.
