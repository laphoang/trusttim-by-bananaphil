"""Parse PDFs (native or scanned/image-only) into markdown + metadata sidecars for later KB
chunking. Native-text PDFs are converted via pymupdf4llm (Markdown, tables/headings preserved).
Scanned/image-only PDFs are OCR'd with VietOCR (see ocr.py) after a whole-document sparse-text
check (average extractable chars/page below MIN_CHARS_PER_PAGE).

Scope: this stops at markdown+sidecar in storage. Chunking/ingest into pgvector stays the existing
TypeScript path (lib/rag/ingest.ts), fed manually. See README.md.

S3 convention: reads every PDF under s3://$S3_BUCKET/$S3_INPUT_PREFIX/, writes markdown + sidecar
under s3://$S3_BUCKET/$S3_OUTPUT_PREFIX/. Re-runs are idempotent: a PDF whose sidecar already
records a matching source_pdf_sha256 is skipped (OCR is the expensive step, avoid redoing it).

Heavy deps (fitz, pymupdf4llm, vietocr/torch, cv2) are imported lazily inside the functions that
use them so the pure helpers below stay importable offline (test_parse_pdfs.py needs none of them
for its offline-only assertions).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, List, Optional, Tuple

# --- config (env, overridable by CLI) ---------------------------------------
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_INPUT_PREFIX = os.environ.get("S3_INPUT_PREFIX", "raw-pdf").strip("/")
S3_OUTPUT_PREFIX = os.environ.get("S3_OUTPUT_PREFIX", "cleaned-pdf").strip("/")
MIN_CHARS_PER_PAGE = float(os.environ.get("MIN_CHARS_PER_PAGE", "40"))


# --- pure helpers (no I/O, unit-tested in test_parse_pdfs.py) ---------------
def content_hash(data) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def is_native_text(avg_chars_per_page: float, min_chars_per_page: float = MIN_CHARS_PER_PAGE) -> bool:
    return avg_chars_per_page >= min_chars_per_page


def slugify(name: str) -> str:
    """Filesystem/S3-safe base name (no extension) for a PDF's original filename."""
    stem = Path(name).stem
    return re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower() or "document"


def build_sidecar(
    source_pdf: str,
    title: str,
    markdown: str,
    page_count: int,
    ocr_used: bool,
    source_pdf_sha256: str,
    s3_markdown_key: str,
) -> dict:
    """Metadata sidecar, shaped like the crawler's for consistency across the raw-content corpus."""
    return {
        "source_pdf": source_pdf,
        "title": title or "",
        "extracted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "content_sha256": content_hash(markdown),
        "content_chars": len(markdown),
        "page_count": page_count,
        "ocr_used": ocr_used,
        "source_pdf_sha256": source_pdf_sha256,
        "s3_markdown_key": s3_markdown_key,
    }


# --- sources (read PDFs) -----------------------------------------------------
class Source(ABC):
    @abstractmethod
    def iter_pdfs(self) -> Iterator[Tuple[str, bytes]]:
        """Yield (name, pdf_bytes) for every PDF to process."""


class LocalSource(Source):
    def __init__(self, root: str) -> None:
        self.root = Path(root)

    def iter_pdfs(self) -> Iterator[Tuple[str, bytes]]:
        for path in sorted(self.root.glob("*.pdf")):
            yield path.name, path.read_bytes()


class S3Source(Source):
    def __init__(self, bucket: str, prefix: str) -> None:
        import boto3

        if not bucket:
            raise SystemExit("S3_BUCKET is not set (use --dry-run --local-dir instead).")
        self.bucket = bucket
        self.prefix = prefix
        self.client = boto3.client("s3")

    def iter_pdfs(self) -> Iterator[Tuple[str, bytes]]:
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=f"{self.prefix}/"):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if not key.lower().endswith(".pdf"):
                    continue
                name = key[len(self.prefix):].lstrip("/")
                body = self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
                yield name, body


# --- sinks (write markdown + sidecar, read back for idempotency) -----------
class Sink(ABC):
    @abstractmethod
    def put(self, key: str, body: bytes, content_type: str) -> None: ...

    @abstractmethod
    def get_existing_sidecar(self, key: str) -> Optional[dict]:
        """Return the existing sidecar dict at `key`, or None if it doesn't exist."""


class LocalSink(Sink):
    """--dry-run target: writes under ./out/ so the whole pipeline runs offline without AWS."""

    def __init__(self, root: str = "out") -> None:
        self.root = Path(root)

    def put(self, key: str, body: bytes, content_type: str) -> None:
        dest = self.root / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        print(f"  local  {dest}")

    def get_existing_sidecar(self, key: str) -> Optional[dict]:
        dest = self.root / key
        if not dest.exists():
            return None
        return json.loads(dest.read_text(encoding="utf-8"))


class S3Sink(Sink):
    def __init__(self, bucket: str) -> None:
        import boto3

        if not bucket:
            raise SystemExit("S3_BUCKET is not set (use --dry-run to write locally instead).")
        self.bucket = bucket
        self.client = boto3.client("s3")

    def put(self, key: str, body: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType=content_type)
        print(f"  s3     s3://{self.bucket}/{key}")

    def get_existing_sidecar(self, key: str) -> Optional[dict]:
        from botocore.exceptions import ClientError

        try:
            body = self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except ClientError as err:
            if err.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                return None
            raise
        return json.loads(body)


# --- PDF extraction -----------------------------------------------------------
def extract_pdf(
    pdf_bytes: bytes, min_chars_per_page: float = MIN_CHARS_PER_PAGE
) -> Tuple[str, int, bool, str]:
    """Returns (markdown, page_count, ocr_used, title)."""
    import fitz

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page_count = doc.page_count
        avg_chars = sum(len(p.get_text().strip()) for p in doc) / max(page_count, 1)
        title = (doc.metadata or {}).get("title") or ""

        if is_native_text(avg_chars, min_chars_per_page):
            import pymupdf4llm

            markdown = pymupdf4llm.to_markdown(doc)
            ocr_used = False
        else:
            import io

            from PIL import Image

            from ocr import get_predictor, ocr_page_image

            predictor = get_predictor()
            parts = []
            for i, page in enumerate(doc):
                pix = page.get_pixmap(dpi=200)
                image = Image.open(io.BytesIO(pix.tobytes("png")))
                text = ocr_page_image(image, predictor)
                parts.append(f"<!-- page {i + 1} -->\n\n{text}")
            markdown = "\n\n".join(parts)
            ocr_used = True
    finally:
        doc.close()

    return markdown.strip(), page_count, ocr_used, title


# --- orchestration ------------------------------------------------------------
def run(source: Source, sink: Sink, output_prefix: str, min_chars_per_page: float) -> None:
    manifest: List[dict] = []
    processed = skipped = 0

    for name, pdf_bytes in source.iter_pdfs():
        slug = slugify(name)
        md_key = f"{output_prefix}/{slug}.md"
        json_key = f"{output_prefix}/{slug}.json"
        pdf_hash = content_hash(pdf_bytes)

        existing = sink.get_existing_sidecar(json_key)
        if existing and existing.get("source_pdf_sha256") == pdf_hash:
            print(f"  skip   (unchanged) {name}")
            manifest.append(existing)
            skipped += 1
            continue

        try:
            markdown, page_count, ocr_used, title = extract_pdf(pdf_bytes, min_chars_per_page)
        except Exception as err:  # a broken PDF must not abort the whole run
            print(f"  fail   {name}: {err}")
            continue

        sidecar = build_sidecar(name, title, markdown, page_count, ocr_used, pdf_hash, md_key)
        sink.put(md_key, markdown.encode("utf-8"), "text/markdown; charset=utf-8")
        sink.put(
            json_key,
            json.dumps(sidecar, ensure_ascii=False, indent=2).encode("utf-8"),
            "application/json",
        )
        manifest.append(sidecar)
        processed += 1
        print(f"  done   [{'ocr' if ocr_used else 'native'}] {name}")

    sink.put(
        f"{output_prefix}/manifest.json",
        json.dumps({"items": manifest}, ensure_ascii=False, indent=2).encode("utf-8"),
        "application/json",
    )
    print(f"Done: {processed} processed, {skipped} skipped (unchanged), {len(manifest)} total.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Parse PDFs to markdown + sidecar for later KB chunking.")
    ap.add_argument("--dry-run", action="store_true", help="read/write ./out/ instead of S3")
    ap.add_argument("--local-dir", default="sample_pdfs", help="local PDF dir for --dry-run")
    ap.add_argument("--min-chars-per-page", type=float, default=MIN_CHARS_PER_PAGE)
    args = ap.parse_args()

    source: Source
    sink: Sink
    if args.dry_run:
        source = LocalSource(args.local_dir)
        sink = LocalSink()
    else:
        source = S3Source(S3_BUCKET, S3_INPUT_PREFIX)
        sink = S3Sink(S3_BUCKET)

    run(source, sink, S3_OUTPUT_PREFIX, args.min_chars_per_page)


if __name__ == "__main__":
    main()
