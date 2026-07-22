# TrustTim — AI customer-care assistant for Hanoi Heart Hospital

**TrustTim answers patients' logistics questions (BHYT insurance, procedures, booking) strictly
from official hospital information, and detects real cardiac emergencies to route them to
emergency care instead of answering.**

**Live URL:** https://trusttim-by-bananaphil.vercel.app/

Team BananaPhil · Vietnam AI Innovation Challenge 2026 (VAIC 2026).

---

## Problem + requirement coverage

Hanoi Heart Hospital needs an AI customer-care assistant that answers FAQs, integrates with
booking, never hallucinates, escalates real emergencies, and is deployment-ready. Coverage:

| Brief requirement                                                 | Where it's implemented                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FAQ answering (BHYT, procedures, hospital info, doctor schedules) | Hybrid RAG pipeline — [`lib/rag/retrieve.ts`](lib/rag/retrieve.ts), [`lib/rag/rerank.ts`](lib/rag/rerank.ts), [`lib/rag/generate.ts`](lib/rag/generate.ts), over the curated KB in [`hackathon_docs/kb/`](hackathon_docs/kb/)                             |
| Booking integration                                               | [`lib/booking/mock-data.ts`](lib/booking/mock-data.ts) + [`app/api/booking/route.ts`](app/api/booking/route.ts); booking CTA attached whenever `booking` is a matched intent — [`lib/chat/pipeline.ts`](lib/chat/pipeline.ts)                             |
| Conversational experience                                         | [`app/page.tsx`](app/page.tsx) — chat widget with distinct UI states per response type                                                                                                                                                                    |
| Grounded / no-hallucination, "I don't know"                       | Grounding gate in [`lib/rag/rerank.ts`](lib/rag/rerank.ts) (relevance threshold) + [`lib/scope/responses.ts`](lib/scope/responses.ts) `GROUNDING_GATE_MESSAGE`; citations in every grounded answer                                                        |
| Emergency detection & escalation                                  | [`lib/emergency/`](lib/emergency/) — `classify.ts` (severity classifier), `responses.ts` (fixed escalation copy), `case.ts` (mocked support case); runs **before** everything else in [`lib/chat/pipeline.ts`](lib/chat/pipeline.ts), fails safe on error |
| Deployment readiness                                              | [`Dockerfile`](Dockerfile); all model endpoints env-swappable via [`.env.example`](.env.example)                                                                                                                                                          |

---

## Architecture

```
Browser (Next.js chat widget, VI)
        │  chat message + history
        ▼
/api/chat  — orchestration (lib/chat/pipeline.ts)
        │
        ├─ OpenAI (chat/completions LLM)
        │    · gpt-4.1-mini           (generation + severity/intent classifiers + query rewrite)
        │
        ├─ FPT AI Factory (embeddings + rerank, VN/JP region, pay-as-you-go)
        │    · vietnamese-embedding   (dense retrieval)
        │    · bge-reranker-v2-m3     (rerank)
        │
        ├─ pgvector / Postgres on Supabase (our own store) — kb_chunks: content + metadata + dense vector + tsvector
        │
        └─ Mock booking service — /api/booking
```

**The pipeline** (order matters — safety runs first, [full detail](ARCHITECTURE.md)):

1. Normalize the query via the VI synonym/abbreviation dictionary.
2. **Summarize prior conversation turns** into short context (skipped on the first message) —
   feeds the guardrails, retrieval, and generation steps below.
3. **Symptom & emergency guardrail** (`gpt-4.1-mini` severity classifier) — `serious` → fixed
   escalation + mocked support case; `normal` → fixed "can't examine, please book" redirect; both
   skip everything else. **Fails safe**: a classifier error shows the safety notice, never
   silently continues.
4. **Intent & scope guardrail** — multi-label over 5 intents; no match → fixed default response.
5. **Rewrite the query** into formal medical/administrative Vietnamese (the reranker responds far
   better to formal phrasing than colloquial) — only for informational intents; fails soft to the
   dictionary-expanded query on error.
6. **Hybrid retrieve** (only for informational intents): dense (pgvector) ⊕ keyword (FTS), fused
   via RRF, soft-filtered to the matched intents.
7. **Rerank** (`bge-reranker-v2-m3`) → grounding gate — no confident candidate → "I don't know."
8. **Generate** (`gpt-4.1-mini`) grounded answer with citations.
9. **Booking action** — attached whenever `booking` is a matched intent, alone or alongside the
   informational answer.

**Key tunable constants** (real values, not estimates):

| Constant | Value | Where | Controls |
|---|---|---|---|
| `POOL_SIZE` | 20 | `lib/rag/retrieve.ts` | Candidates pulled per arm (dense and keyword each return up to 20, independently, before fusion) |
| `RRF_K` | 60 | `lib/rag/retrieve.ts` | Reciprocal Rank Fusion's damping constant |
| `TOP_K` | 5 | `lib/rag/rerank.ts` | Chunks kept after reranking — what actually reaches the LLM prompt |
| `RELEVANCE_THRESHOLD` | 0.2 | `lib/rag/rerank.ts` | Grounding-gate cutoff on the reranker's relevance score |

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full map and
[`hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md`](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md)
for the complete blueprint this implementation follows.

**The product doesn't work without AI because** the three jobs at its core — classifying a
message's medical urgency, understanding which of five hospital services a free-form Vietnamese
question maps to, and answering only from retrieved, cited context while refusing to guess — all
require language understanding no fixed rule set can provide; the guardrails and grounding gate
supervise the model, but the model is what makes the routing and answering possible at all.

---

## Data pipeline (building the knowledge base)

The chat pipeline above only *retrieves* from `kb_chunks` — this is how content actually gets into
that table. Four standalone Python tools (own deps/env, each with its own README) turn the live
hospital website and scanned PDFs into retrievable chunks:

```
Website  ──(crawl)──┐
Hospital PDFs ───────┤
                     ▼
              S3 (raw zone)
                     │  clean text / vision-LLM OCR for scanned pages
                     ▼
              S3 (cleaned markdown + sidecar)
                     │  structure-aware chunk (~500 tokens, ~100 overlap)
                     ▼
              S3 (chunk JSONL)
                     │  embed (FPT vietnamese-embedding) + upsert
                     ▼
              kb_chunks (pgvector, Supabase)
```

| Stage | Tool | What it does |
|---|---|---|
| **Crawl** | [`crawler/`](crawler/README.md) | crawl4ai + Playwright deep-crawls the hospital site (renders JS-heavy pages), strips nav/boilerplate, writes clean markdown + a provenance sidecar to S3. |
| **Extract** | [`pdf_ingest/`](pdf_ingest/README.md) | Native-text PDFs → `pymupdf4llm` straight to markdown. Scanned PDFs → vision-LLM OCR (`gpt-4.1-mini`, one call per page, run concurrently). We tried a classical line-recognizer OCR first — it produced ~60% garbage on these multi-column price tables (it can't reconstruct table structure); a vision model reads the whole page's layout and Vietnamese diacritics holistically and returns a clean markdown table instead. |
| **Chunk** | [`chunking/`](chunking/README.md) | Structure-aware recursive splitting: table sections repeat the section title + column-header row on **every** chunk (a price row is meaningless without its header), prose sections split paragraph→line→sentence with token-budget + overlap packing. |
| **Embed + upsert** | [`kb_ingest/`](kb_ingest/README.md) | Embeds each chunk (FPT `vietnamese-embedding`, `input_type=passage`) and upserts into the same `kb_chunks` table the hand-curated KB uses. |

**Two ways content enters `kb_chunks`**, both safe to run side by side (disjoint id prefixes, same
`on conflict … do update` upsert semantics):
- **Hand-curated**: [`hackathon_docs/kb/*.md`](hackathon_docs/kb/) → `npm run ingest` (see below).
- **Crawled / scanned-PDF-derived**: the four tools above, run independently via `uv run`.

---

## How AI is used

**In-product:**

- RAG grounding — dense + keyword hybrid retrieval, reranked, generation constrained to retrieved
  context only ([`lib/rag/`](lib/rag/)).
- Emergency guardrail — an LLM classifier is the sole severity detector, fail-safe on error
  ([`lib/emergency/classify.ts`](lib/emergency/classify.ts)).
- Intent & scope guardrail — multi-label LLM classifier with a deterministic dictionary
  pass-through for the clear-cut cases ([`lib/scope/classify.ts`](lib/scope/classify.ts)).
- Conversation-history summarization — condenses prior turns into short context for follow-up
  messages, fails soft (never blocks the safety guardrail) on error
  ([`lib/chat/summarize.ts`](lib/chat/summarize.ts)).
- Query rewrite — formalizes colloquial Vietnamese into the terminology the reranker responds to,
  fails soft to the dictionary-expanded query on error ([`lib/rag/rewrite.ts`](lib/rag/rewrite.ts)).

**To build:** this repository's `hackathon_docs/guide/` documents the architecture and
implementation spec that was handed to the coding agent (Cursor) to build the app in
[`lib/`](lib/) and [`app/`](app/) from — the docs-to-code handoff is itself the AI-collaboration
artifact for this project.

---

## How to run + deploy

### Local

```bash
npm install
cp .env.example .env   # fill in OPENAI_API_KEY, API_KEY (FPT), and DATABASE_URL (Supabase)
npm run db:setup        # creates the pgvector extension + kb_chunks table + indexes
npm run ingest           # embeds hackathon_docs/kb/*.md + rules.json into pgvector
npm run dev
```

`npm run ingest` only loads the **hand-curated** KB (`hackathon_docs/kb/`). To (re)build the
knowledge base from the live site or scanned PDFs instead, see [Data pipeline](#data-pipeline-building-the-knowledge-base)
above — each tool has its own setup/run/test instructions in its README.

Database is **Supabase Postgres** — grab the connection string from Supabase Dashboard >
Project > Connect > **Session pooler** (port 5432; supports the prepared statements `pg` uses).
`npm run db:setup` runs `create extension if not exists vector`, so you don't need to enable
pgvector by hand first. Connections to any non-`localhost` host get TLS automatically
([`lib/db/client.ts`](lib/db/client.ts)).

Open http://localhost:3000.

### Checks

```bash
npm run selfcheck   # offline: RRF fusion, normalization, envelope unwrap, Zod, fail-safe path, history-summary fail-soft path
npm run eval          # live: emergency recall, scope accuracy, retrieval recall/precision, cost — writes RESULTS.md
npm run eval:dump     # live: dumps per-query pipeline traces (retrieved/reranked chunk ids, context, answer) for rag_eval/
```

`eval:dump` feeds a deeper, separate scoring pass — see [RAG eval (RAGAS)](#rag-eval-ragas) below.

### Deploy

- **Demo:** push to Vercel (push-to-deploy). Set the env vars from `.env.example` in the project
  settings.
- **On-prem / hospital-controlled infra:** `docker build -t trusttim .` — the same image runs
  anywhere; model endpoints stay env-swappable (`API_BASE_URL`/`API_KEY`/`LLM_MODEL`/
  `EMBEDDING_MODEL`/`RERANKER_MODEL`), so moving to dedicated FPT capacity or on-prem GPU is a
  config change, not a rewrite.

---

## Safety & grounding behavior

- **Emergency escalation:** a `serious` severity verdict returns a fixed, doctor-drafted message
  (call 115 / nearest Emergency Dept) and raises a mocked support case — the LLM never
  free-generates in this path.
- **Fail-safe:** if the severity classifier itself errors or times out, TrustTim shows the safety
  notice rather than silently continuing — safety never depends on a successful model call.
- **Normal-symptom redirect:** a mentioned-but-not-emergency symptom gets a fixed "cannot
  examine/diagnose, please book" redirect — never answered medically.
- **Grounding gate:** an in-scope question with no confident retrieved context gets "I don't
  know → official channels," distinct from the out-of-scope decline.
- **Citations:** every grounded answer lists the source chunks it was given, including an
  `is_synthetic`/`freshness` caveat for illustrative or time-boxed data (e.g. the doctor-schedule
  weekly snapshot).

---

## Eval results

See [`RESULTS.md`](RESULTS.md) (generated by `npm run eval`) for emergency-recall, scope-accuracy,
retrieval recall/precision, and cost/latency numbers measured against the held-out sets in
[`data/eval/`](data/eval/).

---

## RAG eval (RAGAS)

`npm run eval`'s retrieval check is binary (did any expected chunk show up, yes/no). A second,
deeper pass — standalone Python tool [`rag_eval/`](rag_eval/README.md), independent of the app —
scores the same golden set (now with ground-truth answers:
[`data/eval/golden-answers.json`](data/eval/golden-answers.json)) with graded metrics:

- **Retrieval** (pure Python, no LLM): Recall@k, Precision@k, MRR, nDCG@k — on the fused RRF pool
  and on the reranked top-5 (the actual context the LLM sees).
- **Answer quality** (RAGAS, judge = `gpt-5.5`):
  faithfulness, answer relevance, context precision, context recall.
- **Citation correctness** (custom): are the chunks TrustTim cited actually the labeled-relevant
  ones?

It can't score against the live chat API — that route deliberately returns no chunk ids, scores,
or context (see [Architecture](#architecture)). Instead, `npm run eval:dump` runs the real pipeline
stages (retrieve → rerank → generate) over the golden set and writes one JSON trace per case to
`data/eval/runs/latest.jsonl`; `rag_eval/eval.py` reads that and writes `rag_eval/RAG-EVAL-RESULTS.md`.
Full instructions in [`rag_eval/README.md`](rag_eval/README.md).

---

## Privacy posture + tech stack

TrustTim stores no patient PII, is stateless (history lives only in the client request), and its
knowledge base is public/hospital-provided content only.

**Stack:** Next.js (App Router) + TypeScript, Tailwind, `pg` + pgvector on **Supabase** Postgres,
Zod for structured-output validation, `gpt-4.1-mini` on OpenAI (generation + classifiers +
rewrite) and `vietnamese-embedding` + `bge-reranker-v2-m3` on **FPT AI Factory** (Vietnam/Japan data
centers, retrieval only), Docker for on-prem readiness. The offline data pipeline (see
[Data pipeline](#data-pipeline-building-the-knowledge-base)) is separate: Python + `uv`, crawl4ai/
Playwright, PyMuPDF, boto3.

## Known simplifications (roadmap)

- Structured BHYT/procedure rules are ingested as retrievable KB chunks rather than a bespoke
  slot-filling rule engine (`lib/rag/rules.ts`) — the spec doesn't define how to extract rule
  conditions from free text, and the reranker already generalizes over prose and rules alike.
- FPT chat/completions calls are non-streaming (the response envelope + SSE shape are
  under-documented — see `hackathon_docs/guide/TrustTim_Implementation-Spec.md` §7); the UI does a
  client-side typewriter reveal instead of real token streaming.
- Doctor-schedule and pricing content is a dated snapshot (see `freshness` metadata in
  `hackathon_docs/kb/doctor_schedule.md`) — production needs a live feed or a routine refresh.
