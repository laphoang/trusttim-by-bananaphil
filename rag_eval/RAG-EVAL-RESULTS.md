# TrustTim — RAG Eval Results (RAGAS)

Judge model: `gpt-5.5` · 8 golden cases from `data/eval/golden-answers.json`.

## Retrieval — fused pool vs. reranked top-k

**Aggregate (mean across cases):**

| metric | fused pool (k=10) | fused pool (k=20) | reranked top-5 |
|---|---|---|---|
| Recall@k | 1.00 | 1.00 | 0.88 |
| Precision@k | 0.10 | 0.05 | 0.18 |
| nDCG@k | 0.88 | 0.88 | 0.88 |
| MRR | 0.83 | — | 0.88 |

**Per-case (reranked top-5, the actual generation context):**

| id | recall@5 | precision@5 | ndcg@5 | mrr |
|---|---|---|---|---|
| g01 | 1.00 | 0.20 | 1.00 | 1.00 |
| g02 | 1.00 | 0.20 | 1.00 | 1.00 |
| g03 | 1.00 | 0.20 | 1.00 | 1.00 |
| g04 | 1.00 | 0.20 | 1.00 | 1.00 |
| g05 | 1.00 | 0.20 | 1.00 | 1.00 |
| g06 | 1.00 | 0.20 | 1.00 | 1.00 |
| g07 | 0.00 | 0.00 | 0.00 | 0.00 |
| g08 | 1.00 | 0.20 | 1.00 | 1.00 |

## Answer quality (RAGAS, LLM-as-judge)

| id | faithfulness | answer_relevancy | llm_context_precision_with_reference | context_recall |
|---|---|---|---|---|
| g01 | 0.50 | 0.84 | 1.00 | 1.00 |
| g02 | 0.25 | 0.85 | 1.00 | 1.00 |
| g03 | 0.71 | 0.88 | 1.00 | 1.00 |
| g04 | 0.97 | 0.75 | 1.00 | 1.00 |
| g05 | 1.00 | 0.59 | 1.00 | 1.00 |
| g06 | 1.00 | 0.64 | 1.00 | 1.00 |
| g07 | 0.40 | 0.00 | 0.00 | 0.00 |
| g08 | 0.88 | 0.62 | 1.00 | 1.00 |

**Aggregate (mean):** faithfulness = 0.71, answer_relevancy = 0.65, llm_context_precision_with_reference = 0.87, context_recall = 0.88


## Citation correctness

**Known limitation:** `generateAnswer` (lib/rag/generate.ts) cites every context chunk it was handed, not a per-claim subset — so this measures precision/recall of the cited *context* by relevance label, not true per-claim citation accuracy. Baseline until the app emits selective citations.

| id | citation precision | any-hit recall |
|---|---|---|
| g01 | 0.33 | 1.00 |
| g02 | 0.20 | 1.00 |
| g03 | 0.20 | 1.00 |
| g04 | 1.00 | 1.00 |
| g05 | 0.20 | 1.00 |
| g06 | 1.00 | 1.00 |
| g07 | 0.00 | 0.00 |
| g08 | 0.50 | 1.00 |

**Aggregate:** precision = 0.43, any-hit recall = 0.88
