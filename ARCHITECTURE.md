# TrustTim — Architecture Map

> **What this is:** a concise, root-level map of the system for fast orientation. For the full
> buildable blueprint — stack rationale, retrieval internals, build plan, cost model, risk
> register — see [`hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md`](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md)
> (the canonical, detailed source this file distills).

**Status:** implemented — the Next.js app, hybrid RAG pipeline, both guardrails, mock booking, and
eval harness described below exist in this repo (see [`README.md`](README.md) for how to run it
and the requirement-coverage table). KB content, live credentials, and eval numbers still need to
be wired up/run against a real FPT AI Factory account and Postgres/pgvector instance.

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
        ├─ OpenAI (chat/completions LLM)
        │    · gpt-4.1-mini           (generation + emergency/scope classifiers + query rewrite)
        │
        ├─ FPT AI Factory (embeddings + rerank, VN/JP region, pay-as-you-go)
        │    · vietnamese-embedding   (dense retrieval)
        │    · bge-reranker-v2-m3     (rerank)
        │
        ├─ pgvector / Postgres (our own store)
        │    · KB chunks + metadata + dense vectors + keyword tsvector
        │
        └─ Mock booking service — /api/booking (seed doctors/slots, handoff CTA)
```

The LLM (`gpt-4.1-mini` on OpenAI) powers generation, classifiers, and query rewrite. Embeddings and reranking
run on **FPT AI Factory** (Vietnam/Japan data centers) — a Vietnamese sovereign cloud for retrieval.
The vector store is the one component we run ourselves (pgvector on Postgres).

---

## The chat pipeline

Order matters — safety checks run before any retrieval or generation:

1. **Normalize** the query (expand VI abbreviations/slang) + minimal history.
2. **Summarize prior conversation turns** (if any) into short context via one LLM call — skipped
   entirely on the first message (no cost). Feeds the severity/intent classifiers, the retrieval
   query, and generation below (Architecture guide's "minimal history" design). **Fails soft, not
   safe**: an error here never blocks or delays the safety guardrail that follows — degrades to no
   conversation context, exactly like retrieval's keyword-only and rerank's fusion-order fallbacks.
3. **Symptom & emergency guardrail (first).** `gpt-4.1-mini` severity classifier, structured
   output → `none | normal | serious`. `serious` → fixed safe-escalation message + mocked
   support case, skip everything else. `normal` → fixed "can't examine symptoms, please book"
   redirect + booking CTA, skip everything else (never answered medically). **Fails safe**: a
   classifier error also shows the safety notice, never silently continues.
4. **Intent & scope guardrail.** Multi-label classifier over five intents —
   `booking | bhyt_pricing | procedures | hospital_info | doctor_schedule` — plus in-scope check.
   No matched intent → fixed default response, stop (no retrieval, no generation).
5. **Rewrite the query** (only for informational intents). `gpt-4.1-mini` formalizes colloquial
   Vietnamese into the medical/administrative terminology the reranker responds to (e.g. "mổ" →
   "phẫu thuật"). Fails soft to the dictionary-expanded query — never blocks retrieval.
6. **Retrieve** (only if an informational intent is present). Hybrid: dense (embed + pgvector) ⊕
   keyword/FTS + structured rules, fused via RRF, then reranked (`bge-reranker-v2-m3`) to a small
   top-k. Degrades to keyword-only if the embed/rerank endpoints are unavailable.
7. **Grounding gate.** No confident candidate → "I don't know" + official channels (distinct
   from the intent/scope guardrail's refusal — see guide §6.2).
8. **Generate.** `gpt-4.1-mini` answers only from the retrieved context, in Vietnamese, with
   citations, addressing every intent of a multi-part question.
9. **Booking action.** If `booking` is among the matched intents, attach the appointment-creation
   link + mocked schedule *in addition to* any informational answer (or alone, skipping
   retrieval, if booking is the only intent).
10. **Stream + log.**

Full detail: [guide §3](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#3-the-chat-pipeline-the-heart-of-the-system).

---

## Data pipeline (offline)

How `kb_chunks` actually gets populated from the live site and hospital PDFs — separate from, and
upstream of, the chat pipeline above:

```
website + PDFs → S3 (raw) → clean text / vision-LLM OCR → S3 (cleaned)
               → structure-aware chunk → S3 (chunk JSONL) → embed + upsert → kb_chunks
```

| Tool | Role |
|---|---|
| [`crawler/`](crawler/README.md) | crawl4ai/Playwright deep-crawl of the hospital site → clean markdown + sidecar → S3. |
| [`pdf_ingest/`](pdf_ingest/README.md) | Native PDFs → `pymupdf4llm`; scanned PDFs → vision-LLM OCR (`gpt-4.1-mini`, concurrent per-page) → S3. |
| [`chunking/`](chunking/README.md) | Structure-aware recursive chunking of cleaned markdown → `kb_chunks`-shaped JSONL → S3. |
| [`kb_ingest/`](kb_ingest/README.md) | Embeds JSONL chunks (FPT `vietnamese-embedding`) and upserts into `kb_chunks`. |

Four standalone Python tools (own deps/env each — see their READMEs for detail this file doesn't
duplicate). Independent of the Next.js app; the only coupling is the shared `kb_chunks` table,
which this pipeline and [`lib/rag/ingest.ts`](lib/rag/ingest.ts) (the hand-curated
`hackathon_docs/kb/` path) both write to safely — disjoint id-prefix namespaces, same
`on conflict … do update` upsert semantics.

---

## Components

| Component | What it is |
|---|---|
| **Frontend** | Next.js/React chat widget — streamed answers, citation chips, distinct "I don't know", EMERGENCY, and normal-symptom-redirect UI states. |
| **Orchestration** | `/api/chat` route handler — runs the pipeline above. |
| **Conversation history summarization** | Own module — condenses prior turns into short context for this turn's classifiers/retrieval/generation; fails soft, never blocks the safety guardrail. |
| **Query rewrite** | Own module — formalizes colloquial Vietnamese into reranker-friendly terminology; fails soft to the dictionary-expanded query. |
| **Hybrid retrieval + KB** | Dense (FPT `vietnamese-embedding`) ⊕ keyword/FTS + structured rules → RRF fuse → rerank (FPT `bge-reranker-v2-m3`), scoped to four informational intents (`bhyt_pricing`/`procedures`/`hospital_info`/`doctor_schedule`). |
| **OpenAI LLM** | `gpt-4.1-mini` — generation, both classifiers (severity + intent/scope), and query rewrite. |
| **FPT AI Factory** | `vietnamese-embedding` + `bge-reranker-v2-m3` — embeddings and reranking, Vietnam/Japan data centers. |
| **pgvector / Postgres** | Single `kb_chunks` table: content, metadata, dense vector, `tsvector` — hybrid retrieval is one SQL query. |
| **Mock booking service** | `/api/booking` — appointment-creation link + simulated schedule data, handoff to real hospital channels. |
| **Symptom & emergency guardrail** | Own module — sole severity detector (`none`/`normal`/`serious`), fail-safe on error, raises a mocked support case on `serious`, redirects to booking on `normal`. |
| **Intent & scope guardrail** | Own module — multi-label classifier over the five intents; out-of-scope → fixed default response. |
| **Observability** | Structured logging (query, retrieval sources, severity/intent verdicts, tokens, latency) — feeds the demo and the required AI-collaboration log. |
| **Offline data pipeline** | Four standalone Python tools (crawl → extract/OCR → chunk → embed/upsert) that populate `kb_chunks` from the live site + scanned PDFs — see [Data pipeline (offline)](#data-pipeline-offline) above. Independent of the Next.js app. |
| **RAG eval harness** | `npm run eval:dump` runs the real retrieve→rerank→generate stages over a golden set and dumps per-query traces (chunk ids, context, answer) — the chat route itself exposes none of that. `rag_eval/` (standalone Python, RAGAS) scores the dump: Recall@k/Precision@k/MRR/nDCG@k (retrieval), faithfulness/answer relevance/context precision/context recall (LLM-judge, `gpt-5.5`), and citation correctness. |

Rationale/tradeoffs for each tool: [guide §4](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#4-tech-stack--tool--why--benefits--drawbacks).

---

## Tech stack at a glance

- **Next.js (App Router) + Vercel** — one TypeScript app, UI + API, push-to-deploy.
- **OpenAI** — `gpt-4.1-mini` (generation + classifiers + query rewrite).
- **FPT AI Factory** — `vietnamese-embedding`, `bge-reranker-v2-m3`, pay-as-you-go, VN/JP region.
- **pgvector on Postgres** (Supabase/Neon free tier for the demo) — vectors + keyword FTS in one datastore.
- **Vercel AI SDK** — streaming chat plumbing.
- **shadcn/ui + Tailwind + v0** — fast, accessible UI.
- **Zod** — validates structured LLM outputs (classifier verdicts).
- **Docker** — containerizes the app for the on-prem/FPT deployment-readiness story.

---

## Retrieval design in brief

The KB is human-curated, not auto-chunked: built from real knowledge-demand (what patients
actually ask), manually chunked with topic/keyword metadata over four informational topics
(`bhyt_pricing`, `procedures`, `hospital_info`, `doctor_schedule`), and BHYT/procedure prose
converted into explicit structured rules so even a small model reasons over them reliably.
Query time: normalize → intent route (soft, multi-label) → dense + keyword arms in parallel → RRF
fuse → rerank → grounding gate. Neither retrieval arm alone is sufficient on a large Vietnamese
KB — semantic catches paraphrases, keyword/rules catch exact terms and abbreviations. Booking is
an *action*, not a KB topic; symptom questions never reach retrieval at all (guide §6.1).

Full detail: [guide §5](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#5-knowledge--retrieval-design-guidebook-4-5-following-the-yersin-case-study).

---

## Repo layout (as built)

```
├─ app/
│  ├─ page.tsx                     # chat UI (widget)
│  └─ api/{chat,booking,emergency}/route.ts
├─ lib/
│  ├─ llm/client.ts                # OpenAI gpt-4.1-mini (generation + classifiers + rewrite)
│  ├─ prompt/{severity-classifier,intent-classifier,generate-answer,summarize-history,query-rewrite}.ts  # all LLM system prompts, one file each
│  ├─ embeddings/client.ts         # FPT vietnamese-embedding + bge-reranker-v2-m3
│  ├─ db/{schema.sql,client.ts,setup.ts}  # pgvector: kb_chunks + indexes
│  ├─ rag/{kb-parser,dictionary,rules,ingest,normalize,rewrite,retrieve,rerank,generate}.ts
│  ├─ emergency/{classify,responses,case}.ts
│  ├─ scope/{classify,responses}.ts
│  ├─ booking/mock-data.ts
│  ├─ chat/{pipeline,summarize}.ts # the ordered pipeline + history summarization, called by app/api/chat/route.ts
│  └─ usage.ts                     # token/cost tracker for the eval report
├─ hackathon_docs/kb/*.md|*.json   # curated chunks + rules.json + dictionary.json (KB source)
├─ data/eval/*.json                # emergency / scope / faq / golden-answers (RAGAS) sets
├─ data/eval/runs/latest.jsonl     # pipeline traces dumped by `npm run eval:dump`, input to rag_eval/
├─ scripts/{eval,selfcheck}.ts
├─ crawler/                        # standalone: crawl4ai deep-crawl → S3 (own README)
├─ pdf_ingest/                     # standalone: PDF → markdown (native/vision-OCR) → S3 (own README)
├─ chunking/                       # standalone: structure-aware chunking → S3 JSONL (own README)
├─ kb_ingest/                      # standalone: embed + upsert JSONL → kb_chunks (own README)
├─ rag_eval/                       # standalone: RAGAS retrieval + answer-quality eval (own README)
├─ Dockerfile
└─ README.md
```

Full detail: [guide §7](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md#7-suggested-repo-structure).

---

## Key invariants

These are load-bearing — don't break them when implementing:

- **Symptom & emergency guardrail runs first, and fails safe.** No retrieval or generation
  happens on a message that mentions symptoms, `serious` or not; a classifier error shows the
  safety notice, never silently continues.
- **Symptom questions are never answered medically.** `normal` → redirect to booking; `serious` →
  emergency escalation. There is no path from a symptom question to retrieval or free generation.
- **Grounding gate prevents hallucination.** An in-scope question with no confident retrieved
  context gets "I don't know → official channels," never a guessed answer.
- **Out-of-scope refusal and the grounding gate are two distinct responses** — don't conflate
  out-of-scope ("not about the hospital") with in-scope-but-ungrounded ("about the hospital, but
  we don't have that information").
- **Escalate no further than needed.** Prompting + RAG only — no fine-tuning, no multi-step
  agents; there's no behavior gap that justifies either.
- **History summarization fails soft, never fails safe.** An error condensing prior turns never
  blocks or delays the severity guardrail; it degrades to no conversation context, exactly like
  retrieval's keyword-only and rerank's fusion-order fallbacks.
- **Query rewrite fails soft, same rule.** An error rewriting the query degrades to the
  dictionary-expanded query — retrieval never blocks on it.
- **The offline data pipeline and the hand-curated KB path share `kb_chunks` safely.** The four
  Python tools' chunks and `lib/rag/ingest.ts`'s hand-curated chunks use disjoint id-prefix
  namespaces with the same `on conflict … do update` upsert — either can run without colliding
  with or clobbering the other.
- **Generation, classifiers, and query rewrite run on OpenAI** (`gpt-4.1-mini`); **embeddings and
  reranking run on FPT AI Factory** (Vietnamese sovereign cloud, VN/JP) — each behind its own
  OpenAI-compatible client, so either provider swaps independently via env vars.
- **The product is not the model.** The guardrails, citations, "I don't know" behavior, and
  booking handoff are what TrustTim *is* — the LLM is a supervised component inside it.

---

## Further reading

- [`hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md`](hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md) — the full blueprint this file distills.
- [`hackathon_docs/guide/VAIC2026_Problem-Statement-Analysis.md`](hackathon_docs/guide/VAIC2026_Problem-Statement-Analysis.md) — locked solution scope.
- [`hackathon_docs/guide/VAIC2026_Scoring-Criteria-Guide.md`](hackathon_docs/guide/VAIC2026_Scoring-Criteria-Guide.md) — the 100-point rubric this architecture targets.
- [`hackathon_docs/problem_statement/Hanoi_heart_hospital_problem_statement.md`](hackathon_docs/problem_statement/Hanoi_heart_hospital_problem_statement.md) — the official challenge brief.
- `CLAUDE.md` — full doc index for this repo.
