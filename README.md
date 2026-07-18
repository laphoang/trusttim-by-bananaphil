# TrustTim — AI customer-care assistant for Hanoi Heart Hospital

**TrustTim answers patients' logistics questions (BHYT insurance, procedures, booking) strictly
from official hospital information, and detects real cardiac emergencies to route them to
emergency care instead of answering.**

**Live URL:** _not yet deployed — see [How to run + deploy](#how-to-run--deploy) below._

Team BananaPhil · Vietnam AI Innovation Challenge 2026 (VAIC 2026).

---

## Problem + requirement coverage

Hanoi Heart Hospital needs an AI customer-care assistant that answers FAQs, integrates with
booking, never hallucinates, escalates real emergencies, and is deployment-ready. Coverage:

| Brief requirement | Where it's implemented |
|---|---|
| FAQ answering (BHYT, procedures, hospital info, doctor schedules) | Hybrid RAG pipeline — [`lib/rag/retrieve.ts`](lib/rag/retrieve.ts), [`lib/rag/rerank.ts`](lib/rag/rerank.ts), [`lib/rag/generate.ts`](lib/rag/generate.ts), over the curated KB in [`hackathon_docs/kb/`](hackathon_docs/kb/) |
| Booking integration | [`lib/booking/mock-data.ts`](lib/booking/mock-data.ts) + [`app/api/booking/route.ts`](app/api/booking/route.ts); booking CTA attached whenever `booking` is a matched intent — [`lib/chat/pipeline.ts`](lib/chat/pipeline.ts) |
| Conversational experience | [`app/page.tsx`](app/page.tsx) — chat widget with distinct UI states per response type |
| Grounded / no-hallucination, "I don't know" | Grounding gate in [`lib/rag/rerank.ts`](lib/rag/rerank.ts) (relevance threshold) + [`lib/scope/responses.ts`](lib/scope/responses.ts) `GROUNDING_GATE_MESSAGE`; citations in every grounded answer |
| Emergency detection & escalation | [`lib/emergency/`](lib/emergency/) — `classify.ts` (severity classifier), `responses.ts` (fixed escalation copy), `case.ts` (mocked support case); runs **before** everything else in [`lib/chat/pipeline.ts`](lib/chat/pipeline.ts), fails safe on error |
| Deployment readiness | [`Dockerfile`](Dockerfile); all model endpoints env-swappable via [`.env.example`](.env.example) |

---

## Architecture

```
Browser (Next.js chat widget, VI)
        │
        ▼
/api/chat  — orchestration (lib/chat/pipeline.ts)
        │
        ├─ FPT AI Factory (one OpenAI-compatible API, VN/JP region, pay-as-you-go)
        │    · gpt-oss-20b            (generation + severity/intent classifiers)
        │    · vietnamese-embedding   (dense retrieval)
        │    · bge-reranker-v2-m3     (rerank)
        │
        ├─ pgvector / Postgres (our own store) — kb_chunks: content + metadata + dense vector + tsvector
        │
        └─ Mock booking service — /api/booking
```

**The pipeline** (order matters — safety runs first, [full detail](ARCHITECTURE.md)):

1. Normalize the query via the VI synonym/abbreviation dictionary.
2. **Symptom & emergency guardrail** (`gpt-oss-20b` severity classifier) — `serious` → fixed
   escalation + mocked support case; `normal` → fixed "can't examine, please book" redirect; both
   skip everything else. **Fails safe**: a classifier error shows the safety notice, never
   silently continues.
3. **Intent & scope guardrail** — multi-label over 5 intents; no match → fixed default response.
4. **Hybrid retrieve** (only for informational intents): dense (pgvector) ⊕ keyword (FTS), fused
   via RRF, soft-filtered to the matched intents.
5. **Rerank** (`bge-reranker-v2-m3`) → grounding gate — no confident candidate → "I don't know."
6. **Generate** (`gpt-oss-20b`) grounded answer with citations.
7. **Booking action** — attached whenever `booking` is a matched intent, alone or alongside the
   informational answer.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full map and
[`hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md`](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md)
for the complete blueprint this implementation follows.

**The product doesn't work without AI because** the three jobs at its core — classifying a
message's medical urgency, understanding which of five hospital services a free-form Vietnamese
question maps to, and answering only from retrieved, cited context while refusing to guess — all
require language understanding no fixed rule set can provide; the guardrails and grounding gate
supervise the model, but the model is what makes the routing and answering possible at all.

---

## How AI is used

**In-product:**
- RAG grounding — dense + keyword hybrid retrieval, reranked, generation constrained to retrieved
  context only ([`lib/rag/`](lib/rag/)).
- Emergency guardrail — an LLM classifier is the sole severity detector, fail-safe on error
  ([`lib/emergency/classify.ts`](lib/emergency/classify.ts)).
- Intent & scope guardrail — multi-label LLM classifier with a deterministic dictionary
  pass-through for the clear-cut cases ([`lib/scope/classify.ts`](lib/scope/classify.ts)).

**To build:** this repository's `hackathon_docs/guide/` documents the architecture and
implementation spec that was handed to the coding agent (Cursor) to build the app in
[`lib/`](lib/) and [`app/`](app/) from — the docs-to-code handoff is itself the AI-collaboration
artifact for this project.

---

## How to run + deploy

### Local

```bash
npm install
cp .env.example .env   # fill in API_KEY (FPT AI Factory) and DATABASE_URL (pgvector-enabled Postgres)
npm run db:setup        # creates the kb_chunks table + indexes
npm run ingest           # embeds hackathon_docs/kb/*.md + rules.json into pgvector
npm run dev
```

Open http://localhost:3000.

### Checks

```bash
npm run selfcheck   # offline: RRF fusion, normalization, envelope unwrap, Zod, fail-safe path
npm run eval          # live: emergency recall, scope accuracy, retrieval recall/precision, cost — writes RESULTS.md
```

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

## Privacy posture + tech stack

TrustTim stores no patient PII, is stateless (history lives only in the client request), its
knowledge base is public/hospital-provided content only, and all inference runs on **FPT AI
Factory** (Vietnam/Japan data centers) rather than a foreign vendor.

**Stack:** Next.js (App Router) + TypeScript, Tailwind, `pg` + pgvector on Postgres, Zod for
structured-output validation, `gpt-oss-20b` + `vietnamese-embedding` + `bge-reranker-v2-m3` on FPT
AI Factory behind one OpenAI-compatible client, Docker for on-prem readiness.

## Known simplifications (roadmap)

- Structured BHYT/procedure rules are ingested as retrievable KB chunks rather than a bespoke
  slot-filling rule engine (`lib/rag/rules.ts`) — the spec doesn't define how to extract rule
  conditions from free text, and the reranker already generalizes over prose and rules alike.
- No multi-turn conversation memory yet — each turn is classified/retrieved independently. The
  architecture guide's "minimal history" design is the next increment.
- FPT chat/completions calls are non-streaming (the response envelope + SSE shape are
  under-documented — see `hackathon_docs/guide/TrustTim_Implementation-Spec.md` §7); the UI does a
  client-side typewriter reveal instead of real token streaming.
- Doctor-schedule and pricing content is a dated snapshot (see `freshness` metadata in
  `hackathon_docs/kb/doctor_schedule.md`) — production needs a live feed or a routine refresh.
