"""Offline checks for chunking/chunk.py. Pure-helper asserts only — no network, no tiktoken:
every helper takes an injected `count` callable, so tests use a trivial word-counter.

Run: python test_chunk.py
"""
from chunk import chunk_markdown, chunk_table, recursive_split, split_sections

WORD_COUNT = lambda s: len(s.split())


def test_split_sections() -> None:
    md = (
        "Preamble text.\n\n"
        "# Title One\n"
        "Body one.\n"
        "## Title Two\n"
        "Body two line1\n"
        "Body two line2\n"
    )
    sections = split_sections(md)
    assert sections == [
        (None, "Preamble text."),
        ("Title One", "Body one."),
        ("Title Two", "Body two line1\nBody two line2"),
    ]
    print("✅ split_sections")


def test_chunk_table_overlap_and_budget() -> None:
    title = "T"
    table_lines = ["H", "---", "r1", "r2", "r3", "r4", "r5", "r6"]
    max_tokens, overlap_tokens = 6, 2  # header_block "T\n\nH\n---" = 3 words -> budget = 3
    chunks = chunk_table(title, table_lines, max_tokens, overlap_tokens, WORD_COUNT)

    assert len(chunks) == 4
    for c in chunks:
        assert c.startswith("T\n\nH\n---")
        assert WORD_COUNT(c) <= max_tokens
    # consecutive chunks share rows (the overlap)
    for a, b in zip(chunks, chunks[1:]):
        rows_a = set(a.split("\n")[3:])
        rows_b = set(b.split("\n")[3:])
        assert rows_a & rows_b, "expected consecutive table chunks to overlap on a shared row"
    print("✅ chunk_table (overlap + budget)")


def test_recursive_split() -> None:
    # Integration check only: the packing algorithm itself is now langchain_text_splitters'
    # RecursiveCharacterTextSplitter (well-tested upstream) — we just confirm our token-budget
    # wiring (length_function=count) and overlap behave as expected end-to-end.
    text = " ".join(f"w{i}" for i in range(1, 11))  # w1 .. w10
    max_tokens, overlap_tokens = 4, 2
    chunks = recursive_split(text, max_tokens, overlap_tokens, WORD_COUNT)

    assert len(chunks) > 1
    assert all(WORD_COUNT(c) <= max_tokens for c in chunks)
    for a, b in zip(chunks, chunks[1:]):
        words_a, words_b = a.split(), b.split()
        assert set(words_a) & set(words_b), "expected consecutive windows to overlap"
    print("✅ recursive_split")


def test_chunk_markdown_end_to_end() -> None:
    md = (
        "## Bảng giá dịch vụ\n\n"
        "Đây là bảng giá các dịch vụ khám bệnh tại bệnh viện.\n\n"
        "| STT | Tên dịch vụ | Giá |\n"
        "| --- | --- | --- |\n"
        "| 1 | Khám tổng quát | 100000 |\n"
        "| 2 | Khám chuyên khoa | 200000 |\n"
        "| 3 | Xét nghiệm máu | 150000 |\n"
        "| 4 | Chụp X-quang | 300000 |\n"
        "| 5 | Siêu âm | 250000 |\n"
        "| 6 | Nội soi | 400000 |\n\n"
        "Vui lòng liên hệ tổng đài để biết thêm chi tiết.\n"
    )
    source_meta = {
        "slug": "test-doc",
        "topic": "bhyt_pricing",
        "source_url": "pdf/raw-pdf/test.pdf",
        "freshness": "snapshot for testing",
    }
    chunks = chunk_markdown(md, source_meta, max_tokens=20, overlap_tokens=5, count=WORD_COUNT)

    expected_keys = {"id", "topic", "title", "content", "keywords", "source_url", "is_synthetic", "freshness"}
    assert len(chunks) > 1
    ids = [c["id"] for c in chunks]
    assert ids == [f"pdf-test-doc-{i:04d}" for i in range(1, len(chunks) + 1)]
    for c in chunks:
        assert set(c) == expected_keys
        assert c["topic"] == "bhyt_pricing"
        assert c["title"] == "Bảng giá dịch vụ"
        assert c["source_url"] == "pdf/raw-pdf/test.pdf"
        assert c["is_synthetic"] is False
    assert any("STT" in c["content"] for c in chunks), "expected a table chunk to repeat the header row"
    print("✅ chunk_markdown (end-to-end)")


def main() -> None:
    test_split_sections()
    test_chunk_table_overlap_and_budget()
    test_recursive_split()
    test_chunk_markdown_end_to_end()
    print("\nAll chunking self-checks passed.")


if __name__ == "__main__":
    main()
