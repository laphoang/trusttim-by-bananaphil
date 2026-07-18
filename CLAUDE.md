# VAIC 2026 — Team BananaPhil / Project "TrustTim"

This repo tracks materials for **Team BananaPhil**'s entry to **Vietnam AI Innovation Challenge 2026 (VAIC 2026)**: an AI customer-care assistant for **Hanoi Heart Hospital**, project-named **TrustTim**.

## Where things live

### `hackathon_docs/guide/` — our active strategy & pitch docs (canonical)

| File | Purpose |
|---|---|
| `VAIC2026_Hackers-guidebook.en.md` | English translation of the official VAIC 2026 hackathon guidebook: rules, timeline, prize structure, judging panel composition, logistics. |
| `VAIC2026_Winning-Playbook.md` | Our own strategy doc — 48-hour build timeline, how to analyze the problem statement, how to read/exploit the scoring criteria, pitch structure, role split. |
| `Project-Pitch.md` | Our finalized project name (**TrustTim, by Team BananaPhil**), solution brief (what/for whom/standout), and elevator pitch. |
| `VAIC2026_Scoring-Criteria-Guide.md` | The official 3-round evaluation pipeline (AI pre-screen → judge review top 30–40 → live Demo Day top 10) and the 100-point, 6-criteria rubric, with per-criterion guidance and an effort-allocation table. |
| `VAIC2026_Problem-Statement-Analysis.md` | Section-4-framework analysis of the actual problem statement: end-user/pain extraction, recommended narrow scope (BHYT + procedures + booking + emergency safety), the death-trap vs. winning-shape contrast, the proposed one-sentence product framing, a mapping to the 100-point rubric, and the list of critical open questions the team still needs to answer. |
| `TrustTim_Architecture-and-Implementation-Guide.md` | The buildable blueprint for TrustTim: system architecture (Next.js all-in-one on Vercel; **all three models pay-as-you-go on FPT AI Factory via one OpenAI-compatible client — `gpt-oss-20b` (LLM) + `vietnamese-embedding` + `bge-reranker-v2-m3`**; **hybrid keyword + semantic retrieval over our own pgvector** — with the case study's deterministic rules/dictionary retained as the keyword arm + a keyword-only fallback; **two input guardrails run before retrieval — an LLM-classifier emergency guardrail that escalates + raises a mocked support case (fail-safe on classifier error), then a scope filter that answers any non-hospital question with a fixed default response**), a tool-by-tool stack table (why/benefits/drawbacks), knowledge/retrieval design (manual chunking, prose→structured-logic, query normalization, pgvector schema), a cost & economics section (FPT free credits cover the demo), repo structure, an 8-phase build/deploy/test plan mapped to `AI Project Guidebook.md` + the 48h timeline, and a risk register (incl. gpt-oss-20b VN-quality swap path). Cost/lightweight approach follows `university_admissions_chatbot_case_study.md`. |
| `AI Project Guidebook.md` | General phase-by-phase AI/LLM project methodology (Frame → Choose Approach → Select Models → Prepare Data → Build → Evaluate → Deploy → Agentic → Iterate), with the escalation ladder, core mental models, and per-phase checklists. The methodology the architecture guide applies. |
| `university_admissions_chatbot_case_study.md` | Real-world case study (Yersin University Vietnamese admissions RAG chatbot) — 2,000–4,000 conversations/day at ~$2/day via knowledge-demand analysis, manual chunking, prose→structured-logic, and deterministic-first multi-stage retrieval. The cost-effective/lightweight blueprint TrustTim's architecture follows. |

### `hackathon_docs/problem_statement/` — the actual challenge materials (canonical)

| File | Purpose |
|---|---|
| `Hanoi_heart_hospital_problem_statement.md` | The official VAIC challenge brief: build an AI customer-care assistant for Hanoi Heart Hospital (FAQs, booking integration, no-hallucination requirement, emergency-symptom escalation requirement, deployment readiness). |
| `PROCEDURE_FOR_PATIENT_RECEPTION_OUTPATIENT_EXAMINATION_TREATMENT.md` | English translation of the hospital's real internal SOP (QT.25.01) for patient reception and outpatient care at Voluntary Area 1 — grounds the product in the hospital's actual workflow and references the real emergency-escalation instruction (HD.25.01). |
| `Hospital-Website-RAG-Inventory.md` | Investigation of the real hospital website (benhvientimhanoi.vn) for RAG-grounding content: a data inventory table, the directly-usable content found (hospital overview, Voluntary Dept. services, and the full booking/contact block incl. the public 115-emergency line), the pricing/schedule pages that need a scraping decision (JS-rendered, not simple-fetchable), and known gaps not yet investigated. |

### `hackathon_docs/archive/` — historical/original sources only

Contains the original source PDFs (scanned/exported) and superseded Vietnamese-language drafts that predate the reorganization into `guide/` and `problem_statement/`. **Do not open or reference these for future tasks** — the files in `guide/` and `problem_statement/` above are the up-to-date, canonical versions to use instead.

## Quick lookup — "I need to..."

- **...check hackathon rules, timeline, prize money, or who's judging** → `hackathon_docs/guide/VAIC2026_Hackers-guidebook.en.md`
- **...plan what to build hour-by-hour, or re-check our winning strategy** → `hackathon_docs/guide/VAIC2026_Winning-Playbook.md`
- **...get our project name or pitch copy for slides/submission** → `hackathon_docs/guide/Project-Pitch.md`
- **...know exactly how points are scored, round-by-round, or how to budget the 48 hours against the rubric** → `hackathon_docs/guide/VAIC2026_Scoring-Criteria-Guide.md`
- **...see our analyzed/locked solution direction, or the open questions we still need to answer** → `hackathon_docs/guide/VAIC2026_Problem-Statement-Analysis.md`
- **...know how to actually build/deploy/test TrustTim, the stack, the FPT AI Factory model endpoints (gpt-oss-20b + vietnamese-embedding + bge-reranker-v2-m3), the hybrid pgvector retrieval design, the guardrails (emergency + scope filtering), and why each tool** → `hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md`
- **...follow the general AI/LLM project methodology or phase checklists** → `hackathon_docs/guide/AI Project Guidebook.md`
- **...see the real-world lightweight/cheap RAG case study that shapes our cost & retrieval approach** → `hackathon_docs/guide/university_admissions_chatbot_case_study.md`
- **...check what the challenge actually requires us to build** → `hackathon_docs/problem_statement/Hanoi_heart_hospital_problem_statement.md`
- **...ground the emergency-escalation logic or a real hospital workflow detail** → `hackathon_docs/problem_statement/PROCEDURE_FOR_PATIENT_RECEPTION_OUTPATIENT_EXAMINATION_TREATMENT.md`
- **...find real content to ground the RAG knowledge base, or check what's scrapable from the hospital website** → `hackathon_docs/problem_statement/Hospital-Website-RAG-Inventory.md`

## Maintenance

Whenever a new file is added to `hackathon_docs/guide/` or `hackathon_docs/problem_statement/`, or an existing one is majorly rewritten/replaced, **update the tables above in the same change** so this index never goes stale.
