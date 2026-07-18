# TrustTim — Architecture & Implementation Guide

> **What this is:** the hospital-specific, buildable blueprint for TrustTim (Team BananaPhil's AI customer-care assistant for Hanoi Heart Hospital). It applies the general methodology in [`AI Project Guidebook.md`](AI%20Project%20Guidebook.md) — its phase numbers (`Guidebook §N`) are cited throughout — to this specific problem, scope, and 48-hour constraint.
>
> **Cost/lightweight model:** the retrieval and cost design follows [`university_admissions_chatbot_case_study.md`](university_admissions_chatbot_case_study.md) — a real Vietnamese admissions RAG chatbot running at **~$2/day for 2,000–4,000 conversations/day** (nearly identical scale to this hospital's ~2,500–3,000 outpatients/day). Its techniques (`Case study` below) are adopted deliberately. Note: TrustTim's KB is **larger** than the case study's, so we add **semantic retrieval over a vector DB** on top of the case study's deterministic techniques. All three models — LLM, embedding, reranker — run as **managed pay-as-you-go endpoints on FPT AI Factory** (Vietnamese sovereign cloud), so "lightweight" here means *no inference infra to operate and no per-hour GPU bill* — we pay only for what we use, and the platform's free credits cover the demo.
>
> **Read alongside:** `VAIC2026_Problem-Statement-Analysis.md` (locked scope), `Hospital-Website-RAG-Inventory.md` (real KB sources), `VAIC2026_Scoring-Criteria-Guide.md` (the 100-point rubric), `VAIC2026_Winning-Playbook.md` (the 48h timeline).
>
> **Audience framing:** written as if we were a real solution provider pitching the hospital — credible and production-aware — but every choice is deliberately sized for a 2-person team to ship, deploy, and demo in 48 hours.

---

## 1. Overview & design principles

TrustTim is a **grounded, Vietnamese-first RAG chatbot** embedded on the hospital website that answers patients' real logistics questions (BHYT insurance, examination/treatment procedures, appointment booking) strictly from the hospital's official information — and, critically, **recognises when a message is actually a cardiac emergency and routes the person to emergency care instead of answering.**

Six design principles govern every decision below:

1. **Escalate no further than you must (Guidebook §2).** The escalation ladder is Prompt → RAG → Fine-tuning → Agents. TrustTim deliberately stops at **prompting + RAG**. There is no *behaviour* gap that would justify fine-tuning, and no multi-step autonomy that would justify agents — a single retrieve-then-generate call does the job. This is a defensible engineering decision, not a shortcut, and it's strong Q&A material for the Technical Judge.
2. **Understand the domain's semantics *before* designing retrieval (Case study — the central mindset).** "Sometimes the highest-leverage optimization is not a larger model — it is simply understanding the data better than anyone else." We design retrieval around how patients actually ask questions, not around how the documents are organised. This is where the doctor's insight beats a generic embedding pipeline.
3. **Cost-effective & lightweight by design (Case study).** Every stage is chosen to minimise tokens and dollars: deterministic filtering at the free software layer, a cheap/small model as the default, minimal conversation history, and **managed pay-as-you-go inference (no self-hosted GPU to run)**. "Lightweight" means *no inference infra to operate — pay only per use*; context quality beats model size.
4. **Vietnamese-region managed models on FPT AI Factory.** The KB is large enough that a keyword-only pass would miss real paraphrases, so retrieval is **hybrid — semantic (dense) + keyword** — over a lightweight vector store (**pgvector on Postgres**, our own). The dense embeddings, the reranker, and the LLM are all served by **FPT AI Factory** — a single **OpenAI-compatible, pay-as-you-go** API with data centers in **Vietnam and Japan**. Because inference runs in a **Vietnamese sovereign cloud** (not a foreign vendor) and there is nothing to self-host, this is a strong "runs on Vietnamese, hospital-appropriate infrastructure" story (Guidebook §1 constraints; requirement #6) — with a clean upgrade path to dedicated FPT capacity / on-prem GPU for the strictest production posture.
5. **Safety is the product, not a feature.** The emergency guardrail and the grounding/citation layer are the parts a generic team can't credibly copy — and they map to 30 of the 100 rubric points (Safety 15 + UX 15). Treat them as the core, not the polish.
6. **The product is not the model (Guidebook § core mental models).** The guardrail, the citations, the "I don't know" behaviour, the booking handoff, and the UI *are* TrustTim. The LLM is one hardworking-but-occasionally-wrong junior analyst inside it that must be supervised.

**Success metric, stated up front (Guidebook §1 — "if you can't state the success metric in one sentence, you're not ready to build"):**

> TrustTim answers in-scope questions correctly *and with a citation* ≥90% of the time, **declines non-hospital questions with a fixed default response** (a scope guardrail, so it never answers off-topic or harmful queries) and says **"I don't know" → official channels** for hospital questions it lacks grounding for (never bluffs), detects **100% of true emergencies** in our test set (a missed emergency is a project failure; a false alarm that sends a well patient to reception is acceptable), **and does all of this at low single-digit USD/day even at full patient volume** (~2,500–3,000 conversations/day). Cost is pay-as-you-go across three cheap FPT AI Factory calls per turn (embed + rerank + LLM) plus a small Postgres/pgvector instance — and **FPT's free credits ($100, incl. $70 for inference) cover the entire hackathon**, so the event itself is effectively free.

---

## 2. System architecture

```
                         ┌──────────────────────────────────────────────┐
                         │  Browser — Next.js / React chat widget (VI)   │
                         │  • streamed answers + visible citations        │
                         │  • "I don't know → official channels" state    │
                         │  • distinct EMERGENCY escalation state         │
                         └───────────────────────┬──────────────────────┘
                                                 │  (chat messages + history)
                                                 ▼
        ┌────────────────────────────────────────────────────────────────────────┐
        │  Orchestration — Next.js Route Handler  /api/chat                        │
        │                                                                          │
        │   1. reconstruct minimal history (LLMs are stateless) + normalize query  │
        │   2. ┌─ EMERGENCY GUARDRAIL (runs FIRST) ─────────────┐    safe escalation
        │      │  gpt-oss-20b intent classifier (structured)     │──emrg──▶ + raise support
        │      │  {is_emergency, matched_signals}                │          case (skip RAG)
        │      └─  (fail-safe: on error → show safety notice) ────┘   (LLM error ⇒ fail safe)
        │   3. ┌─ SCOPE GUARDRAIL (after emergency, before RAG) ─┐                  │
        │      │  in-scope route? else gpt-oss-20b scope classifier│──off-topic──▶ default
        │      │  {in_scope, informational_topics[], booking_intent}│            response
        │      └─────────────────────────────────────────────────┘              (skip RAG)
        │   4. RETRIEVE — hybrid, then rerank (multi-intent aware):                │
        │      filter to matched topics (union, or none — soft signal); parallel:  │
        │        • DENSE: embed query (FPT vietnamese-embedding) → pgvector search │
        │        • KEYWORD: VI synonym/abbrev dictionary + FTS/rule ranking        │
        │      → fuse (RRF) → RERANK (FPT bge-reranker-v2-m3) → top-k              │
        │      (reranker sorts across topics → resolves multi-intent queries)      │
        │      (structured BHYT/procedure rules matched deterministically alongside)│
        │      (embed/rerank endpoint down → degrade to keyword-only)              │
        │   5. if no confident candidate → "I don't know" + channels               │
        │   6. generate (gpt-oss-20b, grounding prompt, answer ALL parts) + cites  │
        │   7. if booking_intent → ALSO attach mocked schedule + handoff CTA       │
        │   8. stream + log                                                        │
        └──────┬───────────────────────────────┬───────────────────┬─────────────┘
               │                               │                   │
               ▼                               ▼                   ▼
      ┌─────────────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
      │ FPT AI Factory (one         │ │ pgvector / Postgres│ │ Mock booking svc   │
      │ OpenAI-compatible API, VN/JP│ │ • KB chunks + meta │ │ /api/booking       │
      │ region, pay-as-you-go):     │ │ • dense vectors    │ │ seed doctors/slots │
      │ • gpt-oss-20b   (generate + │ │ • keyword/tsvector │ │ → handoff: web/    │
      │    emergency classifier)    │ │ • structured rules │ │   Zalo/hotline     │
      │ • vietnamese-embedding      │ │ + hybrid SQL query │ │   19001082         │
      │ • bge-reranker-v2-m3        │ │ (our own store)    │ └────────────────────┘
      │  via one provider-abstracted│ └────────────────────┘
      │  client (base URL + key)    │
      └─────────────────────────────┘

   Cross-cutting: logging/observability (query, retrieved sources, emergency flag,
   tokens, latency) → doubles as demo evidence + the required AI-collaboration-log deliverable.
   Packaging: app Dockerfile + env-swappable model endpoints → Vercel demo / on-prem app host;
   models stay on FPT AI Factory (or dedicated FPT/on-prem GPU in production).
```

**The components:**

1. **Frontend (Next.js/React, Vietnamese-first).** An embeddable chat widget. Renders streamed answers with **visible source citations**, a clean "I don't know — here's who to contact" fallback, and a **visually distinct EMERGENCY state** (red banner, call-115 CTA). Built fast with v0 + shadcn/ui + Tailwind. UX is a scored criterion (15 pts) — a clean single golden path beats many rough screens.
2. **Orchestration (`/api/chat` route handler).** The ordered pipeline in §3. This is where the "product is not the model" principle lives.
3. **Hybrid retrieval engine + KB (details in §5).** Retrieval runs two arms in parallel: a **semantic (dense)** arm — the query is embedded by **FPT's `vietnamese-embedding` endpoint** and matched against KB vectors in **pgvector** — and a **keyword** arm — the Vietnamese synonym/abbreviation dictionary + full-text/rule ranking (the case study's deterministic layer). Their results are fused (**Reciprocal Rank Fusion**) and reordered by **FPT's `bge-reranker-v2-m3` endpoint** so only the genuinely-best chunks reach the LLM. Prose-derived **structured-logic rules** (BHYT/procedures) are matched deterministically alongside — semantic search routes *to* them, never replaces them. The LLM's job stays *answer/classify over a small clean set, not discover*.
4. **FPT AI Factory model endpoints.** All three models are **managed pay-as-you-go endpoints** behind one **OpenAI-compatible** client (base URL + API key): **`gpt-oss-20b`** (generation + the emergency classifier's structured verdict), **`vietnamese-embedding`** (the dense arm), and **`bge-reranker-v2-m3`** (rerank). Inference runs in FPT's **Vietnam/Japan data centers** — a Vietnamese sovereign cloud, so patient queries never go to a foreign vendor; that is much of the deployment-readiness story. Nothing to self-host; production can move to dedicated FPT capacity / on-prem GPU via the same client.
5. **Vector store — pgvector on Postgres (our own).** The one component *not* from FPT: a single datastore holding chunk text, metadata, dense vectors, and a keyword/`tsvector` column, so the hybrid query is a single SQL statement (Supabase/Neon free tier for the demo; managed/on-prem Postgres for production). Set the `vector(N)` dimension to match the embedding endpoint's output.
6. **Mock booking/schedule service (`/api/booking`).** Realistic simulated schedule data + a handoff to the real public channels found in the website inventory. Clearly labelled as simulated.
7. **Emergency guardrail.** Its own module (details in §6) — the differentiator and the doctor's domain. A `gpt-oss-20b` classifier (fail-safe on error) that, on an emergency, escalates and **raises a mocked support case**; runs **before** retrieval.
8. **Observability + eval harness + AI-collaboration log.** Lightweight structured logging (incl. **tokens per turn** + retrieval/rerank latency, for the cost story) that also feeds the required deliverable and the demo's "look, it's grounded" moment.
9. **Packaging/deployment.** Vercel for the app demo; the app Dockerfile + env-swappable model endpoints back the on-prem/FPT readiness story (models stay on FPT AI Factory, or move to dedicated FPT/on-prem GPU in production).

**Model tier (Case study — "small models become powerful when context is clean"):** the default LLM is **`gpt-oss-20b`** for both the emergency classifier (with **structured output** + low **reasoning effort**) and final generation (medium reasoning), because hybrid retrieval + reranking hand it a small, precise context. If the VN generation eval (§9) shows it falling short in Vietnamese, swap to a stronger FPT-catalog model (e.g. Qwen3/DeepSeek) via **one env-var change** — same OpenAI-compatible client, no rewrite.

---

## 3. The chat pipeline (the heart of the system)

Order matters. **The emergency guardrail runs before anything else** — we never want a retrieval or a free-form generation to happen on a message that was actually a person in distress.

1. **Receive + normalize.** Take the user message plus *minimal* prior turns — the app rebuilds and resends history every call (Guidebook § core: stateless), but keep it short: "relevant context is far more valuable than large context" (Case study), and every extra token costs money. **Normalize the query**: expand common Vietnamese abbreviations/slang and map colloquial terms to canonical ones via the domain dictionary (see §5), so retrieval doesn't miss on informal phrasing.
2. **Emergency guardrail (first) — LLM classifier.** An **intent classifier on `gpt-oss-20b`** with **structured (JSON) output** and low reasoning effort runs on every message, crucially distinguishing *"tôi đang đau ngực"* ("I'm having chest pain now" → emergency) from *"đau ngực là triệu chứng của bệnh gì"* ("what is chest pain a symptom of?" → information).
   - On an **emergency verdict** → return the **hard-coded, doctor-authored safe escalation message** (call **115** / Emergency Dept) **and raise a (mocked) emergency support case** — log the message + matched signals + timestamp and simulate notifying the hospital's emergency/CSKH channel — then stop. The LLM never free-generates medical advice in this path.
   - **Fail-safe:** if the classifier call errors or times out, **err toward showing the safety notice** (emergency/hotline guidance) rather than silently proceeding to normal RAG — safety must never depend on a successful model call. (See the resilience note in §11.)
3. **Scope guardrail (after emergency, before retrieval), deterministic-first.** Only *hospital inquiries* get answered; anything else is filtered here so we never spend retrieval/generation on off-topic or harmful queries.
   - **Multi-label, not single-label:** the classifier emits `{ in_scope: boolean, informational_topics: string[], booking_intent: boolean }` — a query can belong to **several** informational topics at once (e.g. *"is there a heart check-up combo?"* → service/pricing) **and** carry a **booking action** (*"I want to book"* → `booking_intent: true`). This is deliberate: a single label would let one intent mask another (see §6.2). **In-scope if *any* detected topic is in-scope** (out-of-scope only if none are).
   - **Deterministic pass-through:** if the query clearly matches one or more in-scope topics (**BHYT / procedures / pricing / booking-info / hospital-info**) via the router + VI dictionary/keywords (§5.6), it's in-scope — proceed, no LLM call; booking keywords ("đặt lịch", "hẹn khám", "đặt hẹn", book/appointment) set `booking_intent` here too. `gpt-oss-20b` (low reasoning) handles only the ambiguous / no-match case.
   - **Out of scope → return the fixed default response and stop** (no retrieval, no free generation): a friendly Vietnamese message that TrustTim only assists with Hanoi Heart Hospital inquiries, listing what it *can* help with and pointing to the hotline (see §6). Harmful/abusive off-topic queries are declined the same way.
   - **Precedence:** this runs *after* the emergency guardrail so a distress message phrased oddly is escalated, never filtered as "off-topic." **Bias toward answering** when unsure — let borderline questions through to retrieval (the grounding gate is the backstop) rather than wrongly turning away a real patient.
4. **Retrieve — hybrid, then rerank, multi-intent aware (Case study — "retrieval is not the same as understanding"):**
   - **Topic is a *soft* signal, not a hard filter.** Scope the search to the **union of the matched `informational_topics`** (`where topic in (…)`), or don't topic-filter at all — never a single-topic `where topic = X`, which would drop the other intent of a compound query. Widen the fused candidate pool so both intents' chunks can surface.
   - **Two arms, in parallel:** a **dense** arm — embed the normalized query via **FPT's `vietnamese-embedding` endpoint** and do a vector search in **pgvector** — and a **keyword** arm — dictionary-expanded full-text / rule ranking. Any matching **structured-logic rules** (BHYT/procedures) are pulled deterministically here too.
   - **Fuse + rerank (this resolves multi-intent):** combine the arms with **Reciprocal Rank Fusion** (recall-oriented), then **FPT's `bge-reranker-v2-m3` endpoint** scores every candidate against the **full query** and reorders — so for *"combo? + book"* it pulls the pricing chunk **and** any booking-info chunk to the **top-k**, regardless of topic. Cost is bounded by the candidate count (~20–30), not KB size.
   - **Resilience:** if the embedding or rerank endpoint errors/times out, **degrade to keyword-only retrieval** (dictionary + FTS + structured rules) rather than failing the turn — the keyword arm always works locally.
   - **Then `gpt-oss-20b`** answers over that small, clean, reranked set — *classification/selection, not discovery*, which the model does reliably on tight context.
5. **Grounding gate.** If no candidate is confidently relevant, don't generate — return the **"I don't know → official channels"** response. This is what stops hallucination on *in-scope* questions we lack grounding for. (Note: this is a *different* response from the scope guardrail's out-of-scope decline — see §6.)
6. **Generate.** Call **`gpt-oss-20b`** (FPT) with a strict grounding system prompt: *answer only from the provided context, in Vietnamese, cite the sources you used, and if the context is insufficient, say so and point to the hotline.* **Address every part of a multi-part question** — combine grounded facts across topics, and don't answer only the first intent. Never diagnose.
7. **Booking action.** If **`booking_intent`** is set (§3 step 3), attach the mocked-but-realistic schedule data and a **handoff CTA** (website booking URL / Zalo / hotline 19001082) — **in addition to** the informational answer, not instead of it. So *"is there a heart check-up combo? I want to book"* returns the combo/pricing info **and** the booking CTA. This is TrustTim *doing something*, not just chatting.
8. **Stream + log.** Stream the answer to the UI, render citation chips and any action button, and log the turn (query, emergency flag, **scope verdict**, retrieved sources, **tokens**, latency).

---

## 4. Tech stack — tool · why · benefits · drawbacks

| Tool / framework | Why we use it | Benefits | Drawbacks & mitigation |
|---|---|---|---|
| **Next.js (App Router)** | One TypeScript app for both UI and API — no separate backend to deploy. | Single repo & deploy; route handlers colocate the pipeline with the UI; excellent AI-codegen support (v0/Cursor). | TypeScript, not Python (less natural for a data engineer) — mitigated by AI codegen. Serverless functions are stateless → keep no in-process session state (fine; we resend history). |
| **Vercel** | Push-to-deploy hosting purpose-built for Next.js. | Live URL in minutes; preview deploys per commit; generous free tier; zero DevOps. | Cold starts + function time limits — fine for chat; keep the KB index small so cold starts stay fast. |
| **`gpt-oss-20b` on FPT AI Factory** | Generation + the emergency classifier. Managed, **OpenAI-compatible**, pay-as-you-go; 128K context; **native structured outputs** + configurable reasoning effort (low for classify, medium for generation); the clean reranked context makes it reliable (Case study). | Low cost per call; nothing to self-host; inference stays in FPT's **VN/JP region**; free credits cover the demo. | **Vietnamese quality is weaker than a frontier model** → eval it on the doctor's VN set (§9) and, if short, swap to another FPT-catalog model (Qwen3/DeepSeek) via one env var. External dependency → retries/timeouts (§11); minimise cost/latency with minimal history + prompt caching (§7). |
| **FPT AI Factory `vietnamese-embedding` + `bge-reranker-v2-m3` endpoints** — **required** | Strong Vietnamese semantic retrieval + reranking as **managed pay-as-you-go** endpoints (same OpenAI-compatible client + key as the LLM). The reranker's precision is what keeps `gpt-oss-20b` grounded on a large KB. | **VN-tuned quality; nothing to self-host; data stays in FPT's VN/JP region**; free credits cover the demo; one vendor for all three models. | Per-query fee (tiny) + external dependency → **retries + degrade to keyword-only if down** (§3, §11). Confirm the embedding **dimension** from the live endpoint and set `pgvector`'s `vector(N)` to match. |
| **Provider abstraction (one OpenAI-compatible client — e.g. Vercel AI SDK / OpenAI SDK pointed at FPT's base URL)** | "Abstract the provider early" (Guidebook §3). All three FPT models sit behind one base-URL + key. | Swapping any model — a different FPT-catalog model, or another OpenAI-compatible provider entirely — is an **env-var change, not a rewrite**; underpins the deployment-readiness story. | Slight upfront indirection; keep thin `lib/llm/client.ts` + `lib/embeddings/client.ts` wrappers over the same config. |
| **Keyword arm of the hybrid retriever** (topic router + VI synonym/abbreviation dictionary + keyword/FTS + rule ranking + structured-logic tables — plain TypeScript + Postgres FTS) | The case study's deterministic layer, kept as the **precision/sparse arm** of hybrid retrieval + the exact-match layer for structured BHYT/procedure rules and topic routing. It's also the **fallback path** when FPT retrieval endpoints are unavailable. | **Zero LLM cost, near-zero latency**; exact on rules/abbreviations; catches terms a dense model may blur; runs locally with no vendor. | Requires human domain work up front (the doctor's manual curation, §5); alone it misses paraphrases → that's exactly why the dense arm + reranker sit beside it. |
| **pgvector on Postgres** (Supabase/Neon managed free tier for the demo; managed/on-prem Postgres for production) — **our own store, the one component not from FPT** | The vector store — but one that also holds documents, metadata, and keyword `tsvector`, so **hybrid retrieval is a single SQL query**. | One datastore instead of a separate vector DB; SQL joins/filters; free at demo scale; HNSW indexing scales to the large KB; self-hostable in-network. | It's a DB to run/tune → mitigated by the managed free tier for the demo and topic-scoped filters + HNSW at scale. Set `vector(N)` to the embedding endpoint's dimension. |
| **Vercel AI SDK (`ai`)** | Streaming chat plumbing + provider-agnostic message handling. | Token streaming out of the box (good UX); tidy React hooks; provider swap. | Another dependency; its abstractions can hide details — read what it sends. |
| **shadcn/ui + Tailwind + v0** | Fast, clean, accessible UI without hand-crafting CSS. | Polished look quickly → UX points; v0 generates most of it. | Generated code needs a review pass; keep the golden path spotless, delete dead UI. |
| **Zod** | Validate structured LLM outputs (emergency classifier verdict, booking-intent extraction). | Guarantees downstream code parses a known shape (Guidebook §5/§7: structured outputs > free-text parsing). | Minor boilerplate; worth it anywhere code depends on the response. |
| **Docker** | Containerise the **app** for the on-prem deployment-readiness story (requirement #6). | The same app image runs on Vercel-alternative infra or hospital on-prem, pointing at the FPT model endpoints (or dedicated FPT/on-prem GPU) via env vars; concrete answer to "is this deployable?". | Adds a Dockerfile to maintain; not needed for the Vercel demo itself — build it for the pitch/readiness story. |
| **Web Speech API (browser ASR/TTS)** — *optional, bonus only* | The brief marks Vietnamese speech as a bonus; the browser API is free and fast. | Cheap voice demo if there's spare time. | Variable Vietnamese quality; **do not build until the core is rock-solid** (Playbook: bonus only). |

---

## 5. Knowledge & retrieval design (Guidebook §4–§5, following the Yersin case study)

The single most important idea, straight from the case study: **understand the domain's semantics before designing retrieval.** The KB is *engineered by a human* (the doctor), not just dumped into an embedding index. The steps below are in the order they should be done.

### 5.1 Start from knowledge-demand distribution, not documents
Before curating anything, the doctor answers: *which questions do patients and families actually ask most?* (booking, BHYT coverage/co-pay, procedure steps, pricing, schedules). Then **delete low-value content**: the case study cut 30+ pages of history/mission/org-structure/awards because *students never ask about them* — and the hospital website inventory found exactly that kind of "rich static" content (history, achievements, org chart). It is impressive and almost never asked about. Keep the KB focused on the real demand.

### 5.2 Content model
Every KB chunk carries metadata so answers can cite and caveat honestly:

```json
{
  "id": "bhyt-transfer-letter",
  "topic": "BHYT",                       // BHYT | procedures | booking | hospital-info
  "title": "Giấy chuyển tuyến BHYT",
  "content": "…",
  "keywords": ["chuyển tuyến", "giấy chuyển", "trái tuyến", "…"],  // for the keyword arm (FTS/dictionary match)
  "source_url": "https://benhvientimhanoi.vn/…",
  "last_reviewed": "2026-07-16",
  "is_synthetic": false                  // true → shown as a caveat in the citation
}
```
- **`is_synthetic` is surfaced in the UI citation** ("thông tin minh hoạ / illustrative"). Keeps us honest about public-vs-synthesized content (ethics rule) and is a trust signal for the Safety criterion.

### 5.3 Manual chunking (Case study — "the month-long process", compressed to hours)
Curate the KB **by hand** into clean, self-contained chunks (~a few hundred to ~700 tokens each), each carrying the metadata in §5.2 (topic, keywords, `is_synthetic`). Our KB is **larger** than the case study's ~300-chunk domain, which is precisely why semantic retrieval earns its place — but the chunks are still human-curated, not auto-split. Workflow: extract → rewrite ambiguous bits → remove low-value info → consolidate overlaps → **validate with the doctor**. Chunk *content* is what gets embedded (§5.7), so keep each chunk about one thing — clean chunks make both the dense vectors and the reranker sharper.

### 5.4 Convert prose into structured logic (Case study — the BHYT killer technique)
BHYT and procedure rules are full of conditions, exceptions, and program-specific cases — exactly the prose that makes *small* models inconsistent. Transform that prose into **explicit structured rules / decision tables** (JSON), e.g.:

```json
{ "rule": "bhyt_coverage",
  "if": { "has_referral": true, "correct_tier": true },
  "then": "Được hưởng đúng tuyến — mức hưởng theo thẻ.",
  "source_url": "…" }
```
Once the rules are explicit, even the cheap model reasons reliably — "the solution was not a better prompt; it was to transform prose into structured logic."

### 5.5 Engineer the knowledge artifacts that don't exist (Case study)
Some answers patients want aren't stored explicitly anywhere. The case study had to *build* a subject-combination→eligible-major mapping. TrustTim's analogues (build these deliberately, don't expect to extract them): a **need/intent → correct department or clinic** map, and an **insurance-status (has BHYT + referral?) → applicable procedure & pricing path** map. This is engineered knowledge, doctor-authored.

### 5.6 Query normalization + domain dictionary
Patients use abbreviations, slang, and context-dependent follow-ups. Maintain a **Vietnamese synonym/abbreviation dictionary** (e.g., BHYT ↔ bảo hiểm y tế; colloquial symptom/booking terms) used to normalize the query *before* topic matching and both retrieval arms. The router/dictionary can match **multiple** topics for one query (multi-label — see §5.7 and §6.2), not just one; that's how a compound question keeps all its intents. Keep **minimal conversation memory** — carry only the context needed for follow-ups, not the whole transcript ("relevant context > large context"); this is both an accuracy and a cost decision.

### 5.7 Hybrid retrieval (semantic + keyword → fuse → rerank)
The KB is large, so retrieval combines a **semantic** arm (catches paraphrases and synonyms the keyword layer would miss) with the **keyword/rule** arm from §5.1–§5.6 (exact on abbreviations, rules, and rare terms a dense model may blur). Neither alone is enough on a large Vietnamese KB; together, fused and reranked, they are.

**Embedding + reranker model (FPT AI Factory, Vietnamese-first).**
- **Embeddings:** FPT's **`vietnamese-embedding`** endpoint (a BGE-M3-family Vietnamese model). Chosen for genuine Vietnamese quality, and because it's a **managed pay-as-you-go, OpenAI-compatible** call with inference in FPT's VN/JP region — nothing to self-host. Both KB chunks (at ingest) and the live query (at request time) are embedded by the same endpoint. **Confirm the output dimension from the live endpoint** and set the `pgvector` column to match (BGE-M3 is typically 1024).
- **Reranker (required):** FPT's **`bge-reranker-v2-m3`** endpoint — a multilingual cross-encoder that scores each candidate against the actual query. Same OpenAI-compatible client/key as the other two models.
- **Resilience:** both are external calls — wrap with retries/timeouts, and if either is unavailable **fall back to keyword-only retrieval** (§5.6 dictionary + FTS + structured rules) so the turn still answers.

**pgvector schema (one datastore for both arms).** A single `kb_chunks` table:
```sql
create extension if not exists vector;
create table kb_chunks (
  id           text primary key,
  topic        text not null,              -- BHYT | procedures | pricing | booking-info | hospital-info (a soft filter, not exclusive)
  title        text,
  content      text not null,              -- the chunk text (also what we embed)
  keywords     text[],                     -- for the keyword arm
  source_url   text,
  is_synthetic boolean default false,
  embedding    vector(1024),               -- dense vector from FPT vietnamese-embedding (confirm dim; 1024 for BGE-M3)
  fts          tsvector                     -- generated from content+keywords, for keyword search
);
create index on kb_chunks using hnsw (embedding vector_cosine_ops);  -- semantic
create index on kb_chunks using gin (fts);                            -- keyword
```

**Retrieval flow (query time):**
1. **Normalize + soft topic filter** (§5.6): expand abbreviations/slang, then scope to the **union of matched topics** — `where topic in (…matched…)`, or **no topic filter at all** — never a single-topic `where topic = X`. Topic is a soft signal that narrows the pool, not an exclusion that can drop a second intent.
2. **Dense arm:** embed the normalized query via FPT `vietnamese-embedding` → `order by embedding <=> $queryVec limit N` in pgvector.
3. **Keyword arm:** dictionary-expanded `fts @@ ...` / keyword-rank query → top N; plus deterministic **structured-rule** matches (BHYT/procedures).
4. **Fuse:** merge the two ranked lists with **Reciprocal Rank Fusion** (recall-oriented; no tuning of incomparable score scales needed).
5. **Rerank (required):** FPT `bge-reranker-v2-m3` scores the fused candidates against the query; keep the **top-k** (e.g. 3–5) — this is the precision step that keeps the generator grounded. (If embed or rerank is unavailable, degrade to keyword-only.)
6. **Grounding gate:** if nothing clears a relevance threshold after rerank, return **"I don't know" + official channels** — the anti-hallucination mechanism. For a multi-part question, answer the parts that *are* grounded and point to official channels for the rest — don't discard a whole answer because one sub-intent found nothing.

**Multi-intent queries (Layer 1).** A single message often spans intents — *"Is there a general heart check-up combo? I want to book?"* touches pricing/service **and** booking. Two design choices keep both alive: (1) intent classification is **multi-label** (§6.2), so retrieval scopes to the *union* of matched topics rather than one; and (2) **the reranker resolves the intents** — `bge-reranker-v2-m3` scores every fused candidate against the *whole* query, so the top-k naturally contains the best chunk for *each* intent. The key principle: **decouple intent detection from retrieval filtering** — never let a single topic label hard-exclude a relevant chunk. (Booking is handled as an *action*, not a retrieval topic — see §3 step 7 and §6.2. A heavier **query-decomposition** option — split into sub-queries, retrieve per sub-query, synthesize — is left as an eval-gated future step if the reranker approach ever misses on compound queries.)

### 5.8 Generation
- **Citations:** return the titles/URLs of the chunks/rules actually used; render them under the answer.
- **Grounding system prompt (sketch):** *"You are TrustTim, the information assistant for Hanoi Heart Hospital. Answer only using the CONTEXT provided, in Vietnamese. **If the question has multiple parts, address every part**, combining facts from all relevant sources. Cite the source of each fact. If the CONTEXT covers some parts but not others, answer what you can and direct the user to the hotline 19001082 for the rest — do not guess. You never give medical, diagnostic, or treatment advice."*
- **Prompt caching (Guidebook §7):** the system prompt + any stable preamble are a fixed prefix — order static-before-variable and cache it to cut latency and cost.
- **Ingest/answer separation (Guidebook §5):** `lib/rag/ingest.ts` (curated chunks → **embed via FPT `vietnamese-embedding` → upsert into pgvector** with metadata + `fts`) is a build-time script, separate from `lib/rag/retrieve.ts` (query-time hybrid retrieval + fusion) and `lib/rag/rerank.ts` (query-time FPT reranking). Don't fuse them.

---

## 6. Guardrails (Safety = 15 pts): emergency escalation + scope filtering

Two input guardrails run **before** retrieval, in this order — emergency first, then scope — so the system only ever generates an answer for a genuine, in-scope hospital question. Both are LLM-classifier-based (the **scope** guardrail adds a cheap deterministic topic-route pass-through first; the **emergency** guardrail is a pure classifier). Both are visible in the demo — this is where the Safety points live.

### 6.1 Emergency guardrail (the differentiator)

This is the one module where "the LLM is a hardworking junior analyst who is occasionally confidently wrong" (Guidebook § core) has life-or-death stakes — so it is **supervised, not trusted**, and the doctor owns it.

- **Single LLM classifier** (see §3 step 2): a `gpt-oss-20b` classifier with a **Zod-validated structured verdict** (`{ is_emergency: boolean, matched_signals: string[] }`) runs on every message. (We deliberately dropped a keyword pre-screen so there's one clear detection path — the tradeoff is that detection now depends on the model call, which the fail-safe below covers.)
- **The hard part — intent, not keywords:** the classifier must separate an emergency *happening now* from a question that merely *mentions* a symptom. The doctor writes the labelled examples that pin this boundary down.
- **Hard-coded safe response + support case:** on an emergency verdict, TrustTim returns a fixed, doctor-authored message (call **115** / go to the Emergency Department) — the LLM is *not* allowed to free-generate here — **and raises a (mocked) emergency support case**: it logs the message, `matched_signals`, and timestamp, and simulates notifying the hospital's emergency/CSKH channel (clearly labelled simulated, like the booking handoff). This gives the safety path a visible "does something / hands off to a human" moment. Grounded in the hospital's own public "call 115 for emergencies" line (see the website inventory) and, if the team can obtain it, the hospital's real escalation instruction **HD.25.01**.
- **Fail-safe (safety must not depend on a model call):** if the classifier errors or times out, **default to showing the safety notice** (emergency/hotline guidance) rather than silently continuing to RAG. A false alarm here is acceptable; a silent miss is not.
- **Human-in-control boundary:** TrustTim only ever *routes* in an emergency. It never triages, reassures, or advises. Draw this line explicitly in the copy and show it in the demo.
- **Recall over precision:** tune to catch every true emergency even at the cost of occasional false alarms — see the metric in §1.

### 6.2 Scope / relevance guardrail (off-topic → default response)

Runs at §3 step 3, **after** emergency and **before** retrieval. Its job: answer only *hospital inquiries*, and filter everything else out with a fixed default response — so TrustTim never answers off-topic, general-knowledge, or harmful questions.

- **In-scope allowlist:** **BHYT insurance · examination/treatment procedures · pricing · appointment booking · basic hospital info.** Anything outside this is out-of-scope.
- **Deterministic-first:** the topic router + VI dictionary/keywords (§5.6) pass clearly in-scope queries through for free (no LLM call), and can match **several** topics at once.
- **Classifier for the rest — multi-label + booking-as-action:** `gpt-oss-20b` with **Zod-validated structured output** `{ in_scope: boolean, informational_topics: string[], booking_intent: boolean }`, low reasoning effort. `informational_topics` drives *what to retrieve* (union, §5.7); `booking_intent` drives the *booking action* (§3 step 7). Keeping them separate means a booking intent can never "use up" a single label and mask an informational one — the exact failure that single-topic routing causes on *"is there a check-up combo? I want to book?"*
- **In-scope if *any* topic is in-scope** (out-of-scope only if the query matches no in-scope topic and carries no booking intent).
- **Default response (out-of-scope), fixed and doctor/team-authored** — sketch:
  > *"Xin lỗi, TrustTim chỉ hỗ trợ các câu hỏi liên quan đến Bệnh viện Tim Hà Nội — như đặt lịch khám, bảo hiểm y tế (BHYT), và quy trình khám chữa bệnh. Với các vấn đề khác, vui lòng liên hệ tổng đài 1900 1082."*
  ("Sorry, TrustTim only helps with Hanoi Heart Hospital inquiries — booking, BHYT insurance, and examination/treatment procedures. For anything else, please call 1900 1082.")
- **Harmful/abusive off-topic** falls into the same bucket and gets the same decline (a dedicated jailbreak/harmful-content guard can be added later; scope filtering already stops it from being answered).
- **Two distinct refusals — don't conflate them:** *out-of-scope* (not about the hospital) → this default response; *in-scope but not in the KB* → the grounding gate's **"I don't know → official channels"** (§3 step 5). Give them different copy and, ideally, different UI states.
- **Precedence + bias:** emergency always precedes scope (a distress message is never declined as off-topic); and when the classifier is unsure, **let it through to retrieval** rather than wrongly turning away a real patient — the grounding gate is the safety net. Tune for **low false-decline on in-scope questions** (§9).

---

## 7. Suggested repo structure

```
trusttim/
├─ app/
│  ├─ page.tsx                     # chat UI (widget)
│  ├─ api/
│  │  ├─ chat/route.ts             # orchestration pipeline (§3)
│  │  ├─ booking/route.ts          # mocked schedule/booking (§4 comp. 6)
│  │  └─ emergency/route.ts        # raise a (mocked) emergency support case
├─ lib/
│  ├─ llm/client.ts                # provider-abstracted client → FPT gpt-oss-20b (OpenAI-compatible; env-swappable)
│  ├─ embeddings/client.ts         # FPT vietnamese-embedding + bge-reranker-v2-m3 calls (same base URL + key)
│  ├─ db/schema.sql                # pgvector: kb_chunks (vector + fts + metadata) + indexes
│  ├─ rag/
│  │  ├─ ingest.ts                 # build-time: curated chunks → embed (FPT) → upsert into pgvector
│  │  ├─ normalize.ts              # query normalization via the VI synonym dictionary
│  │  ├─ retrieve.ts               # query-time: hybrid over matched topics (soft filter) + RRF fusion (keyword-only fallback)
│  │  └─ rerank.ts                 # query-time: FPT bge-reranker-v2-m3 rerank of the fused candidates
│  ├─ emergency/
│  │  ├─ classify.ts               # sole detector: gpt-oss-20b classifier (structured output, Zod-validated) + fail-safe
│  │  ├─ responses.ts              # hard-coded safe escalation copy (doctor-owned)
│  │  └─ case.ts                   # raise a (mocked) emergency support case: log + simulate notify CSKH
│  ├─ scope/
│  │  ├─ classify.ts               # gpt-oss-20b scope classifier: {in_scope, informational_topics[], booking_intent} (Zod)
│  │  └─ responses.ts              # fixed out-of-scope default response (VI, team-authored)
│  └─ booking/mock-data.ts         # seed doctors / specialties / slots
├─ data/
│  ├─ kb/*.md | *.json             # manually-curated KB chunks w/ metadata + keywords (source for ingest)
│  ├─ kb/rules.json                # prose→structured-logic rules (BHYT/procedures)
│  ├─ kb/artifacts.json            # engineered maps (need→dept, insurance→pricing-path)
│  ├─ kb/dictionary.json           # VI synonym/abbreviation dictionary
│  └─ eval/
│     ├─ emergency-cases.json      # doctor-labelled golden set
│     ├─ scope-cases.json          # in-scope / out-of-scope / borderline labelled queries
│     └─ faq-cases.json            # question → expected source(s)
├─ Dockerfile                      # on-prem / FPT readiness
└─ README.md                       # problem, architecture, AI usage, how to run
```

---

## 8. Step-by-step build plan (mapped to the AI Project Guidebook phases + the 48h timeline)

Each phase names concrete tasks, the **owner** (🛠️ = builder / 🩺 = doctor / 👥 = both), and a definition-of-done. Timeline anchors reference the Playbook's 48h schedule.

### P0 — Pre-event: Frame, Choose, Select (Guidebook §1–§3)
*Before Jul 17 (allowed prep — must NOT pre-build the product).*
- 👥 Confirm the one-sentence **success metric** (§1 above) and the **escalation-ladder decision** (stop at RAG).
- 🛠️ **Set up FPT AI Factory:** create the account, **claim the $100 free credit ($70 inference)**, get the API key, and point one OpenAI-compatible client (`lib/llm/client.ts` + `lib/embeddings/client.ts`) at the FPT base URL. **Smoke-test all three endpoints** — a `gpt-oss-20b` chat/completion, a `vietnamese-embedding` call (**record the vector dimension**), and a `bge-reranker-v2-m3` rerank.
- 🛠️ **Provision Postgres + pgvector** (Supabase/Neon free tier for the demo); create the `kb_chunks` schema (§5.7) with `vector(N)` set to the confirmed embedding dimension. Smoke-test: insert + vector-query one row.
- 🛠️ Create/verify accounts (Vercel, GitHub, FPT AI Factory, Supabase/Neon); rehearse the toolchain; prepare **generic** boilerplate (auth/layout/component library — NOT the product); deploy a throwaway hello-world through the whole pipeline.
- 🩺 Collect the public KB material (website pages from the inventory + the SOP doc) and start the pain-point/FAQ shortlist.
- **DoD:** hello-world app live on Vercel; success metric + stack written down; accounts tested.

### P1 — Skeleton + deploy (Fri, Playbook 14:00–18:00)
- 🛠️ Scaffold the Next.js app; a minimal chat UI calling a stub `/api/chat`; **deploy the empty shell to Vercel today** and keep the URL green from here on.
- **DoD:** a live URL renders a chat box and echoes a stubbed reply.

### P2 — Prepare Data + golden eval set (Guidebook §4, Case study method) (Fri afternoon/evening)
- 🩺 **Knowledge-demand analysis first (Case study §5.1):** list the real top patient questions; decide what to *keep* and explicitly *cut* the low-value content (history/mission/org/awards).
- 🩺 **Manually chunk** the KB for the three clusters (BHYT + procedures + booking) + minimal hospital info; tag metadata + `keywords` + `is_synthetic`.
- 🩺 **Convert prose → structured logic** for BHYT/procedure rules (decision tables/JSON), and **build the engineered artifacts** (need→department, insurance-status→pricing-path maps) + the **VI synonym/abbreviation dictionary**.
- 🩺 **Build the golden eval sets *before* the pipeline exists** (§4/§6): `emergency-cases.json` (~20–30 labelled cases incl. the tricky "mentions a symptom but isn't an emergency" ones), `scope-cases.json` (in-scope / out-of-scope / borderline queries — incl. off-topic and harmful examples), and `faq-cases.json` (question → expected source). **Include several compound multi-intent queries** (e.g. pricing + booking) with the expected topics **and** `booking_intent` labelled, for the §9(a3) eval.
- 🛠️ Write `lib/rag/ingest.ts`: curated chunks → **embed via FPT `vietnamese-embedding` → upsert into pgvector** (with metadata + generated `fts`), load structured rules + dictionary. Run it to populate the DB.
- **DoD:** curated KB embedded and loaded into pgvector (dense + `fts` both queryable); structured rules + dictionary committed; eval sets exist and are held out.

### P3 — Build the pipeline: baseline → hybrid RAG + rerank (Guidebook §5, Case study + §5.7) (Fri night, Playbook 18:00–24:00)
- 🛠️ **Baseline first:** zero-shot `gpt-oss-20b` answer with no retrieval — measure it, so retrieval's value is proven not assumed (a great before/after demo beat).
- 🛠️ Then the **hybrid golden path:** query normalization → topic route → **dense (FPT embed + pgvector) ⊕ keyword/FTS → RRF fusion → FPT `bge-reranker-v2-m3` rerank → top-k** → `gpt-oss-20b` answer **with citations**; wire the "I don't know" grounding gate and the keyword-only fallback. The reranker is part of the golden path, not a later add-on.
- **DoD:** on the live URL, an in-scope question (incl. a paraphrase not using the KB's exact words) returns a correct, cited answer via hybrid retrieval + rerank; an out-of-scope one returns the honest fallback.

### P4 — Guardrails: emergency + scope (Sat morning) — the differentiator
- 🩺 Finalise the emergency intent taxonomy + labelled examples + the exact escalation copy (grounded in the public 115 line / HD.25.01); write the fixed **out-of-scope default response** (§6.2) and confirm the in-scope allowlist.
- 🛠️ Implement `emergency/{classify,responses,case}.ts` + `app/api/emergency/route.ts`, wired as **step 2 (before RAG)** — the classifier is the **sole** detector, on emergency it shows the safe message **and raises the mocked support case**, and it **fails safe** on classifier error; then `scope/{classify,responses}.ts`, wired as **step 3 (after emergency, before RAG)**; add the distinct **EMERGENCY**, **out-of-scope**, and **"I don't know"** UI states.
- 👥 Test against `emergency-cases.json` (100% recall) and `scope-cases.json` (off-topic → default response; in-scope answered; **an oddly-phrased emergency still escalates, never declined as off-topic**).
- **DoD:** true-emergency cases escalate, **raise a support case**, and skip RAG; a simulated classifier failure **falls safe** to the safety notice; off-topic/harmful cases return the default response and skip RAG; in-scope cases proceed; benign symptom-mentions don't trigger emergency.

### P5 — Mocked booking handoff (Sat midday)
- 🛠️ `booking/mock-data.ts` + `/api/booking`; booking-intent detection in the pipeline; handoff CTA to website/Zalo/hotline; label the data simulated.
- **DoD:** asking to book surfaces realistic slots + a working handoff CTA.

### P6 — Evaluate + polish + harden (Guidebook §6) (Sat afternoon → **feature freeze 23:00**)
- 👥 Run the eval harness: **retrieval quality (fused recall@k, then precision@k after rerank) and answer quality (LLM-as-judge) measured separately**, one variable changed at a time; re-run the emergency recall check; **record tokens, retrieval/rerank latency & $/conversation across the three FPT endpoints** for the cost story (§12).
- 👥 **Vietnamese generation-quality check on `gpt-oss-20b`** (fluency + faithfulness on the VN faq-cases). If it's weak, **swap to a stronger FPT-catalog model (Qwen3/DeepSeek) via one env var** and re-measure — decide before feature freeze.
- 🛠️ **Tune** the hybrid mix (RRF inputs, candidate N, rerank top-k) against the eval set; confirm the reranker's precision lift vs. fusion-only. Add a lightweight query-rewrite only if eval shows a real gap.
- 🛠️ Polish the golden-path UI, citation chips, Vietnamese copy, loading/error states; make the emergency + "I don't know" states obviously visible.
- **DoD:** eval numbers (incl. cost) recorded; UI clean on the golden path; **features frozen at 23:00**.

### P7 — Deploy & productionize (Guidebook §7) (Sat night → Sun AM)
- 🛠️ Add the app `Dockerfile`; confirm the **model endpoints are env-swappable** (all three point at FPT via one base URL + key, and can move to a dedicated FPT / on-prem GPU endpoint by changing that variable); enable **prompt caching** on the static prefix; add **retries/timeouts** around all FPT calls + the **keyword-only fallback**; write the privacy posture (no PII stored, stateless, KB is public content, inference in FPT's VN/JP region) into the README.
- **DoD:** `docker build` runs for the app; README documents run + deploy + privacy; the model base URL/key swaps via one env var; a simulated FPT-endpoint failure degrades to keyword-only instead of erroring.

### P8 — Deliverables + submit (Sun, Playbook 07:00–10:00)
- 👥 Record the ≤5-min **demo video** (safety net), finalise slides, project description (state the AI-native core + requirement coverage explicitly for the Round-1 AI screen), and the **AI-collaboration log**; final deploy; **submit by 10:00** (gate 11:00, no extensions).
- **DoD:** all six deliverables submitted; live URL verified from a fresh device.

### Iterate — roadmap only (Guidebook §9), *not* the 48h
For the business/pilot story (not to build now): further retrieval gains (query rewriting, multi-vector/ColBERT, learned fusion weights), real hospital API integration, moving inference to **dedicated FPT AI Factory capacity or on-prem GPU** at higher volume / for the strictest data posture, and the ASR/TTS bonus. Frame these as the post-pilot roadmap. (The vector DB + reranker are already in the core build, not roadmap.)

---

## 9. Testing & evaluation plan (Guidebook §6)

Evaluation is a thread, not a final step. Use the held-out golden sets from P2 consistently.

- **(a) Emergency eval (the one that matters most):** run `emergency-cases.json` against the LLM classifier; the target metric is **recall on true emergencies = 100%** (a miss is a project failure; a false positive that routes a well patient to reception is acceptable). Also verify an emergency verdict **raises the support case**, and that a **simulated classifier failure (error/timeout) falls safe** to the safety notice instead of proceeding to RAG. Report the recall number out loud in the pitch.
- **(a2) Scope eval:** run `scope-cases.json` — **out-of-scope/harmful queries return the default response (not an answer)**, **in-scope queries proceed to a real answer**, and **an oddly-phrased emergency still escalates** (precedence check, never declined as off-topic). Tune for **low false-decline on in-scope** questions; a rare false-decline is safer than answering off-topic, but shouldn't turn away real patients.
- **(b) Retrieval vs. generation separated:** measure **retrieval** apart from **answer quality** (LLM-as-judge: correct + grounded + cited). For retrieval, report **fused recall@N** (did the right chunk/rule survive fusion?) *and* **precision@k after rerank** (did the reranker put it in the top-k?), and compare **dense-only vs keyword-only vs fused vs fused+rerank** to prove each arm and the reranker earn their place. Change one variable at a time (keywords, dictionary, RRF inputs, rerank top-k).
- **(c) Baseline vs. retrieval:** keep the P3 zero-shot baseline numbers to demonstrate the retrieval pipeline's lift.
- **(d) Cost/latency (the case-study metric):** record **tokens and $ per conversation** summed across the **three FPT endpoint calls** (embed + rerank + `gpt-oss-20b`) plus **embedding + rerank latency per turn** on the eval set, and project $/day at hospital scale (§12) — this number goes on a slide. (The FPT free credit covers the whole eval.)
- **(a3) Multi-intent eval:** run a set of **compound queries** (e.g. *"is there a heart check-up combo? I want to book?"*) and verify the answer **addresses every intent** — the informational part is retrieved and answered (multi-label topics + rerank), **and** `booking_intent` fires the booking handoff *in addition to* that answer. Also confirm a single-topic query still answers cleanly (no spurious booking CTA).
- **(e) Booking-intent flow:** a set `booking_intent` fires the handoff (and can co-occur with an informational answer); non-booking questions don't attach it.
- **(f) Manual cold E2E:** someone who didn't build it runs the top ~15 real questions on the live URL, plus the emergency, out-of-scope (default response), and "I don't know" paths.
- **(g) Latency sanity:** first-token and full-response time acceptable for a live demo.
- **(h) Backup:** the recorded demo video guards against on-stage network/model flakiness.

---

## 10. Deployment & the hospital-readiness story (requirement #6)

- **Demo:** Vercel — reliable, push-to-deploy, preview URLs. This is what the judges click.
- **Readiness narrative (the "solution provider" bit):** all inference already runs on **FPT AI Factory — a Vietnamese sovereign cloud (VN/JP data centers)** — not a foreign vendor. The app is a **Docker image** that runs on Vercel, hospital-controlled infra, or an FPT VM; the model endpoints are **env-swappable** (shared FPT serverless for the demo → **dedicated FPT capacity or on-prem GPU** by changing one base-URL variable). Say this explicitly — it's a direct, credible answer to "can the hospital actually run this, and where does the data go?".
- **Privacy/security posture:** TrustTim **stores no patient PII**, is **stateless** (history lives only in the client request), its knowledge base is **public content only**, and **inference stays in-region on FPT (Vietnam/Japan)** rather than a US API. If a judge asks about healthcare-data-regulation compliance, the honest answer is: *"the MVP processes no personal or clinical data and runs inference in a Vietnamese sovereign cloud; the production upgrade is dedicated FPT capacity or on-prem GPU so nothing leaves hospital-controlled infrastructure, with PII handling designed in at that stage."* Be honest that serverless pay-as-you-go still transits FPT's shared inference — the dedicated/on-prem tier is the answer for the strictest posture. Don't overclaim compliance you haven't done.

---

## 11. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Serverless statelessness breaks "memory" | Med | App resends *minimal* history each call; no in-process session state assumed. |
| Retrieval misses paraphrases/slang | Med | **Hybrid** covers it from both sides: semantic (VN embeddings) catches paraphrases, keyword+dictionary catches exact terms/abbreviations, RRF fuses them, and the cross-encoder reranks — measured via the dense-vs-keyword-vs-fused eval (§9b). |
| Multi-intent query answered only partially (one intent retrieved, another missed) | Med | **Multi-label** intent (`informational_topics[]` + `booking_intent`, §6.2); retrieval uses a **soft topic filter** (union, never single-topic exclusion) so both intents' chunks enter the pool; the **reranker** sorts across topics; the generation prompt must **address all parts**; booking handled as an action. Validated by the §9(a3) multi-intent eval. |
| FPT AI Factory endpoint unavailable / slow / rate-limited, or free credit exhausted | Med | Retries + timeouts on all three calls; **retrieval degrades to keyword-only** if embed/rerank fails; **the emergency path fails safe** (classifier error → show the safety notice, never silently skip); the KB is embedded **offline** at ingest so only the live query hits the embed endpoint; monitor the credit budget; recorded demo video as backstop. |
| **`gpt-oss-20b` Vietnamese generation quality weaker than a frontier model** | Med | Eval on the doctor's VN faq-cases (§9); if short, **swap to a stronger FPT-catalog model (Qwen3/DeepSeek) via one env var** — the strict grounding prompt + reranked context also reduce the burden on the model. |
| VN embedding/rerank quality weak on medical/insurance jargon | Low-Med | FPT's models are **Vietnamese-tuned**; the keyword arm + structured rules backstop rare exact terms; validate on the doctor's eval set. |
| pgvector index tuning at KB scale | Low | HNSW index + topic-scoped `where` filters keep searches fast; managed free tier for the demo, managed/on-prem Postgres for production. |
| **Emergency false-negative** (a real emergency missed) | Low but critical | LLM classifier tuned for **100% recall** on the doctor's labelled set (recall over precision); doctor-owned taxonomy + test set; hard-coded response; **fail-safe on classifier error** (default to the safety notice). **Emergency runs before the scope gate** so a distress message is never filtered as off-topic. |
| Emergency detection now depends on the FPT LLM endpoint (deterministic keyword screen removed) | Med | **Fail-safe:** classifier error/timeout → show the safety notice, never silently proceed; retries + short timeout on the call; recall-tuned classifier; recorded demo backup. (Accepted tradeoff for a single clear detection path.) |
| Scope gate over-filters a legitimate in-scope question (false decline) | Med | Deterministic in-scope pass-through; **bias-to-answer when unsure** (let borderline through to retrieval); grounding gate is the backstop; tune on `scope-cases.json` (§9a2). |
| Pricing/schedule data not scrapable (JS-rendered, per inventory) | High | Fall back to clearly-labelled synthesized data (`is_synthetic`); don't let scraping become a time sink. |
| Live-demo network/model flakiness | Med | Prompt caching + retries; recorded demo video as backup. |
| 2-person time budget overrun | Med | Escalate-only-as-needed (no fine-tuning/agents); feature freeze Sat 23:00; deploy Day 1. |
| Scope creep beyond the 3 clusters | Med | Locked scope in the analysis doc; treat everything else as roadmap (§8 Iterate). |

---

## 12. Cost & economics (the case study's headline result, applied)

The Yersin admissions bot handles **2,000–4,000 conversations/day for ~$2/day**. Hanoi Heart Hospital's ~2,500–3,000 outpatients/day is the same order of magnitude, so the same economics are achievable — *if* we keep tokens tight. Everything runs **pay-as-you-go on FPT AI Factory** (three cheap metered calls per turn), and every choice above trims the meter:

| Lever | Effect on cost |
|---|---|
| **All models pay-as-you-go on FPT** | No self-hosted GPU and no per-hour bill — we pay only per call, and **FPT's free credit ($100, incl. $70 inference) covers the entire hackathon** (event cost ≈ $0). |
| **Keyword arm + structured rules** | Much retrieval work happens in plain TypeScript / SQL FTS — free — narrowing before the embed/rerank/LLM calls run. |
| **Small LLM (`gpt-oss-20b`) on clean context** | Generation + classification run on a cheap model; a clean, reranked context keeps quality high without a bigger model (Case study). |
| **Minimal conversation history** | Only relevant context is resent, not the whole transcript — fewer tokens per turn on every FPT call. |
| **Prompt caching** | The fixed system-prompt/preamble prefix is cached — cheaper repeated calls. |

**Illustrative estimate (to validate with real numbers during eval, not to quote blindly):** the per-conversation cost is three cheap FPT calls — a short embedding, a rerank over a handful of candidates, and a `gpt-oss-20b` generation on clean, reranked context with minimal history (a few thousand tokens, vs. the ~50k a naive auto-RAG pipeline burns). At `gpt-oss-20b`'s open-model pricing that keeps a full day of hospital-scale traffic in the **low single-digit USD/day** range, plus a small Postgres/pgvector instance (free managed tier for the demo). Both are what P6 (§9) measures and puts on a slide.

**Why this matters beyond the demo:** a credible, concrete operating cost ("runs the hospital's entire front-line FAQ for roughly the price of a coffee per day, on Vietnamese cloud infrastructure") is exactly the kind of tangible claim that scores on **Business Feasibility & Pilot Roadmap (20 pts)** — and it's honest, because the architecture is genuinely built for it and the numbers are measured, not guessed.

---

*TrustTim is deliberately the **right-sized**, cheapest system that fully satisfies the brief: prompting + hybrid RAG (semantic + keyword, fused and reranked) on our own pgvector store, with the LLM, embeddings, and reranker all served **pay-as-you-go on FPT AI Factory** — a Vietnamese sovereign cloud, one OpenAI-compatible integration, nothing to self-host, and free credits covering the demo. The KB is large enough to need real semantic retrieval — so we add exactly that and no more. As the case study puts it, "sometimes the highest-leverage optimization is not a larger model; it is simply understanding the data better than anyone else." That understanding — plus a reranker to enforce it and a doctor-owned safety layer on top — is what lets two people ship something real, safe, cheap, and demoable in 48 hours.*
