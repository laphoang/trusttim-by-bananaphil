# VAIC 2026 — Winning Playbook
## Healthcare Track · 2-Person Team · Target: Best Performance (Overall #1)

> Written for a 2-person team — a data engineer (2y, new to LLM apps, basic full-stack) and a general-medicine MD — competing in the **Health & Wellness** track and aiming for the **$1,000 Best Performance / overall #1** prize.
>
> **Read this once fully now. Re-read Section 7 (timeline) and Section 12 (cheat sheet) during the event.**
>
> **See also:** `VAIC2026_Scoring-Criteria-Guide.md` — the full breakdown of the official 3-round pipeline and 100-point rubric, with per-criterion guidance. Section 5 below summarizes it; that file has the details.

---

## 0. TL;DR — How you actually win

You will **not** out-engineer the strong teams. There will be teams with 4–6 senior engineers, better frontends, and slicker infra. Trying to beat them on technical firepower is a losing game.

You win by out-**insighting** them. Your teammate is a **real doctor**. Almost every other healthcare team is engineers *guessing* at what clinicians need. That is your single biggest, rarest, unfair advantage — and the entire strategy below is built to exploit it.

**The one sentence to tattoo on your brain:**

> **Pick one painfully specific, real clinical workflow she has personally lived through, and build one narrow, polished, genuinely-usable AI-native slice of it. Depth and credibility beat breadth and features.**

The 5 things that decide the prize, in order:
1. **A working, deployed demo** that does *one thing* convincingly (not five things half-broken).
2. **A real, specific clinical problem** a judge believes is real (your doctor makes this unarguable).
3. **A clear, central AI-native core** — AI is the engine, not a garnish.
4. **A story the judges remember** — one patient, one clinician, one moment of pain solved.
5. **A crisp ≤5-minute pitch** where the doctor vouches for it live.

Everything else is detail.

---

## 1. Your two advantages and one liability

**Advantage 1 — A real clinician on the team.** This is worth more than two extra engineers. She gives you:
- **Problem credibility** — you'll pick a problem that's real, not invented. Judges (especially the Domain Expert and Non-tech Industry judge) can smell a fake healthcare problem in 10 seconds.
- **Realistic test data & content** — she can hand-write believable clinical cases, notes, patient dialogues, and edge cases so your demo looks like the real thing.
- **Live authority in the pitch** — "I'm a doctor, and here's the problem I hit every shift" is the most powerful opening line in the room. No engineering team can fake it.

**Advantage 2 — You're only two people.** Small is fast: no coordination overhead, one conversation to change direction, no arguing about scope in a group of six. Use this to move quickly and cut ruthlessly.

**Liability — Limited engineering and business firepower.** You mitigate it three ways:
1. **AI code-generation tools** do the heavy lifting (see Section 4).
2. **Genius Station mentors** (15–20 experts, 24/7) are free senior engineers — use them aggressively at every Mentor Wave and whenever you're stuck for >30 min.
3. **Ruthless scope** — you can't build a lot, so build *one thing* extremely well. Your smallness forces the focus that actually wins hackathons.

---

## 2. Pre-event prep (do this BEFORE July 17)

Preparation is the cheapest points you'll ever score. Most teams waste the first 6 hours on setup and tool-fighting. You won't.

### 2.1 Know the rules boundary (don't get disqualified)
- **The core product/code MUST be built during the 48 hours.** You cannot pre-build the product.
- **But you CAN, and should, prepare:**
  - Learn and rehearse your tools until they're muscle memory.
  - Create all accounts and test them (Claude API, Vercel, GitHub, FPT AI Factory).
  - Prepare a **reusable, generic boilerplate/design system that is NOT the product** — auth scaffolding, a component library, a deployment template. (Be conservative here; when in doubt, keep it generic and disclose it.)
  - Collect **public** medical resources/datasets and reference material you might draw on.
  - Keep an **AI collaboration log** habit ready to start at hour 0 (it's a required deliverable).
- **Never use** real patient data, sensitive personal data, or illegally-collected data (Chapter 4.3). Use synthetic/public data or data your doctor writes by hand. This is both an ethics rule and a safety-of-your-pitch issue.

### 2.2 Attend the workshops (they're free rehearsal + judge intel)
- **Jul 4 — AI Engineering** and **Jul 5 — Ship to Product**: your technical crash course. Attend both.
- **Jul 12 — Pitching**: the single most under-valued session. The pitch decides the top prize. Go.
- **Jul 11–12 — Partner/Expert Sessions (FPT, Meta, AISG)**: mentor faces + hints about what sponsors value.
- **Jul 6 — Firechat (Software Defensibility)**: useful for your "why is this defensible / ends in a startup" slide.

### 2.3 Wire up the toolchain and test it end-to-end (on a throwaway app)
Before the event, deploy a trivial "hello world" app through your **entire** pipeline so that on Day 1 it's a solved problem:
- Claude API key working, billing sorted.
- **FPT AI Factory credits** — Top-5 teams get $10k in cloud credits; understand how to plug them in *before* you need them. Even a light, credible use of the sponsor stack helps.
- GitHub repo template ready (public).
- Vercel project connected to GitHub with auto-deploy — push to main → live URL. Test this works.
- Practice generating a UI with **v0 / Lovable / Cursor** so you're fast at it.

### 2.4 The doctor's homework (the highest-leverage prep of all)
Have her **pre-write a shortlist of 5–8 concrete clinical pain points** she has personally experienced. For each:
- **The workflow**: what actually happens, step by step.
- **Who suffers**: doctor / nurse / patient / admin — and how.
- **Why current tools fail**: what's missing today.
- **How often & how costly**: frequency and impact.

When the problem statement drops at 11:00 on Jul 17, you match it against this list instead of brainstorming from zero. This can save you 3–4 hours and lands you on a *real* problem while other teams are still guessing.

---

## 3. Recommended tech stack (tuned to "basic full-stack")

Be **deliberately boring**. Hackathons are won by teams that ship, not teams with the fanciest architecture. Every choice below optimizes for *speed to a working deployed demo*.

| Layer | Choice | Why |
|---|---|---|
| App / frontend | **Next.js on Vercel** | You know basic full-stack; AI tools generate great Next.js; Vercel = push-to-deploy in seconds. |
| UI generation | **v0 / Lovable / Cursor + Claude** | Don't hand-craft UI. Describe it, generate it, tweak it. |
| AI core | **Claude API** (use a current Sonnet model for the app loop) | Fast, strong reasoning, easy to integrate. This is your product's engine. |
| Knowledge | **Small, curated RAG** over a handful of trustworthy docs *she* selects | Grounds the AI in real medical references → credibility + safety. Keep it small; a giant RAG is a time sink. |
| Data | Synthetic / public / doctor-written cases | Safe, legal, and controllable for the demo. |
| Infra | Managed everything (Vercel, hosted vector store or even in-memory) | Zero DevOps. You have no time for infra. |

**Deploy on Day 1, not Day 2.** A deployed skeleton on Friday night that you improve is infinitely safer than a local app you scramble to deploy Sunday morning.

**On the PyTorch prize ($5,000, separate):** it requires meaningful PyTorch/custom-model work — that plays *against* your strengths and eats time. **Do not contort your solution to chase it.** Your target is Best Performance. Only touch PyTorch if your solution genuinely needs a trained model (unlikely for an LLM-app approach).

---

## 4. How to analyze the problem statement (first 60–90 minutes after 11:00, Jul 17)

The statement drops at 11:00. The teams that win spend the first 90 minutes *choosing well*, not coding. Run this framework:

### 4.1 Extract the essentials (15 min, whiteboard it)
Answer, in writing:
- **Who is the real end-user?** (A specific role: an ER nurse? a rural GP? a discharge coordinator? a patient with condition X?)
- **What single task or decision** are they doing that's painful?
- **What does "better" mean here?** Faster? Safer? Cheaper? Fewer errors? Less burnout?
- **What's the current painful workflow?** Draw the "before" steps.
- **Where can AI remove the MOST pain in the fewest steps?**

### 4.2 Apply the doctor's filter (10 min)
She asks of every candidate idea: **"Would a real doctor / nurse / patient actually use this, and is it safe and credible?"** If she'd roll her eyes at it, kill it. This filter alone puts you ahead of most engineer-only teams.

### 4.3 Apply the scope filter (10 min)
Ask: **"Can we demo one complete, believable slice of this in ~30 hours of building?"** If no, narrow the idea until the answer is yes. It is always better to do a tiny thing completely than a big thing partially.

### 4.4 Avoid the healthcare death-traps
These lose:
- ❌ **"Our AI diagnoses disease X."** Unsafe, unprovable in 48h, and judges (especially the doctor-adjacent ones) distrust diagnostic claims. Don't.
- ❌ **Boil-the-ocean platforms** ("a complete hospital OS"). No demo can back it up.
- ❌ **A generic chatbot** with no real workflow behind it. Every team builds one; none win with it.

These win:
- ✅ **Assistive / decision-support / workflow-automation** framings where **AI augments a clinician** and a human stays in control. Examples of *shapes* (not your answer — match the real statement): drafting something a clinician then approves; triaging/prioritizing a queue; summarizing/structuring messy information; catching omissions; automating a tedious documentation step.
- ✅ Anything where **your doctor can stand up and say "this saves me 20 minutes every shift and I'd use it tomorrow."**

### 4.5 The output of this step
One sentence, written on the wall, that everything else serves:

> **"For [specific user], our product does [specific job] so that [specific outcome]."**

If you can't fill that in cleanly, you're not ready to build yet.

---

## 5. How to analyze and exploit the scoring criteria

The **official rubric is now known** — full details and per-criterion guidance live in `VAIC2026_Scoring-Criteria-Guide.md`. Here's the condensed version plus what you already know from the judging panel.

### 5.1 The pipeline and the rubric

Three rounds: **Round 1 — AI Pre-Screening** (all teams); **Round 2 — Judge Review** (top 30–40 teams, scored on the rubric below); **Round 3 (LIVE) — Demo Day** (top 10 teams, 4-min pitch + 2-min Q&A, same rubric). **An AI reads your repo at every one of these checkpoints — not just Round 1** — and that analysis assists the human panel, who make the final call. README quality, code structure, deployment readiness, architecture/AI-native legibility, and product completeness all count, straight from the repo (see `VAIC2026_Scoring-Criteria-Guide.md` §2). So keep the repo AI-legible from the first commit, and treat the README + a clean tree + committed eval results as evaluated artifacts, not a code dump.

**The 100-point rubric:**

| # | Criterion | Points |
|---|---|---|
| 1 | Technical Implementation Quality | 20 |
| 2 | AI-Native Architecture & Innovation | 20 |
| 3 | Business Feasibility & Pilot Roadmap | 20 |
| 4 | AI-Native UX & Design Thinking | 15 |
| 5 | AI Safety, Grounding & Trustworthiness | 15 |
| 6 | Presentation & Solution Defense | 10 |

**Two things this changes about how you should think:**
- **Business Feasibility (20 pts) is tied with Technical Implementation (20) and AI-Native Architecture (20).** It is not a minor afterthought — it's a full fifth of your score. Section 6 below needs real, dedicated time, not 15 rushed minutes.
- **Safety/Grounding (15) + UX (15) = 30 combined points — more than Technical Implementation alone — and this pair is almost exactly your team's unfair advantage** (the doctor's clinical judgment powering both the emergency-escalation logic and the human-in-control UX). Make this the centerpiece of your demo, not a quiet implementation detail.

For each criterion, assign an owner (him or her) and a **concrete demo moment** that visibly "shows" it — if a criterion has no moment in your demo, you're leaving points on the table. See the full guide for a per-criterion breakdown and proof-point checklist.

### 5.2 Play to the four judge archetypes
You know the panel types. Prepare **one crisp line for each**:

| Judge | What they reward | Your line / move |
|---|---|---|
| **Domain Expert** | Real problem fit, market/operational reality | Let the doctor speak. "This is a real problem I face because…" |
| **Technical Judge** | Sound architecture, clear AI integration, it actually runs | A clean, simple, *working* deployed app + a 30-second architecture explanation. Simple-and-working > clever-and-broken. |
| **Non-tech Industry Judge** | Usability, "would a normal person use this?" | A clean UX and an obvious "who uses this and how" story. |
| **Senior Judge (Demo Day)** | Scale, market value, long-term impact | Your 2-slide business/impact story (Section 6). |

Three of these four reward **problem fit, usability, and impact** — exactly your strengths. Lean into them.

### 5.3 Treat "AI-Native" as a scored gate
- AI must be **unmistakably central** — the product doesn't work without it. Say so explicitly in the pitch and the description.
- Keep the **AI collaboration log from hour 0** (required deliverable) — how you used AI to build *and* how AI powers the product.

### 5.4 "Ends in a Startup" — don't skip the business story
Even though you feel weak here, prepare a **2-slide business/impact story**: who would pay, rough Vietnam market size (TAM), and what the next 3 months look like. The doctor makes this credible ("hospitals like the one I trained at would pilot this"). Weak business framing loses winnable prizes; a simple credible one is enough.

---

## 6. The business/impact mini-story (2 slides — worth as much as your entire technical build)

**Business Feasibility & Pilot Roadmap is worth 20 of 100 points — tied with Technical Implementation and AI-Native Architecture.** Don't budget this as a rushed Sunday-morning afterthought; give it real, dedicated time during the build.

1. **The problem & who pays** — the real user, the cost of the status quo (time/money/errors), and who'd buy it (a clinic? a hospital? a telehealth company? the patient?).
2. **The path forward** — market size in Vietnam (order-of-magnitude is fine), why it's defensible (your clinical insight + data flywheel), and a concrete next 3 months (pilot with N clinics).

Keep it honest and simple. Judges reward a credible small claim over a grandiose vague one. Lean on the doctor's real-world credibility here: "a hospital like the one I trained at would actually pilot this" is a far stronger pilot-roadmap claim coming from a physician than an engineer's guess.

---

## 7. The 48-hour timeline (hour-by-hour)

Anchored to the real agenda: **Checkpoint 1** Sat 10:00–12:00 (project name + description), **Checkpoint 2** Sat 21:00–23:00 (live URL + public GitHub), **submission closes Sun 11:00 (no extensions)**, Top-10 presentations Sun 15:30.

> **Governing rule: a deployed thing that does one thing convincingly beats a broken thing that tries to do five.**

### FRIDAY, JULY 17

**11:00–14:00 — Choose, don't build.**
- Statement drops at 11:00. Run the Section 4 framework.
- **Lock the problem and the one-sentence pitch by ~13:00.** Write it on the wall.
- Do the scope cut: define the *single* workflow slice you'll demo. Write down what you are explicitly NOT building.
- Register team name + track before 10:00 confirmation (per rules; do earlier if possible).

**14:00–18:00 — Prototype on paper, seed content, deploy an empty shell.**
- She: writes the realistic clinical content, sample cases, and the "happy path" the demo will walk through.
- He: sketch the screens (2–3 max), then **deploy a "hello world" to Vercel today.** Get the pipeline green now.
- Use the **16:00–17:30 sponsor workshops** only if directly useful; otherwise keep building.

**18:00–24:00 — Build the core AI loop (thin vertical slice).**
- One workflow, end to end: input → AI does the valuable thing → useful output on screen.
- Don't build auth, settings, dashboards, or "nice to haves." Just the golden path.
- Push to deploy repeatedly. Keep the live URL working at all times.
- Hit **Genius Station** (opens 12:00, 24/7) the first time you're stuck >30 min.

### SATURDAY, JULY 18

**00:00–10:00 — Make-or-break: a working, deployed demo of the core slice.**
- Goal by ~08:00: someone can open your live URL and watch the one workflow work with believable clinical data.
- Sleep in shifts — don't both crash at once. (Section 11 has the sleep plan.)
- **Checkpoint 1 (10:00–12:00):** submit project name + description + chosen problem + approach. You'll have a real one, not vapor.

**09:00–10:30 — Mentor Wave 1 (technical architecture).** Register your 20-min slot before Jul 16. Bring specific questions: "Is this the simplest architecture? What will break in the demo?"

**10:00–18:00 — Harden the ONE workflow. No new features.**
- Polish the golden path: make it fast, make it look clean, make outputs credible.
- Add the doctor's realistic cases so the demo feels real.
- **Mentor Wave 2 (16:00–17:30, UX/design/business):** get UX and pitch feedback. Ask a mentor to watch your demo cold and tell you where they got confused.

**18:00–23:00 — Checkpoint 2 and FEATURE FREEZE.**
- **Checkpoint 2 (21:00–23:00):** submit live deployed URL + public GitHub repo.
- **Freeze features at ~23:00.** From here, only polish, fix, and prepare deliverables. Adding features now is how teams lose.

**23:00–07:00 (into Sunday) — Polish + produce deliverables.**
- Seed the demo with the most convincing clinical cases.
- **Record the ≤5-min demo video** (this is your safety net if the live demo flakes).
- Draft the slides and the project description.
- Write/finish the AI collaboration log.

### SUNDAY, JULY 19

**07:00–11:00 — Buffer and finalize. Submit early.**
- Finalize all deliverables: **slides · demo video ≤5min · public GitHub · live URL · project description · AI collaboration log.**
- **Submit by 10:00, never 10:59.** The gate closes at 11:00 with no extensions. Uploads fail, wifi dies — give yourself an hour of margin.

**11:00 onward — Pitch prep.**
- Rehearse the live pitch **out loud at least 5 times.** Time it. Cut it to fit.
- Assign roles: she opens with the problem (as a doctor), he drives the demo.
- **15:00** Top-10 announced. **15:30** live presentations, broadcast nationwide. **17:00** awards.

---

## 8. The pitch & demo — where #1 is actually won

Two teams with identical products don't tie: the one that tells the better story wins.

**Two different assets, two different time limits — don't conflate them:**
- **Recorded demo video (≤5 min):** submitted before Sunday 11:00, watched by Round 2 judges (Top 30–40 review).
- **Live Demo Day pitch (4-min presentation + 2-min Q&A):** only if you reach Top 10, performed live Sunday ~15:30. This is *shorter* than the video — rehearse a dedicated 4-minute cut for the stage, or you'll run over.

Structure both around one arc (trim the live version to fit 4 minutes):

1. **The pain (30–45s) — she opens.** A specific patient or clinician moment. "Every night shift, I…" Make the judges *feel* it.
2. **Why it matters (15s).** How often, how costly, who's hurt.
3. **The live demo (2–3 min).** Show the one workflow working. **Lead with the product, not slides.** Narrate what's happening and why it's hard.
4. **The doctor vouches (20s).** "As a physician, I would use this tomorrow." Nobody else in the room can say this credibly.
5. **Impact + what's next (30s).** The 2-slide business story: who pays, the market, the next 3 months.

Demo craft rules:
- **Show, don't tell.** A working click beats a bullet point.
- **Have the recorded video ready** as backup — never let a flaky network kill your demo.
- **Cut mercilessly.** 4–5 minutes is short. One workflow, told well.
- **Practice the transitions** (her → him → close). Smoothness reads as competence.
- **Prep a Q&A cheat-sheet for the 2-minute Q&A block.** Anticipate what each judge archetype will ask (Technical Judge on architecture, Domain Expert on clinical accuracy, Senior Judge on scale) and agree on crisp one-line answers in advance — don't improvise under pressure.

---

## 9. Deliverables checklist (definition of done + owner)

| Deliverable | Definition of done | Owner |
|---|---|---|
| **Live deployed URL** | Opens on any browser, the golden-path workflow works reliably | He |
| **Public GitHub repo** | Public and **AI-legible** (read by an AI evaluator at every checkpoint): README to spec — one-line product statement + live URL, **requirement-coverage table**, architecture section, how AI is used, how to run; plus a clean tree (no dead code/placeholders) and **committed eval results** (`RESULTS.md`). An evaluated artifact, not a code dump. | He |
| **Demo video (≤5 min)** | Recorded, tells the Section 8 arc, works as a backup for the live demo | Both (she narrates) |
| **Presentation slides** | ~6–8 slides: problem, user, solution, live-demo pointer, AI role, impact/business | She leads, he supports |
| **Project description** | Crisp written summary; states the AI-native core explicitly | She |
| **AI collaboration log** | Kept from hour 0; how you used AI to build and how AI powers the product | He |

Do a **dry-run submission** by Saturday night so Sunday is just replacing files, not figuring out the form.

---

## 10. Role split for two people

- **Him (build):** architecture, deployment, AI integration, RAG/data plumbing, keeping the live URL green, GitHub, AI collaboration log.
- **Her (insight + voice):** problem definition, clinical content and test cases, safety/credibility checks, slides, project description, and **lead pitcher**.
- **Shared:** the scope decision (Friday), the demo script, and watching each other's work with fresh eyes.

The doctor is not "the non-technical one who helps" — she is your **product owner and your closer.** Treat her insight as the product's core IP.

---

## 11. Risks & failure modes (and how to not die)

| Risk | Prevention |
|---|---|
| **Scope creep** | Freeze features Sat 23:00. Write the "NOT building" list Friday and obey it. |
| **Deploying too late** | Deploy an empty shell Friday. Keep the URL live the whole time. |
| **Over-claiming clinical accuracy** | Frame as *assistive with a human in control*, never autonomous diagnosis. Say "supports the clinician," show a human approval step. |
| **Live-demo flakiness** | Record the demo video early as a backup. Have a stable dataset for the demo. |
| **Burnout (only 2 people)** | Sleep in shifts — never both at once. One person always guards the live demo. Real rest Saturday night; you can't pitch exhausted. |
| **Tool-fighting eating hours** | All setup done pre-event (Section 2.3). Genius Station on any >30-min block. |
| **Missing the submission gate** | Submit by 10:00 Sunday, not 10:59. No extensions. |
| **Wasting the doctor's edge** | If your idea doesn't need a doctor to be credible, it's the wrong idea. |

---

## 12. One-page cheat sheet (keep this open during the event)

**THE THESIS:** One real clinical workflow she has lived → one narrow, polished, deployed AI-native slice. Depth > breadth. Human-in-control, never autonomous diagnosis.

**FRIDAY**
- 11:00–13:00 Choose the problem (Section 4). Write the one-sentence pitch on the wall.
- 14:00–18:00 Paper prototype + doctor's content. **Deploy empty shell to Vercel TODAY.**
- 18:00–24:00 Build the core AI loop — golden path only.

**SATURDAY**
- By 08:00 Working deployed demo of the one slice.
- 09:00 Mentor Wave 1 (bring specific questions). 10:00–12:00 **Checkpoint 1** (name + description).
- Daytime Harden one workflow, add realistic cases, polish UX. **No new features.**
- 16:00 Mentor Wave 2 (UX + pitch feedback). 21:00–23:00 **Checkpoint 2** (URL + repo).
- **23:00 FEATURE FREEZE.** Then: record demo video, draft slides + description + AI log.

**SUNDAY**
- 07:00–10:00 Finalize 6 deliverables. **SUBMIT BY 10:00** (gate 11:00, no extensions).
- Then rehearse the **live pitch** (4 min + 2 min Q&A — shorter than the demo video, trim separately) out loud ≥5×. 15:00 Top-10. 15:30 stage. 17:00 awards.

**THE 6 DELIVERABLES:** live URL · public GitHub · demo video ≤5min · slides · project description · AI collaboration log.

**THE PITCH ARC:** she opens with real pain → why it matters → live demo of one workflow → "I'm a doctor, I'd use this tomorrow" → impact + next 3 months.

**IF IN DOUBT:** cut scope, keep the demo working, let the doctor talk, and ask a mentor.

---

*Good luck. Your edge is real. Build small, build real, and let the doctor close.*
