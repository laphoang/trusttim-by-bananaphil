# TrustTim — Pitch Deck Content (English, ~5 min)

Narrated pitch deck for VAIC 2026, project **TrustTim** by **Team BananaPhil**. Built to open with
the wow moment, stay concise, and cover every rubric criterion. This is the ~5-min Round-2 version;
a 4-min live-pitch trim is noted at the end.

**Rubric coverage (100 pts):** Technical 20 · AI-Native Architecture 20 · Business Feasibility 20 ·
UX 15 · Safety/Grounding 15 · Presentation 10. Each slide below is tagged with the criteria it
targets. The team's natural edge — a real cardiologist on the team — anchors Safety + UX; the doctor
is the lead voice on pain, business, and close.

> **Before recording:** confirm the exact current model names for Slide 5 against the code / `.env`.
> `Project-Description.md` states retrieval (embeddings + reranker) runs on FPT AI Factory and
> generation/classifiers on OpenAI (`gpt-4.1-mini`). The slide keeps this deliberately light.

Live app: https://trusttim-by-bananaphil.vercel.app/

---

## Slide 1 — Title / Wow Hook · *(Safety, Presentation)*

**TrustTim — the AI that knows when *not* to answer.**

> "At a heart hospital, the most important thing an AI can do is recognize a heart attack and get
> out of the way."

- Team BananaPhil
- Live: https://trusttim-by-bananaphil.vercel.app/
- **Visual:** screenshot of the red emergency card with the "Gọi 115 ngay" (Call 115 now) button.

---

## Slide 2 — The Pain · *(Business, Presentation)* — doctor opens

- 2,500–3,000 outpatients a day. A jammed hotline and long reception queues.
- The same logistics questions, all day long: *"Is my BHYT accepted? What does this procedure cost?
  When is Dr. X in? How do I book?"*
- And hidden in that flood — someone typing *"I have chest pain right now and can't breathe."*

> Doctor: "Every day at reception, routine questions bury the one that's actually an emergency."

---

## Slide 3 — The Solution · *(AI-Native Architecture)*

- **TrustTim** — a Vietnamese AI assistant that answers **grounded only in the hospital's own
  knowledge base. It never invents.**
- **Safety-first:** every message is triaged for emergency *before anything else runs.*

> Why AI is essential, not decoration: "This product cannot work without AI — it reads free-text
> Vietnamese symptoms and hospital policy in real time. No rule tree does that."

---

## Slide 4 — Live Demo · *(Technical, Safety, UX)*

> "Let me show you the one thing that matters." → switch to the live app.

The three beats the judges will watch:
1. **Emergency escalation** — same-second triage to 115, no chat.
2. **Grounded, cited answer** — every fact links to the hospital's own page.
3. **Real booking handoff** — an action, not a chat dead-end.

*(See `Live-Demo-Script.md` for the full demo run.)*

---

## Slide 5 — AI-Native Architecture · *(Technical, AI-Native Architecture)*

**Flow:** message → **severity guardrail (fails safe)** → intent / scope → **hybrid retrieval**
(Vietnamese embeddings ⊕ Postgres full-text search, RRF-fused) → **reranker + grounding gate** →
grounded generation + citations.

- **AI at three layers:** triage, retrieval, generation.
- **Sovereign-cloud & deployment-ready:** retrieval on FPT AI Factory (Vietnam data residency);
  Dockerized, env-swappable, no PII stored, stateless. Live on Vercel today.

---

## Slide 6 — Why It's Trustworthy · *(Safety, UX)* — the doctor's edge

- Emergency taxonomy authored by a **real cardiologist on our team**, tuned for recall on the
  `serious` class.
- **Grounding gate** → "I don't know — here's the official channel" instead of hallucinating.
- Every answer **cites its source**; snapshot / synthetic data is explicitly labelled.
- **Fails safe:** if the classifier errors, it escalates rather than guesses.
- Committed eval harness: `npm run eval` → `RESULTS.md` (emergency recall, scope accuracy, retrieval
  recall/precision, cost & latency).

---

## Slide 7 — Business & Pilot Roadmap · *(Business Feasibility)* — doctor delivers

- **Who pays:** the hospital — TrustTim deflects hotline/reception load; every FAQ it absorbs frees
  CSKH staff for the cases that need a human.
- **Pilot:** a 3-month pilot at Hanoi Heart Hospital's Voluntary Department — start read-only
  (FAQ + triage), then wire the live booking/EMR endpoint behind the existing `/api/booking`.
- **Market:** every Vietnamese hospital has this exact problem; TrustTim is env-swappable to any
  hospital's knowledge base — change config, not code.
- **Honest scope:** booking is mocked and schedule/pricing are dated snapshots — both clearly
  labelled, each with a concrete next step.

---

## Slide 8 — Close · *(Presentation)* — doctor closes

> "As a physician, I would put this in front of my patients tomorrow."

- Recap in four words: **Grounded. Safe. Deployable. AI-native.**
- Live URL + repo. Thank you.

---

## Live-pitch trim (Round 3, 4 min + 2 min Q&A)

Merge Slides 3 + 5 into one "solution + architecture" slide; keep 1 → 2 → 4 → 6 → 7 → 8. The live
demo stays the centerpiece. Prep a Q&A cheat-sheet by judge archetype (domain expert → let the
doctor answer; technical → the 30-sec architecture; non-technical → the clean UX + "who uses this";
senior → the scale/market story).
