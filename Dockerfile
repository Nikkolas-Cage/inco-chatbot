FROM node:22-alpine

WORKDIR /app

# curl for healthchecks / entrypoint wait
RUN apk add --no-cache curl

COPY package.json ./
COPY server.js ./
COPY docker-entrypoint.sh ./
COPY knowledge ./knowledge

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production \
    INCO_HOST=0.0.0.0 \
    PORT=8787 \
    INCO_PORT=8787 \
    OLLAMA_URL=http://ollama:11434 \
    INCO_MODEL=qwen2.5:1.5b \
    CORS_ORIGIN=*

EXPOSE 8787

HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=8 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8787}/health" | grep -q '"ok":true' || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
