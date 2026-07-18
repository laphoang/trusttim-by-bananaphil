# TrustTim app image — deployment-readiness story (Architecture guide §10). Model inference stays
# on FPT AI Factory (or dedicated FPT/on-prem GPU) regardless of where this image runs; all model
# endpoints are env-swappable (API_BASE_URL/API_KEY/LLM_MODEL/EMBEDDING_MODEL/RERANKER_MODEL).
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
