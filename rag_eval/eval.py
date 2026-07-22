"""RAGAS-based retrieval + answer quality eval for TrustTim.

Reads the per-query traces dumped by `npm run eval:dump` (data/eval/runs/latest.jsonl — already
carries the golden question/answer/labels passed through from data/eval/golden-answers.json, so
that's the only input file this needs) and scores:

  - Retrieval (pure Python, no LLM): Recall@k, Precision@k, MRR, nDCG@k — on the fused pool
    (recall-oriented, deeper) and on the reranked top-k (precision-oriented, k=5 = production TOP_K).
  - Answer quality (RAGAS, judge = gpt-5.5): faithfulness, answer relevance, context precision,
    context recall.
  - Citation correctness (custom, deterministic): are the cited chunks actually relevant?

Run: uv run python eval.py
"""
import argparse
import json
import math
import os
from typing import Optional

RUNS_FILE = os.environ.get("RUNS_FILE", "../data/eval/runs/latest.jsonl")
JUDGE_MODEL = os.environ.get("JUDGE_MODEL", "gpt-5.5")
FUSED_KS = (10, 20)
RERANK_K = 5  # matches TOP_K in lib/rag/rerank.ts


# --- Retrieval IR metrics (pure, no network — see test_eval.py) -----------------------------

def recall_at_k(ranked_ids: list[str], relevant_ids: list[str], k: int) -> float:
    if not relevant_ids:
        return float("nan")
    top_k = set(ranked_ids[:k])
    return len(top_k & set(relevant_ids)) / len(relevant_ids)


def precision_at_k(ranked_ids: list[str], relevant_ids: list[str], k: int) -> float:
    top_k = ranked_ids[:k]
    if not top_k:
        return 0.0
    relevant = set(relevant_ids)
    return sum(1 for doc_id in top_k if doc_id in relevant) / len(top_k)


def mrr(ranked_ids: list[str], relevant_ids: list[str]) -> float:
    relevant = set(relevant_ids)
    for rank, doc_id in enumerate(ranked_ids, start=1):
        if doc_id in relevant:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(ranked_ids: list[str], relevant_ids: list[str], k: int) -> float:
    """Binary graded relevance (rel=1 if id is labeled relevant)."""
    relevant = set(relevant_ids)
    dcg = sum(
        1.0 / math.log2(rank + 1)
        for rank, doc_id in enumerate(ranked_ids[:k], start=1)
        if doc_id in relevant
    )
    ideal_n = min(k, len(relevant_ids))
    idcg = sum(1.0 / math.log2(rank + 1) for rank in range(1, ideal_n + 1))
    return dcg / idcg if idcg else float("nan")


def mean(values: list[float]) -> float:
    clean = [v for v in values if not math.isnan(v)]
    return sum(clean) / len(clean) if clean else float("nan")


# --- Citation correctness (deterministic — see Part B caveat in the plan / README) ----------

def citation_metrics(run: dict) -> dict:
    """generateAnswer cites every context chunk it was given (lib/rag/generate.ts), not a
    per-claim subset, so this is currently precision/recall-of-cited-context-by-relevance rather
    than a true per-claim check — see README "Known limitation".

    Citations join to chunk ids by *position*, not by title: `citations` and `rerankedIds` are
    both `reranked.candidates.map(...)` in the same order (generate.ts), and a title-based join
    silently collapses chunks that share an identical title (paginated PDF tables all titled
    "KHÁM BỆNH VÀ NGÀY GIƯỜNG ĐIỀU TRỊ", or rule chunks sharing one rule name across indices)."""
    cited_ids = run["rerankedIds"][: len(run["citations"])]
    relevant = set(run["relevantChunkIds"])
    if not cited_ids:
        return {"precision": float("nan"), "any_hit_recall": 0.0}
    precision = sum(1 for cid in cited_ids if cid in relevant) / len(cited_ids)
    any_hit_recall = 1.0 if relevant & set(cited_ids) else 0.0
    return {"precision": precision, "any_hit_recall": any_hit_recall}


# --- RAGAS answer-quality metrics (LLM judge) ------------------------------------------------

class FptEmbeddings:
    """Minimal langchain-Embeddings-compatible adapter over FPT's /v1/embeddings — same request
    shape as kb_ingest/ingest.py's embed_batch, but input_type=query (RAGAS embeds questions/
    answers, not KB passages)."""

    def __init__(self, base_url: str, api_key: str, model: str, dim: int):
        self.base_url = base_url
        self.api_key = api_key
        self.model = model
        self.dim = dim

    def _embed(self, texts: list[str]) -> list[list[float]]:
        import requests

        resp = requests.post(
            f"{self.base_url}/v1/embeddings",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "input": texts,
                "dimensions": self.dim,
                "encoding_format": "float",
                "input_text_truncate": "none",
                "input_type": "query",
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()["data"]
        return [d["embedding"] for d in sorted(data, key=lambda d: d["index"])]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text])[0]

    async def aembed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.embed_documents(texts)

    async def aembed_query(self, text: str) -> list[float]:
        return self.embed_query(text)


def run_ragas(runs: list[dict]):
    from ragas import EvaluationDataset, evaluate
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.llms import LangchainLLMWrapper
    from ragas.metrics import (
        Faithfulness,
        LLMContextPrecisionWithReference,
        LLMContextRecall,
        ResponseRelevancy,
    )
    from langchain_openai import ChatOpenAI

    class ReasoningModelLLMWrapper(LangchainLLMWrapper):
        """Reasoning-family judge models (e.g. gpt-5.5) only accept the default temperature (1) —
        override ragas's internal near-zero-temperature default (1e-8), which such models reject
        with a 400 (`temperature does not support 1E-8 with this model`)."""

        def get_temperature(self, n: int) -> float:
            return 1.0

    dataset = EvaluationDataset.from_list(
        [
            {
                "user_input": r["question"],
                "response": r["answer"],
                "retrieved_contexts": r["contexts"],
                "reference": r["groundTruthAnswer"],
            }
            for r in runs
        ]
    )

    judge_llm = ReasoningModelLLMWrapper(ChatOpenAI(model=JUDGE_MODEL))
    embeddings = LangchainEmbeddingsWrapper(
        FptEmbeddings(
            base_url=os.environ["API_BASE_URL"],
            api_key=os.environ["API_KEY"],
            model=os.environ.get("EMBEDDING_MODEL", "Vietnamese_Embedding"),
            dim=int(os.environ.get("EMBEDDING_DIM", "1024")),
        )
    )
    metrics = [
        Faithfulness(),
        ResponseRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
    ]
    result = evaluate(dataset=dataset, metrics=metrics, llm=judge_llm, embeddings=embeddings)
    return result.to_pandas()


# --- Report -----------------------------------------------------------------------------------

def build_report(runs: list[dict], ragas_df, missing_ragas: Optional[str]) -> str:
    lines = ["# TrustTim — RAG Eval Results (RAGAS)\n"]
    lines.append(f"Judge model: `{JUDGE_MODEL}` · {len(runs)} golden cases from `data/eval/golden-answers.json`.\n")

    # (a) retrieval
    lines.append("## Retrieval — fused pool vs. reranked top-k\n")
    fused_rows, rerank_rows = [], []
    agg = {f"fused_recall@{k}": [] for k in FUSED_KS}
    agg.update({f"fused_precision@{k}": [] for k in FUSED_KS})
    agg.update({f"fused_ndcg@{k}": [] for k in FUSED_KS})
    agg["fused_mrr"] = []
    agg[f"rerank_recall@{RERANK_K}"] = []
    agg[f"rerank_precision@{RERANK_K}"] = []
    agg[f"rerank_ndcg@{RERANK_K}"] = []
    agg["rerank_mrr"] = []

    for r in runs:
        relevant = r["relevantChunkIds"]
        fused_ids = r["retrievedIds"]
        rerank_ids = [s["id"] for s in r["rerankedScored"]]
        row = {"id": r["id"]}
        for k in FUSED_KS:
            row[f"recall@{k}"] = recall_at_k(fused_ids, relevant, k)
            row[f"precision@{k}"] = precision_at_k(fused_ids, relevant, k)
            row[f"ndcg@{k}"] = ndcg_at_k(fused_ids, relevant, k)
            agg[f"fused_recall@{k}"].append(row[f"recall@{k}"])
            agg[f"fused_precision@{k}"].append(row[f"precision@{k}"])
            agg[f"fused_ndcg@{k}"].append(row[f"ndcg@{k}"])
        row["mrr"] = mrr(fused_ids, relevant)
        agg["fused_mrr"].append(row["mrr"])
        fused_rows.append(row)

        rr = {
            "id": r["id"],
            f"recall@{RERANK_K}": recall_at_k(rerank_ids, relevant, RERANK_K),
            f"precision@{RERANK_K}": precision_at_k(rerank_ids, relevant, RERANK_K),
            f"ndcg@{RERANK_K}": ndcg_at_k(rerank_ids, relevant, RERANK_K),
            "mrr": mrr(rerank_ids, relevant),
        }
        agg[f"rerank_recall@{RERANK_K}"].append(rr[f"recall@{RERANK_K}"])
        agg[f"rerank_precision@{RERANK_K}"].append(rr[f"precision@{RERANK_K}"])
        agg[f"rerank_ndcg@{RERANK_K}"].append(rr[f"ndcg@{RERANK_K}"])
        agg["rerank_mrr"].append(rr["mrr"])
        rerank_rows.append(rr)

    lines.append("**Aggregate (mean across cases):**\n")
    lines.append("| metric | fused pool (k=10) | fused pool (k=20) | reranked top-5 |")
    lines.append("|---|---|---|---|")
    lines.append(
        f"| Recall@k | {mean(agg['fused_recall@10']):.2f} | {mean(agg['fused_recall@20']):.2f} | {mean(agg[f'rerank_recall@{RERANK_K}']):.2f} |"
    )
    lines.append(
        f"| Precision@k | {mean(agg['fused_precision@10']):.2f} | {mean(agg['fused_precision@20']):.2f} | {mean(agg[f'rerank_precision@{RERANK_K}']):.2f} |"
    )
    lines.append(
        f"| nDCG@k | {mean(agg['fused_ndcg@10']):.2f} | {mean(agg['fused_ndcg@20']):.2f} | {mean(agg[f'rerank_ndcg@{RERANK_K}']):.2f} |"
    )
    lines.append(f"| MRR | {mean(agg['fused_mrr']):.2f} | — | {mean(agg['rerank_mrr']):.2f} |\n")

    lines.append("**Per-case (reranked top-5, the actual generation context):**\n")
    lines.append("| id | recall@5 | precision@5 | ndcg@5 | mrr |")
    lines.append("|---|---|---|---|---|")
    for rr in rerank_rows:
        lines.append(
            f"| {rr['id']} | {rr[f'recall@{RERANK_K}']:.2f} | {rr[f'precision@{RERANK_K}']:.2f} | {rr[f'ndcg@{RERANK_K}']:.2f} | {rr['mrr']:.2f} |"
        )

    # (b) answer quality
    lines.append("\n## Answer quality (RAGAS, LLM-as-judge)\n")
    if missing_ragas:
        lines.append(f"**Not run.** {missing_ragas}\n")
    else:
        metric_cols = [c for c in ragas_df.columns if c not in ("user_input", "response", "retrieved_contexts", "reference")]
        lines.append("| id | " + " | ".join(metric_cols) + " |")
        lines.append("|---|" + "---|" * len(metric_cols))
        for i, r in enumerate(runs):
            row = ragas_df.iloc[i]
            lines.append(f"| {r['id']} | " + " | ".join(f"{row[c]:.2f}" for c in metric_cols) + " |")
        lines.append("\n**Aggregate (mean):** " + ", ".join(f"{c} = {ragas_df[c].mean():.2f}" for c in metric_cols))

    # (c) citation correctness
    lines.append("\n\n## Citation correctness\n")
    lines.append(
        "**Known limitation:** `generateAnswer` (lib/rag/generate.ts) cites every context chunk it "
        "was handed, not a per-claim subset — so this measures precision/recall of the cited "
        "*context* by relevance label, not true per-claim citation accuracy. Baseline until the "
        "app emits selective citations.\n"
    )
    cite_rows = [citation_metrics(r) for r in runs]
    lines.append("| id | citation precision | any-hit recall |")
    lines.append("|---|---|---|")
    for r, c in zip(runs, cite_rows):
        p = "n/a" if math.isnan(c["precision"]) else f"{c['precision']:.2f}"
        lines.append(f"| {r['id']} | {p} | {c['any_hit_recall']:.2f} |")
    lines.append(
        f"\n**Aggregate:** precision = {mean([c['precision'] for c in cite_rows]):.2f}, "
        f"any-hit recall = {mean([c['any_hit_recall'] for c in cite_rows]):.2f}"
    )

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-ragas", action="store_true", help="Score retrieval + citations only (no LLM judge calls).")
    args = parser.parse_args()

    with open(RUNS_FILE, encoding="utf-8") as f:
        runs = [json.loads(line) for line in f if line.strip()]
    if not runs:
        raise SystemExit(f"{RUNS_FILE} is empty — run `npm run eval:dump` first.")

    missing_ragas = None
    ragas_df = None
    if args.skip_ragas:
        missing_ragas = "Skipped (--skip-ragas)."
    elif not os.environ.get("OPENAI_API_KEY"):
        missing_ragas = "OPENAI_API_KEY not set — copy .env.example to .env and fill it in."
    else:
        ragas_df = run_ragas(runs)

    report = build_report(runs, ragas_df, missing_ragas)
    with open("RAG-EVAL-RESULTS.md", "w", encoding="utf-8") as f:
        f.write(report)
    print(report)
    print("Wrote RAG-EVAL-RESULTS.md")


if __name__ == "__main__":
    main()
