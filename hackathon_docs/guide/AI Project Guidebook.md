# AI Project Guidebook

A phase-by-phase playbook for starting and running a new AI/LLM project, synthesized from the Week 1–8 course references in this folder. Each phase tells you what to decide, what to watch out for, and where to go for the deep dive.

## How to use this guide

Work through the phases roughly in order — but expect to loop back. Real projects bounce between "Evaluate" and "Build," and sometimes "Frame the Problem" gets revisited after Phase 3 reveals a model can't hit your constraints. Every phase ends with a **Checklist**. Cross-references like `→ Week 5 §12` point to the numbered section in that week's file for full detail, code, and worked examples. Week 1&2 has two independent numbering sequences (one per week), so those are marked `(W1)` or `(W2)`.

## Core mental models (keep these in your head the whole time)

- **LLMs predict tokens, not truth.** They're optimized to sound convincing, not to be correct — hallucination is the default, not an edge case. → Week 1&2 (W1) §8
- **Models are stateless.** Nothing is remembered between API calls; "memory" is your application resending history every time. → Week 1&2 (W1) §4
- **The product is not the model.** Memory, web search, tools, UI — these are engineering layers built *around* the model, not model capabilities. → Week 1&2 (W1) §9, §10
- **Treat the LLM like a hardworking junior analyst.** Fast, tireless, occasionally confidently wrong — needs supervision, not blind trust. → Week 1&2 (W1) §8
- **Context beats model size.** A smaller model with the right information usually beats a bigger model without it. → Week 1&2 (W1) §15

---

## 1. Frame the Problem

Before writing any code, get clear on whether — and how — an LLM should be involved at all.

### What to consider
- **Start from the business problem, not the technology.** Don't reach for an LLM because it's exciting; reach for it because it's the best tool for a defined problem. → Week 6 §7
- **Define the success metric up front.** What number (or human judgment) will tell you the project worked? Without this, you can't evaluate anything later. → Week 4 §4, §12
- **Map your real constraints early:** cost per request/at scale, latency tolerance, privacy/offline requirements, accuracy tolerance, and who's affected by a wrong answer. → Week 1&2 (W1) §15; Week 3 §8
- **Build vs. buy.** Could an existing product (ChatGPT, Claude, a vertical SaaS tool) already solve this? If yes, your value-add needs to be a real workflow/orchestration/UX advantage, not just "a wrapper around GPT." → Week 1&2 (W1) §17
- **Cloud vs. local.** Local models (via Ollama/Hugging Face) buy privacy, offline use, and zero marginal cost, at the price of capability. Frontier cloud models buy capability at the price of cost, latency, and data leaving your machine. → Week 1&2 (W1) §2, §5

### Decision
> If you can't state the success metric in one sentence, you're not ready to start building.

### Checklist
- [ ] Business problem stated in one sentence, independent of any specific model or tool
- [ ] Success metric defined (a number, a benchmark, or a clear human-judgment rubric)
- [ ] Cost, latency, privacy, and accuracy constraints written down
- [ ] Build-vs-buy question explicitly answered
- [ ] Cloud vs. local decision made (or flagged as "revisit in Phase 3")

---

## 2. Choose Your Approach

This is the single most consequential decision in the project: how much machinery does this problem actually need? The right default is to escalate only as far as necessary.

### The escalation ladder

```
Prompt Engineering  →  RAG  →  Fine-Tuning  →  Agents
   (cheapest,           (add          (change        (add autonomy,
    fastest to try)    knowledge)    behavior)      tools, multi-step)
```

- **Prompt engineering** (system prompts, one-shot/multi-shot examples, dynamic context injection) is inference-time only — no retraining, cheapest to iterate. Solves most "make it behave/sound right" problems. → Week 1&2 (W2) §6
- **RAG** solves "the model doesn't know this specific/private/fresh information" by injecting retrieved context at inference time — still no retraining. → Week 1&2 (W1) §16; Week 5 §1
- **Fine-tuning** changes the model's weights — reserve this for consistent output style/format, specialized domain language, specific behavioral patterns, or shrinking a small/fast model toward a bigger model's quality. It is *not* usually needed for chatbots, copilots, document Q&A, or summarizers — RAG + good prompting is enough there, and fine-tuning too early is a common, costly mistake. → Week 1&2 (W1) §16; Week 6 §20
- **Agents** add autonomy, tool use, and multi-step loops on top of any of the above — only justified once a single prompt/RAG/fine-tuned call genuinely can't finish the task in one shot. **Don't start with agents.** → Week 8 §2

### Decision guide

| If the problem is... | Reach for... |
|---|---|
| "The model doesn't phrase/format/tone this the way I need" | Prompt engineering (one/multi-shot) |
| "The model doesn't know about my documents/data/recent events" | RAG |
| "I need consistent domain-specific style at scale, or a cheaper model to match a bigger one" | Fine-tuning |
| "This requires multiple steps, tool calls, or decisions over time" | Agents (built on top of the above) |

### Checklist
- [ ] Confirmed you're not reaching for fine-tuning or agents before trying prompting/RAG
- [ ] Identified whether the problem is a *knowledge* gap (→ RAG) or a *behavior* gap (→ fine-tuning)
- [ ] If agents are being considered, confirmed a single-call approach genuinely can't do the job

---

## 3. Select Your Model(s)

Once you know the approach, pick the actual model(s) — and expect to use more than one (e.g., a cheap model for classification, a stronger one for generation).

### What to consider
- **Frontier vs. open-source, closed vs. open-weight.** Frontier (GPT, Claude, Gemini, Grok) for max capability via API; open-source (Llama, Mistral/Mixtral, Qwen, Gemma, Phi, DeepSeek) for self-hosting, privacy, and cost control. → Week 1&2 (W1) §1, §2
- **Base vs. chat/instruct vs. reasoning vs. hybrid.** Match the model type to the task — reasoning models for math/logic/coding depth, chat models for fast conversational tasks, hybrid models when task difficulty varies. → Week 1&2 (W1) §7
- **Use benchmarks and leaderboards to build a shortlist, not to make the final call.** Public benchmarks can be misleading (contamination, narrow test distribution) — always validate the shortlist with your own task-specific eval. → Week 4 §3, §4, §6, §7
- **Check context window, pricing, and caching behavior** against your constraints from Phase 1 — a model that's 2% better but 10x the cost, or with a context window too small for your documents, may not be the right pick. → Week 1&2 (W1) §15
- **For local models: check quantization and RAM/VRAM requirements** before committing — a model that doesn't fit your hardware isn't a real option. → Week 3 §6, §8
- **Abstract the provider early.** Use an OpenAI-compatible client, LiteLLM, or OpenRouter so switching models later is a one-line change, not a rewrite. → Week 1&2 (W1) §5, §6, (W2) §1

### Checklist
- [ ] Shortlist of 2–3 candidate models built from benchmarks/leaderboards relevant to the task
- [ ] Shortlist validated (or will be validated in Phase 6) against your own eval, not just public leaderboard scores
- [ ] Context window and pricing checked against real usage patterns
- [ ] If local: quantization/RAM/VRAM requirements confirmed to fit available hardware
- [ ] Provider access goes through an abstraction layer (OpenAI-compatible SDK / LiteLLM / OpenRouter), not hardcoded to one vendor's native SDK

---

## 4. Prepare Your Data

Skip this phase if you're doing pure prompt engineering with no external knowledge. Required for RAG and fine-tuning.

### What to consider
- **Source and curate deliberately.** Garbage in, garbage out applies doubly to fine-tuning data and RAG document collections. → Week 6 §3, §5, §6
- **LLMs can help you clean/label data at scale** (batch inference) — but validate a sample by hand before trusting the whole batch. → Week 6 §9, §10
- **Chunking strategy matters a lot for RAG** — chunk size and overlap directly affect retrieval quality; treat this as something to experiment on, not something to guess once. → Week 5 §7, §16
- **Pick an embedding model and vector database deliberately** — they have different tradeoffs (dimensionality, cost, self-hosted vs. managed). → Week 5 §3, §4, §5, §8
- **Carve out a golden evaluation set before you build anything.** Hold out real examples with known-correct answers/labels now — you'll need this in Phase 6, and it's much harder to build fairly after you've already seen model outputs. → Week 6 §4; Week 5 §12

### Checklist
- [ ] Data sourced and curated with a defined quality bar
- [ ] If using LLM preprocessing: a hand-checked sample confirms output quality before scaling up
- [ ] Chunking strategy chosen (and flagged for experimentation in Phase 9)
- [ ] Embedding model + vector DB selected with cost/scale tradeoffs considered
- [ ] Golden eval set (train/test split or held-out examples) created *before* building the pipeline

---

## 5. Build the Pipeline

Now write the actual system — but build the *baseline* before the sophisticated version.

### What to consider
- **Build baselines first, in increasing order of complexity:** random guess → simple traditional ML → human baseline → zero-shot frontier LLM. This tells you what a naive/cheap approach already gets you, so you know if the fancy version is actually worth it. → Week 6 §11, §12, §13, §15
- **Understand statelessness before building anything conversational** — you (the app) reconstruct history and resend it every call; there's no hidden memory. → Week 1&2 (W1) §4
- **Prompting basics:** system prompt for global behavior, one-shot/multi-shot examples for format, dynamic context injection for per-request relevance. → Week 1&2 (W2) §6
- **For structured/reliable output, use structured outputs / JSON mode / constrained decoding** rather than parsing free text — much more robust for anything downstream code depends on. → Week 8 §11
- **For RAG: build the ingest → retrieve → answer chain explicitly** (`ingest.py` / `answer.py` as separate concerns), not one giant notebook cell. → Week 5 §10, §11
- **For tool calling: remember the model never executes anything itself** — it requests a tool call, your application runs it, and you feed the result back. → Week 8 §12; Week 1&2 (W2) §8
- **For fine-tuning:** closed models via the provider's SFT API are simplest; open models use LoRA/QLoRA to fine-tune efficiently without full retraining. → Week 5 §16 is unrelated — see instead Week 6 §16 (frontier SFT), Week 7 §2, §3, §9, §10 (LoRA/QLoRA)
- **Get a UI in front of it early** (Gradio is the fastest path) so you and stakeholders can actually interact with the thing, not just read logs. → Week 1&2 (W2) §4

### Checklist
- [ ] Baselines built and measured before the "real" approach, in increasing complexity order
- [ ] Conversation/memory handling explicitly reconstructs history per call (no assumed statelessness bugs)
- [ ] Structured output used wherever downstream code parses the response
- [ ] RAG pipeline separated into ingest and query/answer stages
- [ ] Tool-calling flow correctly treats the model as request-only, app as executor
- [ ] A minimal UI exists for manual testing, even if not the final product

---

## 6. Evaluate

This isn't a one-time phase — it's the thread that runs through the whole project. Nothing ships (and no decision in Phase 2/3 is final) without measurement.

### What to consider
- **RAG evaluation:** build a golden Q&A dataset, measure retrieval quality (MRR, NDCG, recall, precision) separately from answer quality (LLM-as-judge), and only change one variable at a time (chunk size, embedding model, etc.) between measurements. → Week 5 §12, §13
- **Fine-tuning evaluation:** watch the loss curve, understand what the cross-entropy number actually means, and watch for overfitting — use early stopping in practice, not just in theory. → Week 7 §10, §11, §12
- **Custom/task-specific evals beat generic benchmarks** for deciding between models on your actual problem — build a small custom benchmark if the public ones don't match your task. → Week 4 §5, §12
- **Manage experiments properly:** name and version runs, log to something like Weights & Biases, so you can compare apples to apples across dozens of attempts. → Week 7 §13
- **Expect — and accept — negative results.** Fine-tuning a frontier model can make it *worse* on a task; that's a real, useful finding, not a failure of process. → Week 6 §18

### Checklist
- [ ] A held-out golden eval set is used consistently across all approach/model comparisons
- [ ] RAG: retrieval quality and generation quality are measured separately
- [ ] Fine-tuning: loss curves are monitored and early stopping is used if overfitting appears
- [ ] Every experiment run is named/versioned/logged so results are comparable later
- [ ] You're prepared to report "this approach didn't help" as a valid outcome

---

## 7. Deploy & Productionize

Turning a working notebook into something that runs reliably without you babysitting it.

### What to consider
- **Move from notebook globals to real scripts/modules** before anything goes near production. → Week 5 §11
- **Deploy with a platform built for this** (e.g., Modal) — understand the difference between an ephemeral run and a persistent service, and the cost/latency implications of cold vs. warm starts. → Week 8 §4, §5
- **Use prompt caching** for repeated large contexts (system prompts, knowledge bases) to cut cost and latency — but remember caching only helps for an unchanged prefix. → Week 1&2 (W1) §15
- **Add retries and parallelism deliberately** (e.g., Tenacity for retries, parallel ingestion for throughput) rather than hoping calls never fail. → Week 5 §17
- **Prefer structured outputs over free-text parsing** anywhere the deployed system's correctness depends on parsing a response. → Week 8 §11

### Checklist
- [ ] Code lives in scripts/modules, not notebook-only globals
- [ ] Deployment platform chosen with cold/warm start behavior understood
- [ ] Prompt caching used where prefixes repeat, with static content ordered before variable content
- [ ] Retry logic and (if needed) parallel processing are explicit, not assumed
- [ ] Structured outputs used at any boundary where parsing failures would break the system

---

## 8. Go Agentic (only when justified)

Only enter this phase if Phase 2 concluded the task genuinely needs multi-step autonomy — not by default.

### What to consider
- **What actually makes a system "agentic"**: it plans, acts, observes results, and adjusts — not just "it calls an API." → Week 8 §13
- **The planning agent + agent loop pattern**: Plan → Act → Evaluate → Adjust → Repeat, until the task is done. → Week 8 §14; Week 1&2 (W2) §9
- **Ensembling** — combining multiple models'/approaches' outputs — can improve reliability without adding autonomy; consider it before full agentic architecture if the goal is just "more accurate," not "more autonomous." → Week 8 §10
- **Multi-agent systems need explicit memory and role management** — moving beyond simple user/assistant chat roles into structured, scene-setting prompts once you have more than two participants. → Week 1&2 (W2) §3; Week 8 §15

### Checklist
- [ ] Confirmed the task genuinely requires a plan/act/evaluate loop, not just a single well-crafted call
- [ ] Considered ensembling as a simpler alternative if the actual goal is accuracy, not autonomy
- [ ] Memory and role structure explicitly designed for 2+ agents/participants (not forced into plain user/assistant format)

---

## 9. Iterate & Improve

Once the system works end to end, this is where most of the long-term value gets added.

### What to consider
- **Advanced RAG techniques**, once basic RAG is solid: query rewriting/expansion, reranking, semantic chunking, document rewriting, and — for more complex knowledge structures — hierarchical, graph, or agentic RAG. → Week 5 §14, §15, §16, §17
- **Re-check the escalation ladder** (Phase 2) periodically — a problem that started as "just prompting" may now justify RAG; one that used fine-tuning might now be solvable more cheaply with a better prompt or newer model.
- **Keep the eval harness running** as the system evolves — every "improvement" should be measured against the same golden set used from the start, not judged by feel.

### Checklist
- [ ] Advanced RAG techniques considered only after basic retrieval quality is measured and understood
- [ ] Approach re-evaluated periodically against the escalation ladder, not locked in permanently
- [ ] Every iteration re-measured against the original eval set

---

## Quick-Reference Cheat Sheet

**Escalation ladder:** Prompt engineering → RAG → Fine-tuning → Agents. Don't skip ahead.

**Model shortlisting in 4 steps:** (1) frontier vs. open-source / chat vs. reasoning, (2) benchmark/leaderboard shortlist, (3) validate against your own task-specific eval, (4) check context window, pricing, and hardware fit.

**Main cost levers:** model tier (Nano/Mini/full-size), context size sent per request, prompt caching, and batching.

### Common pitfalls
- Skipping baselines and jumping straight to the sophisticated approach
- No defined success metric before building
- Fine-tuning too early, when better prompting or RAG would have worked
- Starting with an agentic architecture before confirming it's needed
- Trusting public leaderboards over your own task-specific evaluation
- Forgetting models are stateless and hallucination-prone by default — building without supervision or verification steps
