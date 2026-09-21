#!/bin/sh
set -eu

OLLAMA_URL="${OLLAMA_URL:-http://ollama:11434}"
MODEL="${INCO_MODEL:-qwen2.5:1.5b}"

echo "> Inco AI waiting for Ollama at ${OLLAMA_URL}"
i=0
until curl -fsS "${OLLAMA_URL}/api/tags" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then
    echo "! Ollama not reachable after ~3m — starting anyway"
    break
  fi
  sleep 2
done

# Pull model via Ollama HTTP API (no ollama CLI needed in this image)
if curl -fsS "${OLLAMA_URL}/api/tags" >/dev/null 2>&1; then
  echo "> Ensuring model ${MODEL}"
  curl -fsS "${OLLAMA_URL}/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${MODEL}\",\"stream\":false}" >/dev/null || \
    echo "! Model pull skipped / failed — chat may 502 until model exists"
fi

echo "> Starting Inco AI on ${INCO_HOST:-0.0.0.0}:${INCO_PORT:-8787}"
exec node server.js
