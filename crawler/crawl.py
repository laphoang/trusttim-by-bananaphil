"""Crawl benhvientimhanoi.vn with crawl4ai and dump filtered markdown + metadata sidecars to S3
(or a local dir with --dry-run) for later chunking into the TrustTim knowledge base.

Scope: this stops at raw content in storage. Chunking/ingest into pgvector stays the existing
TypeScript path (lib/rag/ingest.ts), fed manually. See README.md.

Heavy deps (crawl4ai, boto3) are imported lazily inside the functions that use them so the pure
helpers below stay importable offline (test_crawl.py needs neither).
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# --- config (env, overridable by CLI) ---------------------------------------
BASE_URL = os.environ.get("CRAWL_BASE_URL", "https://benhvientimhanoi.vn")
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_PREFIX = os.environ.get("S3_PREFIX", "raw-crawl")
MAX_DEPTH = int(os.environ.get("CRAWL_MAX_DEPTH", "3"))
MAX_PAGES = int(os.environ.get("CRAWL_MAX_PAGES", "200"))
MIN_CONTENT_CHARS = int(os.environ.get("MIN_CONTENT_CHARS", "200"))
DOC_EXTENSIONS = (".pdf", ".doc", ".docx")


# --- pure helpers (no I/O, unit-tested in test_crawl.py) ---------------------
def url_to_slug(url: str) -> str:
    """Stable, filesystem-safe slug for a URL. Includes host + path + a short query hash so two
    URLs differing only by query string don't collide onto the same key."""
    p = urlparse(url)
    parts = [p.netloc, p.path.strip("/")]
    raw = "/".join(x for x in parts if x) or "index"
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", raw).strip("-").lower() or "index"
    if p.query:
        qh = hashlib.sha256(p.query.encode("utf-8")).hexdigest()[:8]
        slug = f"{slug}-{qh}"
    return slug


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_sidecar(url: str, title: str, markdown: str, depth: int, s3_markdown_key: str) -> dict:
    """Metadata sidecar, deliberately aligned to the KB chunk metadata (lib/rag/kb-parser.ts) so a
    later chunking step maps it straight onto source_url/title/freshness."""
    return {
        "source_url": url,
        "title": title or "",
        "crawled_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "content_sha256": content_hash(markdown),
        "content_chars": len(markdown),
        "depth": depth,
        "s3_markdown_key": s3_markdown_key,
    }


def is_doc_link(href: str) -> bool:
    return urlparse(href).path.lower().endswith(DOC_EXTENSIONS)


# --- storage sinks -----------------------------------------------------------
class Sink(ABC):
    @abstractmethod
    def put(self, key: str, body: bytes, content_type: str) -> None: ...


class LocalSink(Sink):
    """--dry-run target: writes under ./out/ so the whole pipeline runs offline without AWS."""

    def __init__(self, root: str = "out") -> None:
        self.root = Path(root)

    def put(self, key: str, body: bytes, content_type: str) -> None:
        dest = self.root / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        print(f"  local  {dest}")


class S3Sink(Sink):
    def __init__(self, bucket: str) -> None:
        import boto3  # lazy: only needed for real runs

        if not bucket:
            raise SystemExit("S3_BUCKET is not set (use --dry-run to write locally instead).")
        self.bucket = bucket
        self.client = boto3.client("s3")  # region + creds from the standard boto3 env chain

    def put(self, key: str, body: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType=content_type)
        print(f"  s3     s3://{self.bucket}/{key}")


# --- crawl -------------------------------------------------------------------
def _extract_markdown(result) -> str:
    """crawl4ai's .markdown is a MarkdownGenerationResult (fit_markdown preferred) across versions,
    but be defensive: fall back to raw_markdown, then to str()."""
    md = getattr(result, "markdown", None)
    if md is None:
        return ""
    for attr in ("fit_markdown", "raw_markdown"):
        val = getattr(md, attr, None)
        if val:
            return val
    return str(md)


async def crawl(sink: Sink, base_url: str, max_depth: int, max_pages: int) -> None:
    # Lazy heavy imports so the pure helpers stay importable without crawl4ai installed.
    from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
    from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
    from crawl4ai.deep_crawling.filters import FilterChain, DomainFilter
    from crawl4ai.content_filter_strategy import PruningContentFilter
    from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

    domain = urlparse(base_url).netloc
    run_cfg = CrawlerRunConfig(
        deep_crawl_strategy=BFSDeepCrawlStrategy(
            max_depth=max_depth,
            max_pages=max_pages,
            filter_chain=FilterChain([DomainFilter(allowed_domains=[domain])]),
        ),
        markdown_generator=DefaultMarkdownGenerator(content_filter=PruningContentFilter()),
        wait_until="domcontentloaded",  # "networkidle" times out: site never goes fully idle
        delay_before_return_html=2.0,  # give JS-rendered pricing/schedule pages time to hydrate
        page_timeout=45000,
        cache_mode=CacheMode.BYPASS,
        stream=False,
        verbose=False,
    )

    crawl_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    run_prefix = f"{S3_PREFIX}/crawl_date={crawl_date}"
    seen_hashes: set[str] = set()
    doc_links: set[str] = set()
    manifest: list[dict] = []

    print(f"Crawling {base_url} (domain={domain}, depth<={max_depth}, pages<={max_pages})")
    async with AsyncWebCrawler() as crawler:
        results = await crawler.arun(base_url, config=run_cfg)

        for result in results:
            if not getattr(result, "success", False):
                err = getattr(result, "error_message", None)
                status = getattr(result, "status_code", None)
                print(f"  fail   [{status}] {result.url}: {err}")
                continue
            url = result.url
            markdown = _extract_markdown(result).strip()

            # collect linked docs (pdf/doc/docx) to download separately
            internal = (getattr(result, "links", {}) or {}).get("internal", [])
            for link in internal:
                href = link.get("href") if isinstance(link, dict) else link
                if href and is_doc_link(href):
                    doc_links.add(href)

            if len(markdown) < MIN_CONTENT_CHARS:
                print(f"  skip   (thin, {len(markdown)} chars) {url}")
                continue
            h = content_hash(markdown)
            if h in seen_hashes:
                print(f"  skip   (dup) {url}")
                continue
            seen_hashes.add(h)

            slug = url_to_slug(url)
            md_key = f"{run_prefix}/pages/{slug}.md"
            json_key = f"{run_prefix}/pages/{slug}.json"
            title = (getattr(result, "metadata", {}) or {}).get("title", "")
            depth = int((getattr(result, "metadata", {}) or {}).get("depth", 0))
            sidecar = build_sidecar(url, title, markdown, depth, md_key)

            sink.put(md_key, markdown.encode("utf-8"), "text/markdown; charset=utf-8")
            sink.put(json_key, json.dumps(sidecar, ensure_ascii=False, indent=2).encode("utf-8"),
                     "application/json")
            manifest.append({**sidecar, "s3_sidecar_key": json_key})

    _download_docs(sink, run_prefix, doc_links, manifest)

    manifest_doc = {
        "base_url": base_url,
        "crawl_date": crawl_date,
        "params": {"max_depth": max_depth, "max_pages": max_pages,
                   "min_content_chars": MIN_CONTENT_CHARS},
        "page_count": sum(1 for m in manifest if m.get("s3_markdown_key")),
        "file_count": sum(1 for m in manifest if m.get("s3_file_key")),
        "items": manifest,
    }
    sink.put(f"{run_prefix}/manifest.json",
             json.dumps(manifest_doc, ensure_ascii=False, indent=2).encode("utf-8"),
             "application/json")
    print(f"Done: {manifest_doc['page_count']} pages, {manifest_doc['file_count']} files.")


def _download_docs(sink: Sink, run_prefix: str, doc_links: set[str], manifest: list[dict]) -> None:
    if not doc_links:
        return
    import httpx  # lazy

    with httpx.Client(follow_redirects=True, timeout=60) as client:
        for href in sorted(doc_links):
            try:
                resp = client.get(href)
                resp.raise_for_status()
            except Exception as err:  # a broken doc link must not abort the run
                print(f"  doc-fail {href}: {err}")
                continue
            name = os.path.basename(urlparse(href).path) or url_to_slug(href)
            key = f"{run_prefix}/files/{name}"
            sink.put(key, resp.content,
                     resp.headers.get("content-type", "application/octet-stream"))
            manifest.append({
                "source_url": href, "s3_file_key": key,
                "content_sha256": content_hash(resp.text if resp.encoding else ""),
                "content_bytes": len(resp.content),
            })


def main() -> None:
    ap = argparse.ArgumentParser(description="Crawl the hospital site to S3 for later KB chunking.")
    ap.add_argument("--dry-run", action="store_true", help="write to ./out/ instead of S3")
    ap.add_argument("--base-url", default=BASE_URL)
    ap.add_argument("--max-depth", type=int, default=MAX_DEPTH)
    ap.add_argument("--max-pages", type=int, default=MAX_PAGES)
    args = ap.parse_args()

    sink: Sink = LocalSink() if args.dry_run else S3Sink(S3_BUCKET)
    asyncio.run(crawl(sink, args.base_url, args.max_depth, args.max_pages))


if __name__ == "__main__":
    main()
