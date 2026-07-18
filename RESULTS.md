# TrustTim — Eval Results

**Not yet run.** Missing env vars: API_BASE_URL, API_KEY, LLM_MODEL, EMBEDDING_MODEL, RERANKER_MODEL, DATABASE_URL.

Copy `.env.example` to `.env`, fill in the FPT AI Factory key and a pgvector-enabled
`DATABASE_URL`, run `npm run db:setup && npm run ingest`, then `npm run eval`.
