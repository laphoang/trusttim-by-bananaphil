# VAIC 2026 — Problem-Statement Analysis (TrustTim)

> This applies the **Section 4 framework** from `VAIC2026_Winning-Playbook.md` to the actual, known problem statement (`docs/problem_statement/Hanoi_heart_hospital_problem_statement.md`), instead of waiting to do it live in the first 90 minutes of the event. Doing it now is a real advantage — but it should still be re-validated fast on Jul 17 in case the on-stage brief adds detail not in the current document.
>
> Cross-references: `VAIC2026_Winning-Playbook.md` (strategy), `VAIC2026_Scoring-Criteria-Guide.md` (rubric), `PROCEDURE_FOR_PATIENT_RECEPTION_OUTPATIENT_EXAMINATION_TREATMENT.md` (real hospital SOP, used as grounding evidence below).

---

## 1. Extract the essentials (Section 4.1)

**Who is the real end-user?**
Primarily: the **~2,500–3,000 daily outpatients and their families** at Hanoi Heart Hospital — a broad, often anxious, often elderly population dealing with a cardiac-specialty hospital's booking, BHYT insurance, and procedure logistics. Secondarily: the hospital's **customer-service/reception staff**, who are the ones actually overloaded today. Explicitly **not** clinicians — this is a patient-facing information product, not a clinical decision-support tool.

**What single task or decision are they doing that's painful?**
Getting a fast, correct answer to a logistics question (booking, BHYT coverage, pricing, procedure steps, doctor schedules) without waiting on a jammed hotline or an inconsistent human answer. Hidden underneath that: a much higher-stakes task the brief explicitly calls out — **recognizing when a "question" is actually a cardiac emergency**, and not letting it get treated as a routine FAQ.

**What does "better" mean here?**
- Instant, 24/7 answers instead of hotline queueing.
- Consistent, correct answers instead of staff-dependent variance.
- Grounded and honest — never a confident-sounding guess.
- Safe — never gives treatment advice; always escalates real emergencies.
- Deflects repetitive load off human staff so they can handle the cases that need a person.

**What's the current painful workflow?**
Per the brief: hotline, website, social channels, and reception staff all field the same repetitive questions, causing delayed responses and inconsistent experiences. The hospital's own internal SOP (`PROCEDURE_FOR_PATIENT_RECEPTION_OUTPATIENT_EXAMINATION_TREATMENT.md`) shows *why* this is genuinely hard to do well: real intake involves BHYT-vs-self-pay branching, transfer letters, priority categories, multiple counters, and multi-step diagnostic routing. This is evidence the underlying domain has real complexity a shallow chatbot would get wrong.

**Where can AI remove the most pain in the fewest steps?**
Two places, not one: (1) instant grounded answers to the highest-volume, highest-confusion FAQ clusters (BHYT, procedures, booking), and (2) a safety layer that reliably catches emergency language and routes it correctly — the one interaction where getting it wrong is unacceptable.

---

## 2. The doctor's filter — reframed for this problem

The Playbook's default framing of the doctor's edge is "a clinical workflow she has personally lived through." **That framing doesn't map cleanly onto this problem** — this isn't a clinical-workflow tool, it's a patient-facing FAQ/logistics assistant. Applying the generic playbook advice unmodified would be a mistake. Here, her edge is two specific things:

1. **Credibility on patient-facing pain and BHYT/procedure complexity** — she can validate (or correct) which FAQ topics are actually the most confusing and painful for patients and families, and write realistic, medically-literate sample content and test cases.
2. **Ownership of the emergency red-flag taxonomy** — she is the one person on the team who can correctly define what counts as an emergency symptom, how to phrase the escalation safely, and how it should differ from a merely-informational question that happens to mention a symptom (e.g., "what are the symptoms of a heart attack?" vs. "I'm having chest pain right now"). This is a clinical judgment call an engineer should not be making alone, and it is the team's single clearest, hardest-to-copy advantage on this specific brief.

---

## 3. Scope filter — the recommended narrow slice

The brief has 6 requirement areas (FAQ answering, system integration, conversational experience, trustworthy responses, emergency handling, deployment readiness). Trying to build all of them deeply in 48 hours is the "boil the ocean" trap the Playbook warns against. Recommended narrow, demoable slice:

**In scope (build deeply):**
- Grounded FAQ answering over a **curated subset of topics** — recommend **BHYT insurance + examination/treatment procedures + appointment booking**, since these are the highest-volume, highest-confusion, highest-complexity topics (confirmed by the real SOP) and the ones where visible grounding matters most.
- The **emergency-escalation safety layer** (requirement #5) — built and demoed deliberately, not as an afterthought.
- A **mocked-but-realistic booking/schedule handoff** (requirement #2) — no real hospital API; simulate a booking/schedule backend convincingly and route users to the (mocked) Website / Zalo Mini App / hotline channels.

**Explicitly out of scope (state this out loud, don't apologize for it):**
- Real hospital API/system integration — mock it, and say so honestly in the project description (this keeps Round 1's automated screener from expecting something you didn't build, and keeps the pitch honest).
- ASR/TTS — the brief marks this as a bonus; only attempt it if the core slice is rock-solid with time to spare.
- Full breadth across every FAQ topic in the brief — depth on 3 topic clusters beats shallow coverage of all of them.

---

## 4. Death-traps vs. the winning shape — applied to this specific problem

Playbook Section 4.4 warns that **"a generic chatbot with no real workflow behind it" is a death-trap that every team builds and none win with** — and this problem statement is, on its surface, exactly a customer-care chatbot. The team's job is to make sure TrustTim doesn't read as that generic chatbot to a judge. Contrast:

| What loses here (generic chatbot) | What wins here (TrustTim) |
|---|---|
| Answers any question with equal (over)confidence | Visibly grounds answers in cited official sources; explicitly says "I don't know, here's who to ask" when it doesn't know |
| Never distinguishes an emergency from routine chat | Deliberately detects red-flag emergency language and escalates immediately, never offering treatment advice — designed by an actual physician |
| Chats but doesn't actually *do* anything | Hands off to a real (mocked) booking/schedule action — a workflow, not just conversation |
| Shallow coverage of everything, confident about nothing specific | Deep, credible coverage of the hardest topics (BHYT, procedures) where the real complexity (per the SOP) shows the team actually understood the domain |
| "We used an LLM" as the whole pitch | The emergency-safety layer and grounding design are the pitch — the part a generic team can't credibly copy |

---

## 5. The one-sentence framing (proposed — confirm as a team)

> **For patients and families contacting Hanoi Heart Hospital, TrustTim instantly answers their real booking, BHYT, and procedure questions from the hospital's own official information — and the moment a question sounds like a cardiac emergency, it stops chatting and gets them to real emergency care immediately, so no one is ever given a chatbot answer when they needed a hospital.**

This is a proposal to align on, not a locked decision — confirm it (or adjust it) together before Jul 17, since it will anchor the pitch (Playbook Section 8) and the project description (Round 1 screening, see the Scoring Criteria Guide Section 2).

---

## 6. Mapping this analysis to the 100-point rubric

| # | Criterion | Points | Where this analysis scores it |
|---|---|---|---|
| 1 | Technical Implementation Quality | 20 | A narrow, reliable slice (3 topic clusters + mocked booking) is easier to make bulletproof than broad shallow coverage. |
| 2 | AI-Native Architecture & Innovation | 20 | RAG grounding over curated official sources is the core engine; the emergency-detection logic is a second, clearly AI-native layer. |
| 3 | Business Feasibility & Pilot Roadmap | 20 | Needs real, separate work (see Critical Question F below) — this analysis sets up the *product* case, not yet the *pilot* case. |
| 4 | AI-Native UX & Design Thinking | 15 | Visible grounding (citations) + a visible escalation moment are UX decisions, not just backend logic — design them to be seen. |
| 5 | AI Safety, Grounding & Trustworthiness | 15 | Directly the emergency-escalation layer + the "I don't know" behavior — the team's single strongest natural-edge criterion. |
| 6 | Presentation & Solution Defense | 10 | The one-sentence framing above is the spine of the pitch; the death-trap/winning-shape contrast is good Q&A ammunition. |

**Reinforces the Scoring Guide's headline insight:** Safety (15) + UX (15) = 30 points map almost entirely onto the emergency-escalation layer and its visible presentation — the team's biggest natural edge on this specific problem. Business (20) is *not* covered by this analysis and needs dedicated separate effort.

---

## 7. Critical open questions to resolve

These are the concrete decisions still needed before or during the event. Each includes why it matters and, where useful, a recommended default.

### A. Scope & knowledge base
1. **Which exact sub-topics within BHYT / procedures / booking get the deepest demo coverage?** (e.g., within BHYT: coverage %, transfer-letter requirements, chênh lệch/co-pay — pick the 5–8 highest-value questions, not the whole space.)
2. **What are the authoritative public sources for each topic cluster** (hospital website pages, published fee schedules, BHYT regulations), and who owns collecting them before Jul 17?
3. **How do we honestly label synthesized/illustrative content** in the demo and pitch, so we never imply we're showing real, live hospital data we don't actually have? (Both an ethics requirement and a credibility issue if a judge asks.)

### B. Emergency safety (the differentiator — doctor-owned)
4. **What is the exact red-flag symptom taxonomy** for this escalation layer? (Severe chest pain, shortness of breath, fainting are named in the brief — what else should trigger it, and what's the threshold for ambiguous language?)
5. **How do we distinguish an emergency-in-progress from a benign informational question that merely mentions a symptom** (e.g., "what causes chest pain?" vs. "I have chest pain right now")? This is the single hardest NLU judgment call in the whole product.
6. **What is the exact, real escalation action/message** the assistant should give — call 115? Go to this hospital's Emergency Department specifically? Call a hospital hotline? (The SOP references a separate work instruction, HD.25.01, for abnormal-finding escalation — worth trying to obtain, since it would let us mirror the hospital's actual real-world protocol instead of inventing one.)
7. **What is the human-in-control boundary?** Confirm the assistant only ever *routes* in an emergency and never offers any medical guidance, reassurance, or triage judgment of its own — where exactly is that line drawn in the copy?

### C. Integration (mocked)
8. **Which single booking channel is the primary demo path** — Website flow, Zalo Mini App, or hotline handoff? Pick one to make deep and convincing rather than three shallow mock paths.
9. **What does the mock schedule/booking data look like**, and how do we make it feel real (realistic doctor names/specialties/time slots) without ever implying it's a live hospital system?

### D. Trust & grounding
10. **How is grounding shown visibly in the UI** — inline citations, a "source" panel, a confidence indicator? (Ties directly to UX criterion #4 and Safety criterion #5.)
11. **What's the exact wording and behavior of the "I don't know" fallback**, and where does it route the user (hotline number? a specific department?)?
12. **How Vietnamese-first should the interface and answers be**, given the real users are Vietnamese patients and families — full Vietnamese UI, or bilingual?

### E. Deployment readiness & privacy (requirement #6)
13. **What's the credible privacy/security story for the pitch**, given there's no real infra or hospital data involved? (e.g., "no PII is stored; the architecture is designed to be deployable on hospital-controlled infrastructure" — draft this line in advance rather than improvising if a judge asks.)
14. **What's the honest answer if a judge asks about healthcare-data-regulation compliance** specifically? Better to have a short, honest, prepared answer than to bluff.

### F. Business / pilot (20 points — needs dedicated work, separate from this doc)
15. **Who at the hospital would realistically own piloting this** — the customer-service/Social Work department (per the SOP's org chart), IT, or hospital leadership?
16. **What's the metric that proves pilot value** — hotline call-deflection %, average response time, patient satisfaction, staff time saved? Pick 1–2 concrete ones.
17. **What does the concrete 3-month pilot plan look like?** (Ties to Playbook Section 6 / Scoring Guide Section 3.3 — this is separate work this document does not cover.)
