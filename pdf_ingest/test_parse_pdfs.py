"""Offline checks for pdf_ingest.

Two tiers:
1. Pure-helper asserts (no I/O, no heavy deps): is_native_text, build_sidecar, slugify, content_hash,
   and ocr.segment_lines on a synthetic image. Needs only numpy.
2. One real end-to-end check: generate a one-page text PDF in-memory with fitz itself, run it through
   the native-text extraction path, and confirm the inserted string survives. Needs pymupdf +
   pymupdf4llm installed (part of this project's own deps) but no OCR/VietOCR/network.

Run: python test_parse_pdfs.py
"""
import numpy as np

from ocr import segment_lines
from parse_pdfs import build_sidecar, content_hash, extract_pdf, is_native_text, slugify


def test_is_native_text() -> None:
    assert is_native_text(100, min_chars_per_page=40)
    assert not is_native_text(10, min_chars_per_page=40)
    assert is_native_text(40, min_chars_per_page=40)  # boundary: >= is native
    print("✅ is_native_text")


def test_slugify() -> None:
    assert slugify("Báo cáo giá.pdf") == "b-o-c-o-gi"
    assert slugify("plain-name.pdf") == "plain-name"
    assert slugify("") == "document"
    print("✅ slugify")


def test_content_hash() -> None:
    assert content_hash("abc") == content_hash("abc")
    assert content_hash(b"abc") == content_hash("abc")
    assert content_hash("abc") != content_hash("abd")
    print("✅ content_hash")


def test_build_sidecar() -> None:
    md = "# Tiêu đề\n\nNội dung."
    s = build_sidecar("doc.pdf", "Tiêu đề", md, page_count=3, ocr_used=True,
                       source_pdf_sha256="deadbeef", s3_markdown_key="cleaned-pdf/doc.md")
    assert set(s) == {
        "source_pdf", "title", "extracted_at", "content_sha256", "content_chars",
        "page_count", "ocr_used", "source_pdf_sha256", "s3_markdown_key",
    }
    assert s["content_sha256"] == content_hash(md)
    assert s["content_chars"] == len(md)
    assert s["page_count"] == 3
    assert s["ocr_used"] is True
    assert s["source_pdf_sha256"] == "deadbeef"
    print("✅ build_sidecar")


def test_segment_lines() -> None:
    # Synthetic 100x200 white page with two dark horizontal bands (simulated text lines).
    img = np.full((100, 200), 255, dtype=np.uint8)
    img[10:20, 20:180] = 0   # line 1
    img[40:50, 20:180] = 0   # line 2
    # row 70-75 has a tiny dark speck, below min_dark_ratio -> should NOT count as a line
    img[70:75, 20:22] = 0

    bands = segment_lines(img, dark_threshold=128, min_dark_ratio=0.02, min_gap=3, min_line_height=5)
    assert len(bands) == 2, f"expected 2 line bands, got {bands}"
    (s1, e1), (s2, e2) = bands
    assert 9 <= s1 <= 11 and 19 <= e1 <= 21
    assert 39 <= s2 <= 41 and 49 <= e2 <= 51
    print("✅ segment_lines")


def test_extract_pdf_native() -> None:
    import fitz  # requires pymupdf; part of this project's own deps

    marker = "Xin chao TrustTim"
    doc = fitz.open()
    page = doc.new_page()
    # 3 reps clears MIN_CHARS_PER_PAGE (40 chars) while staying within the page width — a run long
    # enough to overflow the page edge gets silently clipped/excluded by pymupdf4llm's layout pass.
    page.insert_text((72, 200), f"{marker}. " * 3, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()

    markdown, page_count, ocr_used, _title = extract_pdf(pdf_bytes, min_chars_per_page=40)
    assert page_count == 1
    assert ocr_used is False
    assert marker in markdown
    print("✅ extract_pdf (native-text path)")


def main() -> None:
    test_is_native_text()
    test_slugify()
    test_content_hash()
    test_build_sidecar()
    test_segment_lines()
    test_extract_pdf_native()
    print("\nAll pdf_ingest self-checks passed.")


if __name__ == "__main__":
    main()
