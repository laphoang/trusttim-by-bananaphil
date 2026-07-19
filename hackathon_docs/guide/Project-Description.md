# Project Description — TrustTim, by Team BananaPhil

*Vietnam AI Innovation Challenge 2026 · AI customer-care assistant for Hanoi Heart Hospital.*
**Live demo:** https://trusttim-by-bananaphil.vercel.app/ · **Repo entry points:** [`README.md`](../../README.md) · [`ARCHITECTURE.md`](../../ARCHITECTURE.md) · [`RESULTS.md`](../../RESULTS.md)

> For patients and families contacting Hanoi Heart Hospital, TrustTim instantly answers their real
> booking, BHYT, and procedure questions from the hospital's own official information — and the
> moment a question sounds like a cardiac emergency, it stops chatting and gets them to real
> emergency care immediately, so no one is ever given a chatbot answer when they needed a hospital.

---

## 1. What we're building

**TrustTim is a grounded, Vietnamese-first RAG assistant embedded on the Hanoi Heart Hospital
website that answers the hospital's real logistics questions strictly from its own knowledge base,
hands users off to real booking channels, and — before it answers anything — checks whether the
message is a cardiac emergency.**

Concretely, it is a chat widget that resolves the five question clusters that jam the hotline and
reception queue every day: **appointment booking, examination/treatment procedures, BHYT insurance
coverage and service pricing, general hospital information, and doctor schedules.** Every
informational answer is generated *only* from retrieved, cited chunks of the hospital's curated
knowledge base ([`hackathon_docs/kb/`](../kb/)); when the assistant has no confident source, it
says **"I don't know — here's who to ask"** and routes to the official hotline rather than guessing.
When a message is a booking request, it attaches a real call-to-action to the hospital's booking
channels instead of pretending to have completed the booking itself.

**The pipeline is safety-first and runs in a fixed order** — [`lib/chat/pipeline.ts`](../../README.md):

1. **Normalize** the query with a Vietnamese synonym/abbreviation dictionary.
2. **Symptom & emergency guardrail** — a `gpt-4.1-mini` severity classifier tags the message
   `serious` / `normal` / `none`. `serious` → fixed escalation + a mocked support-case handoff;
   `normal` → fixed "can't examine, please book" redirect. Both short-circuit the rest of the
   pipeline. It **fails safe**: a classifier error shows the safety notice, never silently
   continues.
3. **Intent & scope guardrail** — a multi-label classifier over the five in-scope intents; anything
   outside them gets a fixed default response.
4. **Hybrid retrieve** — dense (`vietnamese-embedding` over pgvector) ⊕ keyword (Postgres FTS)
   fused with Reciprocal Rank Fusion, soft-filtered to the matched intents.
5. **Rerank + grounding gate** — `bge-reranker-v2-m3` scores candidates; no confident candidate →
   "I don't know."
6. **Generate** — `gpt-4.1-mini` produces a grounded answer with citations.
7. **Booking action** — a CTA is attached whenever `booking` is a matched intent, alone or beside
   the informational answer.

The full map is in [`ARCHITECTURE.md`](../../ARCHITECTURE.md); the implementation and the reasons
behind each choice are in [`README.md`](../../README.md) and the architecture guide alongside this
file.

**Requirement coverage** (the six things the brief asks for → where TrustTim delivers each):

| Brief requirement | How TrustTim meets it |
|---|---|
| FAQ answering (BHYT, procedures, hospital info, doctor schedules) | Hybrid RAG over the curated KB — retrieve → rerank → grounded generation (`lib/rag/`, [`hackathon_docs/kb/`](../kb/)) |
| Booking integration | Per-facility booking CTA attached whenever `booking` is a matched intent — CS1 (92 Trần Hưng Đạo) → the hospital's Zalo Mini App, CS2 (695 Lạc Long Quân) → the website booking page, plus the 1900 1082 hotline; mocked booking service behind `/api/booking` |
| Conversational experience | Vietnamese chat widget with distinct UI states per response type (grounded answer, emergency, "I don't know", out-of-scope); structured data (e.g. BHYT/pricing) renders as clean tables, and citations link to the hospital's real source pages |
| Grounded / no-hallucination, "I don't know" | Grounding gate at rerank + a distinct fallback message; every grounded answer carries its citations |
| Emergency detection & escalation | Severity classifier runs **before everything else**; fixed doctor-authored escalation copy; fails safe on error |
| Deployment readiness | [`Dockerfile`](../../README.md) + all model endpoints env-swappable; live on Vercel today |

**The honest MVP boundary, stated up front:** this is a deployed demo. The booking integration is
*mocked* (no live hospital API), and the schedule/pricing data is a dated snapshot — deliberate
48-hour scope calls, detailed in §3's "MVP scope" block so the rest of this document reads as
credible rather than aspirational.

---

## 2. Who it's for

**Primary users are the ~2,500–3,000 outpatients and family members who arrive at Hanoi Heart
Hospital every single day** — a broad, often anxious, often elderly population trying to get a
correct answer to a logistics question without waiting on a jammed hotline or queuing at reception.

Today they get staff-dependent, inconsistent answers, or no answer until they've waited. The pain
is not exotic: it's the same handful of questions — *Is my BHYT card accepted here? What does this
procedure involve? How much will it cost? When is Dr. X available? How do I book?* — asked
thousands of times a day across a hotline, a website, and social channels that all field the same
traffic (Problem-Statement Analysis §1). The hospital's own intake SOP shows this domain is
genuinely hard: BHYT-vs-self-pay branching, transfer letters, priority categories, multi-counter
routing. A shallow chatbot gets this wrong; a grounded one earns trust.

**Secondary users are the hospital's reception and customer-service (CSKH) staff** — the people
actually overloaded today. Every repetitive FAQ TrustTim absorbs is one the staff no longer field,
freeing them for the cases that genuinely need a human.

**And there is one hidden, high-stakes user the brief explicitly calls out: the person whose
"question" is actually a cardiac emergency.** Someone typing *"I have chest pain right now and can't
breathe"* is not asking an FAQ — and at a *heart* hospital, treating that message as routine chat is
the single most dangerous thing the system could do. TrustTim is built so this interaction can never
be handled as an FAQ. That user shapes the entire architecture, which is why safety runs first.

---

## 3. What stands out — the best features for *this* hospital

TrustTim's distinctive features are ordered by what wins on *this specific brief*: a cardiac
hospital where safety and trust are the highest-scoring, hardest-to-fake criteria (Analysis §4, §6).
Each item is a feature with a reason, and where it matters, why a generic team can't credibly copy
it.

### a. Clinical-safety rigor — the emergency guardrail (the real differentiator)

Every team at this hackathon can wire an LLM to a FAQ. Almost none can correctly build the one
requirement that matters most at a cardiac hospital: **recognizing when a "question" is actually an
emergency.**

TrustTim's first pipeline stage — before retrieval, before any answer — is a **three-way severity
classifier** (`none` / `normal` / `serious`) powered by `gpt-4.1-mini`:

- **`serious`** → a **fixed, doctor-authored escalation message** (call 115 / go to the nearest
  Emergency Department) plus a **mocked support-case handoff**. The LLM never free-generates in this
  path; the copy is the doctor's own verbatim wording from the knowledge base, not an engineer's
  guess at what to say.
- **`normal`** (a symptom mentioned but not an emergency) → a **fixed "I can't examine or diagnose,
  please book an appointment" redirect** — never a medical answer.
- **Fails safe** → if the classifier itself errors or times out, TrustTim shows the safety notice
  rather than silently continuing. **Safety never depends on a successful model call.**

Two things make this hard to copy. First, the taxonomy is **doctor-owned**: distinguishing *"what
causes chest pain?"* (informational) from *"I'm having chest pain right now"* (emergency) is a
clinical judgment call an engineer should not be making alone — and our team has a physician who
owns it. Second, it's **tuned for recall on the `serious` class**: at a cardiac hospital a missed
emergency is unacceptable, so the guardrail is deliberately biased toward escalating when in doubt.
This is the single highest-stakes interaction in the entire brief, and it's the one place "just wire
up an LLM" is not safe.

### b. Grounded, no-hallucination answering

Trust — the "never make things up" requirement — is the #1 risk the brief names, and it's half our
project's name. TrustTim's answer to it is visible, not asserted:

- **Hybrid retrieval** combines dense semantic search (`vietnamese-embedding` over our own pgvector
  store) with keyword/full-text search and structured BHYT/procedure rules, fused via RRF, over the
  hospital's **own curated knowledge base** — not the open web, not model memory.
- **A reranker (`bge-reranker-v2-m3`) plus a grounding gate** means an in-scope question with no
  confident retrieved context gets **"I don't know → official channels,"** distinct from the
  out-of-scope decline. The system would rather admit ignorance than guess.
- **Every grounded answer shows its citations as a link to the hospital's real source page**
  (the internal chunk id/title stays out of the user-facing answer — logs only), including an honest
  `is_synthetic` / `freshness` caveat for illustrative or time-boxed data (e.g. the doctor-schedule
  snapshot). The user can see exactly what the answer was built from, and structured data such as
  BHYT coverage and pricing renders as a clean table rather than raw text.

This is the visible, demoable answer to the brief's central worry — and it directly scores the
Safety and UX criteria that carry the most weight on this problem.

### c. Vietnamese-first and multi-intent aware

TrustTim is built for how real Vietnamese patients actually type, not for clean English test cases:

- A Vietnamese **embedding model and reranker**, plus a **synonym/abbreviation dictionary**
  ([`hackathon_docs/kb/dictionary.json`](../kb/dictionary.json)) that normalizes the messy,
  colloquial, abbreviation-heavy ways patients phrase things before retrieval even runs.
- **Multi-label intent classification**, so a single message that both books an appointment *and*
  asks about a check-up package gets **both** handled — not one intent silently dropped, which is
  exactly the failure a single-label classifier would produce on a real patient's run-on question.

### d. Built to actually run inside a Vietnamese hospital (sovereignty + deployment-readiness)

Deployment readiness (requirement #6) is usually where demos are hand-wavy. TrustTim's is concrete
and doubles as its pilot-adoption case:

- **Retrieval (embeddings + reranking) runs on FPT AI Factory** (Vietnam/Japan sovereign cloud);
  generation and classifiers run on OpenAI. For a public hospital, data-sovereignty principles are
  applied: the most sensitive retrieval operations (vector similarity search over private patient
  FAQs) stay within Vietnamese-controlled infrastructure; generation can leverage frontier models
  outside that perimeter as long as queries go through them correctly sanitized.
- **No patient PII is stored, and the service is stateless** — conversation history lives only in
  the client request. The knowledge base is public/hospital-provided content only, protected with
  Supabase row-level security.
- **It's Dockerized and env-swappable.** Moving from the demo to dedicated FPT capacity or an
  on-prem hospital GPU is a change to `API_BASE_URL` / `API_KEY` / the model-name variables — a
  config change, **not a rewrite** ([`Dockerfile`](../../README.md), [`.env.example`](../../README.md)).

This is the direct, credible answer to the two questions a hospital IT owner will actually ask:
*"Can we run this ourselves, and where does patient data go?"* — which is what makes a pilot
believable rather than a promise.

### e. It does something — not just chats

The Analysis (§4) names the death-trap for this brief precisely: *"chats but doesn't actually do
anything."* TrustTim avoids it with a **real, per-facility booking handoff** — attached to any
booking-intent message, it offers each site's own real channel: **CS1 (92 Trần Hưng Đạo) via the
hospital's Zalo Mini App, CS2 (695 Lạc Long Quân) via the website booking page**, plus the
1900 1082 hotline. It's a workflow with an action at the end, not a conversation that dead-ends in
text.

### f. Built to be understood — by both readers

The repo is written for two audiences at once: the AI evaluator that reads it at every checkpoint,
and the human engineer who reviews it.

- A **clean, navigable tree** with a requirement-literal [`README.md`](../../README.md) and a
  scannable [`ARCHITECTURE.md`](../../ARCHITECTURE.md).
- A **committed evaluation harness** — `npm run eval` measures emergency recall, scope accuracy,
  retrieval recall/precision, and cost/latency against held-out sets and writes
  [`RESULTS.md`](../../RESULTS.md), so completeness is *reproducible*, not merely claimed. (An
  offline `npm run selfcheck` covers RRF fusion, normalization, the response-envelope unwrap, Zod
  validation, and the fail-safe path with no network.)
- A **docs-to-code AI-collaboration trail**: the specs in `hackathon_docs/guide/` are the blueprint
  that was handed to the coding agent to build the app — the docs-to-code handoff is itself the
  project's AI-collaboration artifact.

### MVP scope / next increments (the honest block)

Every strong claim above is bounded by deliberate 48-hour scope calls. Naming them is a credibility
feature, and they match the README's own "Known simplifications" exactly:

- **Mocked booking** — no live hospital API; the handoff routes to (mocked) official channels.
  *Next:* wire the real hospital booking/EMR endpoint behind the same `/api/booking` interface.
- **Snapshot schedule/pricing data** — the doctor-schedule and pricing KB is a dated snapshot with
  explicit `freshness` metadata. *Next:* a live feed or a scheduled refresh job.
- **Non-streaming FPT calls** — the response envelope + SSE shape are under-documented, so the UI
  does a client-side typewriter reveal instead of real token streaming. *Next:* real streaming once
  the SSE contract is confirmed.
- **No multi-turn memory yet** — each turn is classified and retrieved independently. *Next:* the
  architecture guide's "minimal history" design.
- **Structured rules as retrievable chunks** — BHYT/procedure rules are ingested as KB chunks rather
  than a bespoke slot-filling engine, because the reranker already generalizes over prose and rules
  alike. *Next:* a dedicated rule engine only if evals show retrieval falling short on rule lookups.

None of these weaken the parts that win: the safety guardrail, the grounding, and the deployability
are fully built and live.

---

## 4. Why this is the winning shape

A generic team wires an LLM to a FAQ document and calls it a customer-care assistant. **TrustTim is
the parts that are hard to copy and that matter most at a heart hospital: the doctor-owned emergency
guardrail that runs before anything else and fails safe, the grounded-and-cited answering that
refuses to guess, and the sovereign-cloud, Dockerized deployability a real hospital could actually
pilot.** Those are the exact places a generic chatbot loses on this brief — and they're where our
team has an edge no engineer-only team can credibly fake.
