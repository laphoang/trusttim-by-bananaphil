# TrustTim — Architecture Map

> **What this is:** a concise, root-level map of the system for fast orientation. For the full
> buildable blueprint — stack rationale, retrieval internals, build plan, cost model, risk
> register — see [`hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md`](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md)
> (the canonical, detailed source this file distills).

**Status:** docs-stage — no application code exists yet. Everything below describes the
*intended* architecture that the build plan (guide §8) will produce.

TrustTim is a **grounded, Vietnamese-first RAG chatbot** for Hanoi Heart Hospital that answers
patients' logistics questions (BHYT insurance, procedures, booking) strictly from official
hospital information, and detects genuine cardiac emergencies to route them to emergency care
instead of answering.

---

## System overview

```
Browser (Next.js chat widget, VI)
        │  chat messages + history
        ▼
/api/chat  — orchestration route handler
        │
        ├─ FPT AI Factory (one OpenAI-compatible API, VN/JP region, pay-as-you-go)
        │    · gpt-oss-20b            (generation + emergency/scope classifiers)
        │    · vietnamese-embedding   (dense retrieval)
        │    · bge-reranker-v2-m3     (rerank)
        │
        ├─ pgvector / Postgres (our own store)
        │    · KB chunks + metadata + dense vectors + keyword tsvector
        │
        └─ Mock booking service — /api/booking (seed doctors/slots, handoff CTA)
```

All model inference sits behind **one OpenAI-compatible client** pointed at FPT AI Factory
(base URL + key) — swapping models or moving to dedicated/on-prem capacity is an env-var change,
not a rewrite. The vector store is the one component we run ourselves.

---

## The chat pipeline

Order matters — safety checks run before any retrieval or generation:

1. **Normalize** the query (expand VI abbreviations/slang) + minimal history.
2. **Emergency guardrail (first).** `gpt-oss-20b` classifier, structured output. On emergency →
   fixed safe-escalation message + mocked support case, skip everything else. **Fails safe**: a
   classifier error also shows the safety notice, never silently continues.
3. **Scope guardrail.** In-scope hospital topic? If not → fixed default response, stop (no
   retrieval, no generation).
4. **Retrieve.** Hybrid: dense (embed + pgvector) ⊕ keyword/FTS + structured rules, fused via
   RRF, then reranked (`bge-reranker-v2-m3`) to a small top-k. Degrades to keyword-only if the
   embed/rerank endpoints are unavailable.
5. **Grounding gate.** No confident candidate → "I don't know" + official channels (distinct
   from the scope guardrail's refusal — see guide §6.2).
6. **Generate.** `gpt-oss-20b` answers only from the retrieved context, in Vietnamese, with
   citations.
7. **Booking handoff.** If booking intent was detected, attach mocked schedule + CTA *in
   addition to* the informational answer.
8. **Stream + log.**

Full detail: [guide §3](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#3-the-chat-pipeline-the-heart-of-the-system).

---

## Components

| Component | What it is |
|---|---|
| **Frontend** | Next.js/React chat widget — streamed answers, citation chips, distinct "I don't know" and EMERGENCY UI states. |
| **Orchestration** | `/api/chat` route handler — runs the pipeline above. |
| **Hybrid retrieval + KB** | Dense (FPT `vietnamese-embedding`) ⊕ keyword/FTS + structured rules → RRF fuse → rerank (FPT `bge-reranker-v2-m3`). |
| **FPT AI Factory models** | `gpt-oss-20b` (generation + classifiers), `vietnamese-embedding`, `bge-reranker-v2-m3` — one OpenAI-compatible client, VN/JP data centers. |
| **pgvector / Postgres** | Single `kb_chunks` table: content, metadata, dense vector, `tsvector` — hybrid retrieval is one SQL query. |
| **Mock booking service** | `/api/booking` — simulated schedule data + handoff to real hospital channels. |
| **Emergency guardrail** | Own module — sole detector, fail-safe on error, raises a mocked support case on true positives. |
| **Observability** | Structured logging (query, retrieval sources, emergency flag, tokens, latency) — feeds the demo and the required AI-collaboration log. |

Rationale/tradeoffs for each tool: [guide §4](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#4-tech-stack--tool--why--benefits--drawbacks).

---

## Tech stack at a glance

- **Next.js (App Router) + Vercel** — one TypeScript app, UI + API, push-to-deploy.
- **FPT AI Factory** — `gpt-oss-20b`, `vietnamese-embedding`, `bge-reranker-v2-m3`, all pay-as-you-go, VN/JP region.
- **pgvector on Postgres** (Supabase/Neon free tier for the demo) — vectors + keyword FTS in one datastore.
- **Vercel AI SDK** — streaming chat plumbing.
- **shadcn/ui + Tailwind + v0** — fast, accessible UI.
- **Zod** — validates structured LLM outputs (classifier verdicts).
- **Docker** — containerizes the app for the on-prem/FPT deployment-readiness story.

---

## Retrieval design in brief

The KB is human-curated, not auto-chunked: built from real knowledge-demand (what patients
actually ask), manually chunked with topic/keyword metadata, and BHYT/procedure prose converted
into explicit structured rules so even a small model reasons over them reliably. Query time:
normalize → topic route → dense + keyword arms in parallel → RRF fuse → rerank → grounding gate.
Neither retrieval arm alone is sufficient on a large Vietnamese KB — semantic catches paraphrases,
keyword/rules catch exact terms and abbreviations.

Full detail: [guide §5](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#5-knowledge--retrieval-design-guidebook-4-5-following-the-yersin-case-study).

---

## Repo layout (planned — not yet created)

```
trusttim/
├─ app/
│  ├─ page.tsx                     # chat UI (widget)
│  └─ api/{chat,booking,emergency}/route.ts
├─ lib/
│  ├─ llm/client.ts                # FPT gpt-oss-20b (OpenAI-compatible, env-swappable)
│  ├─ embeddings/client.ts         # FPT vietnamese-embedding + bge-reranker-v2-m3
│  ├─ db/schema.sql                # pgvector: kb_chunks + indexes
│  ├─ rag/{ingest,normalize,retrieve,rerank}.ts
│  ├─ emergency/{classify,responses,case}.ts
│  ├─ scope/{classify,responses}.ts
│  └─ booking/mock-data.ts
├─ data/
│  ├─ kb/*.md|*.json               # curated chunks + rules + dictionary
│  └─ eval/*.json                  # emergency / scope / faq golden sets
├─ Dockerfile
└─ README.md
```

Full detail: [guide §7](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#7-suggested-repo-structure).

---

## Key invariants

These are load-bearing — don't break them when implementing:

- **Emergency guardrail runs first, and fails safe.** No retrieval or generation happens on a
  message that might be a real emergency; a classifier error shows the safety notice, never
  silently continues.
- **Grounding gate prevents hallucination.** An in-scope question with no confident retrieved
  context gets "I don't know → official channels," never a guessed answer.
- **Scope refusal and the grounding gate are two distinct responses** — don't conflate
  out-of-scope ("not about the hospital") with in-scope-but-ungrounded ("about the hospital, but
  we don't have that information").
- **Escalate no further than needed.** Prompting + RAG only — no fine-tuning, no multi-step
  agents; there's no behavior gap that justifies either.
- **All inference stays on FPT AI Factory** (Vietnamese sovereign cloud, VN/JP), behind one
  OpenAI-compatible client — model/endpoint swaps are an env-var change.
- **The product is not the model.** The guardrails, citations, "I don't know" behavior, and
  booking handoff are what TrustTim *is* — the LLM is a supervised component inside it.

---

## Further reading

- [`hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md`](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md) — the full blueprint this file distills.
- [`hackathon_docs/guide/VAIC2026_Problem-Statement-Analysis.md`](hackathon_docs/guide/VAIC2026_Problem-Statement-Analysis.md) — locked solution scope.
- [`hackathon_docs/guide/VAIC2026_Scoring-Criteria-Guide.md`](hackathon_docs/guide/VAIC2026_Scoring-Criteria-Guide.md) — the 100-point rubric this architecture targets.
- [`hackathon_docs/problem_statement/Hanoi_heart_hospital_problem_statement.md`](hackathon_docs/problem_statement/Hanoi_heart_hospital_problem_statement.md) — the official challenge brief.
- `CLAUDE.md` — full doc index for this repo.
