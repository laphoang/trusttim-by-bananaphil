"""Offline checks for kb_ingest/ingest.py. Pure-helper asserts only — no network, no DB.

Run: python test_ingest.py
"""
from ingest import batched, build_upsert_params, parse_jsonl, vector_literal


def test_parse_jsonl() -> None:
    text = (
        '{"id": "a", "content": "x"}\n'
        "\n"
        '{"id": "b", "content": "y"}\n'
        "   \n"
    )
    chunks = parse_jsonl(text)
    assert chunks == [{"id": "a", "content": "x"}, {"id": "b", "content": "y"}]
    print("✅ parse_jsonl")


def test_batched() -> None:
    groups = list(batched([1, 2, 3, 4, 5], 2))
    assert groups == [[1, 2], [3, 4], [5]]
    assert list(batched([], 2)) == []
    print("✅ batched")


def test_vector_literal() -> None:
    assert vector_literal([0.1, 0.2, -0.3]) == "[0.1,0.2,-0.3]"
    print("✅ vector_literal")


def test_build_upsert_params() -> None:
    chunk = {
        "id": "pdf-doc-0001",
        "topic": "bhyt_pricing",
        "title": "Bảng giá",
        "content": "Nội dung",
        "keywords": [],
        "source_url": "pdf/raw-pdf/doc.pdf",
        "is_synthetic": False,
        "freshness": "snapshot",
    }
    params = build_upsert_params(chunk, [0.1, 0.2], "kw1 kw2")
    assert params == {
        "id": "pdf-doc-0001",
        "topic": "bhyt_pricing",
        "title": "Bảng giá",
        "content": "Nội dung",
        "keywords": [],
        "source_url": "pdf/raw-pdf/doc.pdf",
        "is_synthetic": False,
        "freshness": "snapshot",
        "embedding": "[0.1,0.2]",
        "keyword_text": "kw1 kw2",
    }
    # defaults apply when optional fields are missing
    minimal = build_upsert_params({"id": "x", "content": "c"}, [0.0], "")
    assert minimal["topic"] is None
    assert minimal["title"] is None
    assert minimal["keywords"] == []
    assert minimal["is_synthetic"] is False
    print("✅ build_upsert_params")


def main() -> None:
    test_parse_jsonl()
    test_batched()
    test_vector_literal()
    test_build_upsert_params()
    print("\nAll kb_ingest self-checks passed.")


if __name__ == "__main__":
    main()
