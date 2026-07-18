# VAIC 2026 — Scoring Criteria Guide

> The official evaluation pipeline and rubric, translated and broken down into concrete guidance for a 2-person team (data engineer + MD). Companion to `VAIC2026_Winning-Playbook.md` — read that first for overall strategy, use this file to understand exactly how points are won.

---

## 1. The 3-round evaluation pipeline

Every submission goes through three rounds. Understanding this pipeline matters because **each round has a different judge (or non-judge) and a different bar to clear** — optimizing only for the final round's rubric while ignoring Round 1 can get you eliminated before a human ever sees your work.

| Round | Who evaluates | Who's still in | What happens |
|---|---|---|---|
| **Round 1 — AI Pre-Screening** | An automated AI screener | All teams | First-pass automatic screening of every submission. |
| **Round 2 — Judge Review** | Expert human judges | Top 30–40 teams | Judges evaluate the qualifying projects in depth against the 6-criteria rubric. |
| **Round 3 (LIVE) — Demo Day** | Judges, live | Top 10 teams | Live pitch: **4 minutes presentation + 2 minutes Q&A** in front of judges. |

**The 100-point, 6-criteria rubric (below) is what Round 2 and Round 3 judges use.** Round 1 doesn't score you on these 100 points directly — it's a **gate**. Treat it as pass/fail: if an automated screener can't tell that your submission satisfies the brief, you never reach the humans who would otherwise reward your doctor's insight. See Section 2.

---

## 2. Round 1 — passing the AI pre-screen (easy to overlook, cheap to secure)

An AI reads every submission before any human does. It is almost certainly pattern-matching your **project description and README** against the problem statement's explicit requirements. This means:

- **State your requirement coverage explicitly and plainly.** Don't rely on the screener to infer that you handle something — say it in plain language, ideally in the same terms the brief uses. For this challenge, that means explicitly naming:
  - Knowledge-based FAQ answering (booking, procedures, BHYT, pricing, schedules)
  - Hospital system/API integration (or the honest scope of what you integrated with)
  - Conversational experience (text; note ASR/TTS if attempted)
  - Trustworthy, grounded responses (no hallucination, explicit "I don't know" behavior)
  - Emergency detection & escalation
  - Deployment readiness (privacy/security posture)
- **Don't bury this in clever framing.** Save the storytelling for the human-judged rounds (Section 8 of the Playbook). In the written project description, be almost boringly literal about which requirement each feature satisfies.
- **A working live URL and a clean README are cheap, high-confidence signals** an automated screener can verify — prioritize having both over having more features.

---

## 3. The 6 scoring criteria (100 points total)

### 3.1 Technical Implementation Quality — 20 pts

**What it likely measures:** Does the thing actually work? Code quality, architecture soundness, reliability of the live deployed app under judge use.

**Guidance for this team:** This is exactly what the Playbook's stack choice (Section 3) and "feature freeze" discipline (Section 7) are built to protect. A small, simple, **reliably working** app scores higher here than an ambitious one that breaks under judge poking. Keep the golden path narrow and bulletproof.

**Proof points to bake in:**
- Live URL that never crashes on the golden path, tested by someone other than the builder.
- Clean, documented public GitHub repo (clear README: problem, architecture, how to run).
- No visible errors, loading stalls, or broken states during a cold demo.

### 3.2 AI-Native Architecture & Innovation — 20 pts

**What it likely measures:** Is AI genuinely central and reasonably well-architected — not a thin prompt wrapper bolted onto a static site? This is the rubric's version of the "AI-Native Oath" gate from the hackathon rules.

**Guidance for this team:** Make the AI's role impossible to miss. Have a rehearsed 30-second explanation of your architecture (RAG grounding, why Claude, how the emergency-detection logic works) ready for both the written description and any judge question. The **AI collaboration log** (a required deliverable) doubles as evidence here — use it to also document how AI powers the product, not only how you used AI to build it.

**Proof points to bake in:**
- One clear sentence: "The product doesn't work without AI because ___."
- A demo moment where AI visibly does something a simple script or if/else tree couldn't — e.g., handling a messy, real-sounding question the FAQ document doesn't literally contain, and still answering correctly and safely.

### 3.3 Business Feasibility & Pilot Roadmap — 20 pts

**What it likely measures:** Is there a believable path from hackathon demo to real-world adoption? Who would actually pay for or pilot this, and what happens in the next few months?

**⚠️ Correction to prior instinct:** this is worth exactly as much as Technical Implementation and AI-Native Architecture. Don't under-invest in it as an afterthought — it's a full fifth of your score, tied for the single highest weight in the rubric.

**Guidance for this team:** This is where the doctor's real-world credibility does double duty. She doesn't just make the *problem* believable (Playbook Section 1) — she makes the *pilot* believable: "a hospital like the one I trained at would actually pilot this" lands very differently coming from a physician than from an engineer's guess. Build the 2-slide business story from Playbook Section 6 into a concrete, named-type pilot roadmap: who the first pilot partner would realistically be, what the next 3 months look like, and roughly how big the opportunity is in Vietnam.

**Proof points to bake in:**
- A specific (even if illustrative) next pilot partner and a 3-month plan, not just "we'll scale nationally."
- A rough, honest TAM/market framing — a credible small claim beats a grandiose vague one.
- The doctor delivering this part of the pitch, or at least visibly co-authoring it.

### 3.4 AI-Native UX & Design Thinking — 15 pts

**What it likely measures:** Is the interface designed around how a person should actually use AI output — trust, editability, clarity — rather than just "a chatbot bolted onto a webpage"?

**Guidance for this team:** This directly matches the Playbook's "assistive, human-in-control" framing (Section 4.4): a good AI-native UX visibly lets a human review, trust, or override the AI rather than blindly consuming it. Spend real, conscious polish time on this during Saturday's "harden the workflow" block — one exceptionally clean screen beats five mediocre ones.

**Proof points to bake in:**
- A visible moment of human-in-the-loop review or approval in the demo (not just an answer appearing).
- Uncluttered UI on the golden path — no dead buttons, no placeholder text, no debug output visible.
- Grounded answers that visibly show *where* the information came from (a citation, a source reference), reinforcing both UX and the safety criterion below.

### 3.5 AI Safety, Grounding & Trustworthiness — 15 pts

**What it likely measures:** Exactly what the challenge brief calls out explicitly: no hallucination, honest "I don't know" behavior, and — for this specific hospital brief — correct emergency-symptom detection and escalation.

**Guidance for this team:** This is your single strongest natural advantage in the entire rubric. The doctor-designed emergency-escalation logic (chest pain / shortness of breath / fainting → immediate redirect to emergency care, never a chatbot answer) is precisely what this criterion rewards, and it's the one place competing engineer-only teams are most likely to get it wrong or skip it. **Make it visible, don't just implement it quietly** — a judge who never sees the emergency path triggered doesn't know it exists.

**Proof points to bake in:**
- A live demo moment that intentionally triggers the emergency-escalation path, shown deliberately, not accidentally.
- A normal FAQ answer that visibly shows grounding (e.g., "According to hospital policy X…") rather than a bare confident-sounding sentence.
- At least one clean "I don't know — here's who to ask" moment shown in the demo, proving the system doesn't bluff.

### 3.6 Presentation & Solution Defense — 10 pts

**What it likely measures:** How well the team presents and handles live questioning — defending design decisions, answering credibly under pressure.

**Guidance for this team:** Lowest weight of the six, and the only criterion that only applies if you reach Round 3 (Top 10). It is also the cheapest to secure — it's purely a function of rehearsal, not new building. Prepare a short **Q&A cheat-sheet** in advance: anticipate the kind of question each judge archetype is likely to ask (a Technical Judge probing architecture, a Domain Expert probing clinical accuracy, a Senior Judge probing scale) and have a crisp, agreed answer ready so you're not improvising under pressure.

**Proof points to bake in:**
- The pitch rehearsed out loud at least 5 times (per Playbook Section 7/12).
- A written Q&A prep sheet with the 5–8 most likely questions and one-line answers, split by who answers what.
- Smooth handoffs between the two of you — a visibly rehearsed transition reads as competence on its own.

---

## 4. Effort-allocation table — where to actually spend your 48 hours

| Criterion | Points | % of 100 | What this means for your time budget |
|---|---|---|---|
| Technical Implementation Quality | 20 | 20% | Necessary, but bounded — once the golden path reliably works, stop polishing code and move on. |
| AI-Native Architecture & Innovation | 20 | 20% | Get the architecture explanation crisp; don't over-engineer beyond what you can explain in 30 seconds. |
| **Business Feasibility & Pilot Roadmap** | 20 | 20% | **Tied for the highest weight.** Do not treat this as a low-effort afterthought — budget real, dedicated time (not 15 minutes on Sunday morning) to make the pilot story concrete and doctor-credible. |
| AI-Native UX & Design Thinking | 15 | 15% | Consciously polish this during Saturday's hardening block — it's part of your natural edge (see below). |
| AI Safety, Grounding & Trustworthiness | 15 | 15% | Your strongest natural edge — make it *visible* in the demo, don't just implement it and hope a judge notices. |
| Presentation & Solution Defense | 10 | 10% | Cheapest points in the rubric: pure rehearsal, no new building. Never skip it, but don't over-invest at the expense of the above. |

**Two things this table should change about how you plan your 48 hours:**

1. **The business/pilot story is not a "2-slide, low-effort" checkbox** — it's worth as much as your entire technical build. Treat Playbook Section 6 as a real work item with dedicated time, not something you improvise the morning of submission.
2. **Safety/Grounding (15) + UX (15) = 30 combined points — more than Technical Implementation alone (20) — and this pair maps almost exactly onto what your doctor teammate is uniquely positioned to get right.** This is your strongest argument for why this team wins, and it should be the centerpiece of both your build priorities and your pitch narrative, not a footnote.

---

## 5. Round 3 — Demo Day: two different assets, two different time limits

The Playbook already tells you to prepare "a ≤5-minute demo video." Do not confuse that with the live Round 3 pitch — **they are two separate assets with two different constraints**, and conflating them means rehearsing the wrong length for the one that matters most on stage:

| Asset | Length | When it happens | Judged by |
|---|---|---|---|
| **Recorded demo video** | ≤ 5 minutes | Pre-recorded, submitted as part of your deliverables before Sunday 11:00 | Round 2 judges (Top 30–40 review) |
| **Live Demo Day pitch** | **4 minutes presentation + 2 minutes Q&A** (6 min total on stage) | Live, Sunday ~15:30, only if you make Top 10 | Round 3 judges, live |

**Practical implication:** rehearse both, separately, at their actual lengths. The live pitch is *shorter* than the video (4 min vs. 5 min) — if you only ever rehearse the 5-minute version, you'll run over on stage. Trim a dedicated 4-minute cut of your pitch arc (Playbook Section 8) specifically for Demo Day, and rehearse the 2-minute Q&A block separately using the Q&A cheat-sheet from Section 3.6 above.

---

## 6. Quick-reference summary table

| # | Criterion | Points | One-line focus |
|---|---|---|---|
| 1 | Technical Implementation Quality | 20 | Simple and reliably working beats ambitious and fragile. |
| 2 | AI-Native Architecture & Innovation | 20 | Make AI's central, load-bearing role unmistakable. |
| 3 | Business Feasibility & Pilot Roadmap | 20 | Concrete, doctor-credible pilot plan — equal weight to tech, don't skimp. |
| 4 | AI-Native UX & Design Thinking | 15 | Visible human-in-the-loop review, clean golden path. |
| 5 | AI Safety, Grounding & Trustworthiness | 15 | Your biggest natural edge — show it, don't just build it. |
| 6 | Presentation & Solution Defense | 10 | Cheapest points: rehearse the pitch and the Q&A. |

**Total: 100 points.**
