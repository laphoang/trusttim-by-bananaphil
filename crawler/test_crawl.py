"""Offline assert-based check of crawl.py's pure helpers (no network, no AWS, no crawl4ai/boto3).
Run: python test_crawl.py
"""
import re

from crawl import build_sidecar, content_hash, is_doc_link, url_to_slug


def main() -> None:
    # url_to_slug: stable, filesystem-safe, host+path based.
    assert url_to_slug("https://benhvientimhanoi.vn/vn/cong/thong-tin/gioi-thieu-chung") == \
        "benhvientimhanoi-vn-vn-cong-thong-tin-gioi-thieu-chung"
    assert url_to_slug("https://benhvientimhanoi.vn/") == "benhvientimhanoi-vn"  # host only, stable
    assert re.fullmatch(r"[a-z0-9-]+", url_to_slug("https://x.vn/A B/Ç?q=1")), "slug must be safe"
    # query string disambiguates otherwise-identical paths (no collision)
    a = url_to_slug("https://benhvientimhanoi.vn/vi/chuyen-de/bang-gia?trang=1")
    b = url_to_slug("https://benhvientimhanoi.vn/vi/chuyen-de/bang-gia?trang=2")
    assert a != b, "different query strings must not collide"
    # deterministic
    assert url_to_slug("https://x.vn/p?q=1") == url_to_slug("https://x.vn/p?q=1")
    print("✅ url_to_slug")

    # content_hash: deterministic, differs on content.
    assert content_hash("abc") == content_hash("abc")
    assert content_hash("abc") != content_hash("abd")
    print("✅ content_hash")

    # is_doc_link: only real doc extensions, case-insensitive, ignores query.
    assert is_doc_link("https://x.vn/a/report.pdf")
    assert is_doc_link("https://x.vn/a/Report.PDF")
    assert is_doc_link("https://x.vn/a/form.docx?dl=1")
    assert not is_doc_link("https://x.vn/a/page")
    assert not is_doc_link("https://x.vn/a/photo.jpg")
    print("✅ is_doc_link")

    # build_sidecar: all required keys, correct hash, ISO-Z timestamp shape.
    md = "# Xin chào\n\nNội dung."
    s = build_sidecar("https://x.vn/p", "Tiêu đề", md, 2, "raw-crawl/crawl_date=2026-07-21/pages/p.md")
    assert set(s) == {"source_url", "title", "crawled_at", "content_sha256",
                      "content_chars", "depth", "s3_markdown_key"}
    assert s["content_sha256"] == content_hash(md)
    assert s["content_chars"] == len(md)
    assert s["depth"] == 2
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", s["crawled_at"]), "ISO-Z timestamp"
    print("✅ build_sidecar")

    print("\nAll crawler self-checks passed.")


if __name__ == "__main__":
    main()
