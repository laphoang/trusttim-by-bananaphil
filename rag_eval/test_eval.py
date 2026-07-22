"""Offline checks for rag_eval/eval.py. Pure-helper asserts only — no network, no LLM.

Run: python test_eval.py
"""
from eval import citation_metrics, mean, mrr, ndcg_at_k, precision_at_k, recall_at_k


def test_recall_at_k() -> None:
    ranking = ["a", "b", "c", "d"]
    labels = ["a", "c"]
    assert recall_at_k(ranking, labels, 2) == 0.5
    assert recall_at_k(ranking, labels, 4) == 1.0
    print("✅ recall_at_k")


def test_precision_at_k() -> None:
    ranking = ["a", "b", "c", "d"]
    labels = ["a", "c"]
    assert precision_at_k(ranking, labels, 2) == 0.5
    assert precision_at_k(ranking, labels, 4) == 0.5
    assert precision_at_k([], labels, 2) == 0.0
    print("✅ precision_at_k")


def test_mrr() -> None:
    assert mrr(["a", "b", "c"], ["a", "c"]) == 1.0
    assert mrr(["b", "a", "c"], ["a"]) == 0.5
    assert mrr(["b", "d"], ["a"]) == 0.0
    print("✅ mrr")


def test_ndcg_at_k() -> None:
    # ranking [a,b,c,d], labels {a,c} — a hits at rank 1, c hits at rank 3.
    ranking = ["a", "b", "c", "d"]
    labels = ["a", "c"]
    import math

    idcg2 = 1 / math.log2(2) + 1 / math.log2(3)  # ideal: both hits in the top 2 ranks
    assert abs(ndcg_at_k(ranking, labels, 2) - (1 / math.log2(2)) / idcg2) < 1e-9
    # at k=4 both hits are included, but c sits at rank 3 (not the ideal rank 2), so < 1.0
    dcg4 = 1 / math.log2(2) + 1 / math.log2(4)
    assert abs(ndcg_at_k(ranking, labels, 4) - dcg4 / idcg2) < 1e-9
    # a perfectly-ordered ranking scores 1.0
    assert ndcg_at_k(["a", "c", "b", "d"], labels, 4) == 1.0
    print("✅ ndcg_at_k")


def test_mean() -> None:
    assert mean([1.0, 2.0, 3.0]) == 2.0
    assert mean([]) != mean([])  # NaN
    import math

    assert math.isnan(mean([float("nan"), float("nan")]))
    print("✅ mean")


def test_citation_metrics() -> None:
    # citations join to rerankedIds by position, not by title — this must still work correctly
    # when two chunks share an identical title (e.g. paginated PDF tables), which a title-based
    # join would silently collapse.
    run = {
        "rerankedIds": ["chunk-a", "chunk-b"],
        "relevantChunkIds": ["chunk-a"],
        "citations": [{"title": "Same Title"}, {"title": "Same Title"}],
    }
    result = citation_metrics(run)
    assert result["precision"] == 0.5
    assert result["any_hit_recall"] == 1.0

    run_no_hit = {**run, "rerankedIds": ["chunk-b"], "citations": [{"title": "Same Title"}]}
    result_no_hit = citation_metrics(run_no_hit)
    assert result_no_hit["precision"] == 0.0
    assert result_no_hit["any_hit_recall"] == 0.0
    print("✅ citation_metrics")


def main() -> None:
    test_recall_at_k()
    test_precision_at_k()
    test_mrr()
    test_ndcg_at_k()
    test_mean()
    test_citation_metrics()
    print("\nAll rag_eval self-checks passed.")


if __name__ == "__main__":
    main()
