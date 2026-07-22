# TrustTim RAG eval (RAGAS)

Scores the retrieval + generation pipeline against a labeled golden set, beyond the fast
any-hit-only check in [`scripts/eval.ts`](../scripts/eval.ts) (`npm run eval`). Standalone Python
process, independent of the Next.js app — it never calls the chat API (which deliberately doesn't
expose chunk ids/scores/context); instead it reads a trace file the TS pipeline dumps.

## What it measures

- **Retrieval** (pure Python, no LLM call, no cost): Recall@k, Precision@k, MRR, nDCG@k — computed
  on both the fused RRF pool (recall-oriented, k=10/20) and the reranked top-5 (the actual context
  sent to generation, k=5 = production `TOP_K`).
- **Answer quality** (RAGAS, LLM-as-judge = `gpt-5.5`): faithfulness (groundedness), answer
  relevance, context precision, context recall.
- **Citation correctness** (custom, deterministic): are the chunks the app cited actually labeled
  relevant? *Known limitation:* `generateAnswer` currently cites every context chunk it was given
  (not a per-claim subset), so this is a baseline, not a true per-claim check yet — see the caveat
  printed in the report.

## Setup

Uses [uv](https://docs.astral.sh/uv/).

```bash
cd rag_eval
uv sync
cp .env.example .env   # fill in OPENAI_API_KEY (judge) + FPT API_KEY (embeddings)
```

## Run

Two steps — the TS pipeline produces the trace, then this tool scores it:

```bash
# 1. From the repo root: run the real pipeline (retrieve → rerank → generate) over every case in
#    data/eval/golden-answers.json, dumping one JSON trace per case:
npm run eval:dump

# 2. From rag_eval/: score the dump.
uv run --env-file .env python eval.py

# Retrieval + citation metrics only, no judge calls (fast, free, useful while iterating):
uv run --env-file .env python eval.py --skip-ragas
```

Writes `RAG-EVAL-RESULTS.md` (same style as the repo root's `RESULTS.md`) and prints it to stdout.

### Cost

The judge only runs 4 RAGAS metrics × the golden-set size (8 cases by default) — a handful of
`gpt-5.5` calls, a few cents. Retrieval/citation metrics are free (already-computed traces, pure
math).

## Golden-answer template

`data/eval/golden-answers.json` — add cases here, not to `faq-cases.json` (that file stays a fast,
generation-free regression gate; this one needs a ground-truth answer per case):

```jsonc
{
  "id": "g01",                    // stable case id
  "question": "…",                // user query, Vietnamese, colloquial or formal
  "topic": "bhyt_pricing",        // bhyt_pricing | procedures | hospital_info | doctor_schedule
  "relevantChunkIds": ["…"],      // labeled relevant chunk ids → IR metrics + citation correctness
  "groundTruthAnswer": "…",       // ideal grounded answer (VI) → faithfulness/context-recall reference
  "note": "…"                     // optional: why this case exists (edge case / regression case)
}
```

**Author `groundTruthAnswer` from the real chunk content** (`hackathon_docs/kb/*.md`, or the
ingested PDF price chunks) — a wrong price or phone number in the golden answer is worse than no
golden answer at all.

## Test

```bash
uv run python test_eval.py
```

Covers the pure IR-metric functions (`recall_at_k`, `precision_at_k`, `mrr`, `ndcg_at_k`) and
`citation_metrics` on hand-verified toy rankings — no network, no LLM.
