# TrustTim — Pitch Deck Content (English, ~5 min)

Narrated pitch deck for VAIC 2026, project **TrustTim** by **Team BananaPhil**. Opens on the
assistant's **breadth of inquiry-answering ability**, then pivots to safety as the payoff/twist,
then closes on business. This is the ~5-min Round-2 version; a 4-min live-pitch trim is noted at
the end.

**Rubric coverage (100 pts):** Technical Implementation 20 · AI-Native Architecture 20 · Business
Feasibility 20 · UX 15 · Safety/Grounding 15 · Presentation 10. Each slide below is tagged with the
criteria it targets. The team's natural edge — a real cardiologist on the team — anchors Safety +
UX; the doctor is the lead voice on pain, business, and close.

> **Before recording:** confirm the exact current model names for Slide 5 against the code / `.env`.
> `Project-Description.md` states retrieval (embeddings + reranker) runs on FPT AI Factory and
> generation/classifiers on OpenAI (`gpt-4.1-mini`). The slide keeps this deliberately light.

Live app: https://trusttim-by-bananaphil.vercel.app/

---

## Slide 1 — Title / Hook (inquiry-first) · *(Safety, Presentation)*

**TrustTim — real hospital answers, grounded in the hospital's own knowledge. Never invented.**

- Team BananaPhil
- Live: https://trusttim-by-bananaphil.vercel.app/
- **Visual:** screenshot of a grounded BHYT-table answer with its **"Nguồn: …"** citation chip —
  not the emergency card. The wow here is trustworthy breadth, not danger.

---

## Slide 2 — The Pain · *(Business, Presentation)* — doctor opens

- 2,500–3,000 outpatients a day. A jammed hotline and long reception queues.
- The same logistics questions, all day long: *"Is my BHYT accepted? What does this procedure cost?
  When is Dr. X in? How do I book?"*
- And hidden in that flood — someone typing *"I have chest pain right now and can't breathe."*

> Doctor: "Every day at reception, routine questions bury the one that's actually an emergency."

---

## Slide 3 — The Solution · *(AI-Native Architecture)*

**One assistant, five topics, one language people actually speak.**

- **TrustTim** answers BHYT/pricing, procedures, hospital info, doctor schedules, and booking — all
  **grounded only in the hospital's own knowledge base. It never invents.**
- **Multi-label:** one message can hit more than one topic at once, and TrustTim answers all of them.
- **Safety-first underneath:** every message is still triaged for emergency before anything else
  runs — more on that later.

---

## Slide 4 — Technical Implementation · *(Technical Implementation)*

- **Next.js on Vercel, TypeScript throughout — live today,** not a prototype.
- **Supabase Postgres + pgvector:** hybrid dense (Vietnamese embeddings) ⊕ keyword (full-text)
  retrieval, fused via reciprocal rank fusion — not one brittle search path.
- **Dockerized, every model endpoint env-swappable** — moving provider or hospital is a config
  change, not a rewrite.
- **Modular codebase:** guardrails, retrieval, and generation are isolated modules (`lib/scope`,
  `lib/emergency`, `lib/rag`), orchestrated by one pipeline function.
- **Committed, runnable eval harness** — `npm run eval` → `RESULTS.md` (emergency recall, scope
  accuracy, retrieval recall/precision, cost & latency), plus an offline `npm run selfcheck`. Not
  "trust us" — a number you can rerun yourself.
- Structured per-turn logs; stateless; no PII stored.

---

## Slide 5 — AI-Native Architecture · *(AI-Native Architecture)*

**Flow:** message → **severity guardrail (fails safe)** → intent / scope → **hybrid retrieval**
(Vietnamese embeddings ⊕ Postgres full-text search, RRF-fused) → **reranker + grounding gate** →
grounded generation + citations.

- **AI at three layers:** triage, retrieval, generation.
- **Sovereign-cloud:** retrieval on FPT AI Factory (Vietnam data residency).

---

## Slide 6 — Live Demo · *(Technical, Safety, UX)*

> "First, watch it answer real hospital questions across every topic. Then watch what happens the
> moment a question isn't routine."

*(See `Live-Demo-Script.md` for the full demo run.)*

---

## Slide 7 — Why It's Trustworthy · *(Safety, UX)* — the payoff, the doctor's edge

- Emergency taxonomy authored by a **real cardiologist on our team**, tuned for recall on the
  `serious` class.
- **Grounding gate** → "I don't know — here's the official channel" instead of hallucinating.
- Every answer **cites its source**; snapshot / synthetic data is explicitly labelled.
- **Fails safe:** if the classifier errors, it escalates rather than guesses.
- The same eval harness from Slide 4, read differently: emergency recall is the number that
  matters most here.

---

## Slide 8 — Business & Pilot Roadmap · *(Business Feasibility)* — doctor delivers

- **Who pays:** the hospital — TrustTim deflects hotline/reception load; every FAQ it absorbs frees
  CSKH staff for the cases that need a human.
- **Pilot:** a 3-month pilot at Hanoi Heart Hospital's Voluntary Department — start read-only
  (FAQ + triage), then wire the live booking/EMR endpoint behind the existing `/api/booking`.
- **Market:** every Vietnamese hospital has this exact problem; TrustTim is env-swappable to any
  hospital's knowledge base — change config, not code.
- **Honest scope:** booking is mocked and schedule/pricing are dated snapshots — both clearly
  labelled, each with a concrete next step.

---

## Slide 9 — Close · *(Presentation)* — doctor closes

> "As a physician, I would put this in front of my patients tomorrow."

- Recap in four words: **Grounded. Safe. Deployable. AI-native.**
- Live URL + repo. Thank you.

---

## Live-pitch trim (Round 3, 4 min + 2 min Q&A)

Merge Slides 4 + 5 into one "Under the hood" slide (stack + architecture flow together); keep
1 → 2 → 3 → 6 → 7 → 8 → 9. The live demo stays the centerpiece. Prep a Q&A cheat-sheet by judge
archetype (domain expert → let the doctor answer; technical → the 30-sec architecture; non-technical
→ the clean UX + "who uses this"; senior → the scale/market story).
