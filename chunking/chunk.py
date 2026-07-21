"""Structure-aware recursive chunking of cleaned PDF markdown into KB-ready chunks.

Standalone tool, independent of `pdf_ingest/` — it only consumes `pdf_ingest`'s S3 output
(`pdf/cleaned-pdf/*.md` + sidecar `.json`) as plain files; it does not import pdf_ingest code.

Plain recursive splitting is fine on chunk *size* but wrong on these hospital price *tables*:
naive splitting drops the column-header row and section title from every chunk after the first,
exactly the context a price-lookup query needs. So tables are chunked specially: every emitted
chunk repeats the section title + the table's header/separator row, with a trailing-row overlap
between consecutive table chunks. Prose sections are split with langchain_text_splitters'
RecursiveCharacterTextSplitter (paragraph -> line -> sentence -> word descent), with the same
token-budget + overlap.

Scope: writes chunk JSONL to S3 only (`knowledge-base/pdf-chunks/`). No pgvector embed/upsert —
that ingest step is separate and reads this S3 prefix later.

Token counting uses tiktoken's cl100k_base, injected as a callable so the pure helpers below stay
testable with a trivial word-counter (no network/tiktoken needed offline). tiktoken over-counts
Vietnamese relative to the FPT `vietnamese-embedding` model's (BGE-M3) sentencepiece tokenizer, so
a chunk that fits the tiktoken budget is conservatively within the real embedding-model budget.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Callable, Iterator, List, Optional, Tuple

# --- config (env, overridable by CLI) ---------------------------------------
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_CHUNK_INPUT_PREFIX = os.environ.get("S3_CHUNK_INPUT_PREFIX", "pdf/cleaned-pdf").strip("/")
S3_CHUNK_OUTPUT_PREFIX = os.environ.get("S3_CHUNK_OUTPUT_PREFIX", "knowledge-base/pdf-chunks").strip("/")
CHUNK_MAX_TOKENS = int(os.environ.get("CHUNK_MAX_TOKENS", "500"))
CHUNK_OVERLAP_TOKENS = int(os.environ.get("CHUNK_OVERLAP_TOKENS", "100"))
CHUNK_TOPIC = os.environ.get("CHUNK_TOPIC", "bhyt_pricing")

_HEADER_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$")

CountFn = Callable[[str], int]


# --- pure helpers (no I/O, unit-tested in test_chunk.py) --------------------
_encoding = None


def count_tokens(text: str) -> int:
    """tiktoken cl100k_base count. Imported lazily (and cached) so pure helpers stay importable
    offline, and so packing loops that call this per-row don't reload the encoding each time."""
    global _encoding
    if _encoding is None:
        import tiktoken

        _encoding = tiktoken.get_encoding("cl100k_base")
    return len(_encoding.encode(text))


def split_sections(md: str) -> List[Tuple[Optional[str], str]]:
    """Split on markdown header lines (# .. ######). Text before the first header becomes a
    titleless (None, text) section."""
    lines = md.split("\n")
    sections: List[Tuple[Optional[str], List[str]]] = []
    current_title: Optional[str] = None
    current_body: List[str] = []
    for line in lines:
        m = _HEADER_RE.match(line)
        if m:
            if current_title is not None or current_body:
                sections.append((current_title, current_body))
            current_title = m.group(2).strip()
            current_body = []
        else:
            current_body.append(line)
    if current_title is not None or current_body:
        sections.append((current_title, current_body))
    return [(title, "\n".join(body).strip()) for title, body in sections if "\n".join(body).strip() or title]


def _is_table_start(lines: List[str], i: int) -> bool:
    return (
        lines[i].strip().startswith("|")
        and i + 1 < len(lines)
        and bool(_TABLE_SEP_RE.match(lines[i + 1]))
    )


def split_prose_and_tables(body: str) -> List[Tuple[str, object]]:
    """Split a section body into ordered ("prose", text) / ("table", table_lines) blocks."""
    lines = body.split("\n")
    n = len(lines)
    blocks: List[Tuple[str, object]] = []
    i = 0
    while i < n:
        if _is_table_start(lines, i):
            j = i
            table_lines = []
            while j < n and lines[j].strip().startswith("|"):
                table_lines.append(lines[j])
                j += 1
            blocks.append(("table", table_lines))
            i = j
        else:
            j = i
            prose_lines = []
            while j < n and not _is_table_start(lines, j):
                prose_lines.append(lines[j])
                j += 1
            prose_text = "\n".join(prose_lines).strip()
            if prose_text:
                blocks.append(("prose", prose_text))
            i = j
    return blocks


def _pack_groups(items: List[str], max_tokens: int, overlap_tokens: int, count: CountFn) -> List[List[str]]:
    """Greedily pack items into token-budgeted groups. Each subsequent group is seeded with a
    token-budgeted suffix of the previous group's tail items (the overlap)."""
    groups: List[List[str]] = []
    start = 0
    n = len(items)
    while start < n:
        group: List[str] = []
        tokens = 0
        i = start
        while i < n:
            t = count(items[i])
            if group and tokens + t > max_tokens:
                break
            group.append(items[i])
            tokens += t
            i += 1
        groups.append(group)
        if i >= n:
            break
        back = i - 1
        ot = count(items[back])
        while back > start and ot + count(items[back - 1]) <= overlap_tokens:
            back -= 1
            ot += count(items[back])
        start = max(back, start + 1)  # always progress, even if overlap would cover the whole group
    return groups


def recursive_split(
    text: str, max_tokens: int, overlap_tokens: int, count: CountFn = count_tokens
) -> List[str]:
    """Descend separators (paragraph -> line -> sentence -> word -> char), pack into <=max_tokens
    windows, carry `overlap_tokens` between consecutive windows. Thin wrapper around
    langchain_text_splitters' RecursiveCharacterTextSplitter, using `count` as the length function
    so the token budget (not character count) drives splitting."""
    text = text.strip()
    if not text:
        return []

    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_tokens,
        chunk_overlap=overlap_tokens,
        length_function=count,
        separators=["\n\n", "\n", ". ", " ", ""],  # trailing "" guarantees a hard budget ceiling
    )
    return splitter.split_text(text)


def chunk_table(
    title: Optional[str],
    table_lines: List[str],
    max_tokens: int,
    overlap_tokens: int,
    count: CountFn = count_tokens,
) -> List[str]:
    """Pack a markdown table's data rows into <=max_tokens chunks, repeating the section title +
    header/separator row on every chunk, with a trailing-row overlap between chunks."""
    header_row, sep_row = table_lines[0], table_lines[1]
    data_rows = table_lines[2:]
    header_block = (f"{title}\n\n" if title else "") + f"{header_row}\n{sep_row}"
    budget = max(max_tokens - count(header_block), 1)

    if not data_rows:
        return [header_block]

    chunks = []
    for group in _pack_groups(data_rows, budget, overlap_tokens, count):
        if group:
            chunks.append(header_block + "\n" + "\n".join(group))
    return chunks


def chunk_markdown(
    md: str,
    source_meta: dict,
    max_tokens: int = CHUNK_MAX_TOKENS,
    overlap_tokens: int = CHUNK_OVERLAP_TOKENS,
    count: CountFn = count_tokens,
) -> List[dict]:
    """Orchestrates section splitting + table/prose chunking, emits `kb_chunks`-shaped dicts."""
    slug = source_meta["slug"]
    topic = source_meta.get("topic", CHUNK_TOPIC)
    source_url = source_meta.get("source_url")
    freshness = source_meta.get("freshness")

    pieces: List[Tuple[Optional[str], str]] = []
    for title, body in split_sections(md):
        for kind, content in split_prose_and_tables(body):
            if kind == "table":
                texts = chunk_table(title, content, max_tokens, overlap_tokens, count)
            else:
                full_text = f"{title}\n\n{content}" if title else content
                texts = recursive_split(full_text, max_tokens, overlap_tokens, count)
            pieces.extend((title, t) for t in texts)

    chunks = []
    for i, (title, content) in enumerate(pieces, start=1):
        chunks.append(
            {
                "id": f"pdf-{slug}-{i:04d}",
                "topic": topic,
                "title": title or "",
                "content": content,
                "keywords": [],
                "source_url": source_url,
                "is_synthetic": False,
                "freshness": freshness,
            }
        )
    return chunks


# --- sources (read cleaned-PDF markdown + sidecar) --------------------------
class Source(ABC):
    @abstractmethod
    def iter_markdown(self) -> Iterator[Tuple[str, str, dict]]:
        """Yield (slug, markdown_text, sidecar_dict) for every cleaned-PDF markdown file."""


class LocalSource(Source):
    def __init__(self, root: str) -> None:
        self.root = Path(root)

    def iter_markdown(self) -> Iterator[Tuple[str, str, dict]]:
        for md_path in sorted(self.root.glob("*.md")):
            slug = md_path.stem
            json_path = md_path.with_suffix(".json")
            sidecar = json.loads(json_path.read_text(encoding="utf-8")) if json_path.exists() else {}
            yield slug, md_path.read_text(encoding="utf-8"), sidecar


class S3Source(Source):
    def __init__(self, bucket: str, prefix: str) -> None:
        import boto3

        if not bucket:
            raise SystemExit("S3_BUCKET is not set (use --dry-run --local-dir instead).")
        self.bucket = bucket
        self.prefix = prefix
        self.client = boto3.client("s3")

    def iter_markdown(self) -> Iterator[Tuple[str, str, dict]]:
        from botocore.exceptions import ClientError

        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=f"{self.prefix}/"):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if not key.lower().endswith(".md"):
                    continue
                slug = Path(key).stem
                md = self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read().decode("utf-8")
                try:
                    json_key = f"{self.prefix}/{slug}.json"
                    body = self.client.get_object(Bucket=self.bucket, Key=json_key)["Body"].read()
                    sidecar = json.loads(body)
                except ClientError:
                    sidecar = {}
                yield slug, md, sidecar


# --- sinks (write chunk JSONL + manifest) -----------------------------------
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
        import boto3

        if not bucket:
            raise SystemExit("S3_BUCKET is not set (use --dry-run to write locally instead).")
        self.bucket = bucket
        self.client = boto3.client("s3")

    def put(self, key: str, body: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType=content_type)
        print(f"  s3     s3://{self.bucket}/{key}")


def _freshness_from_sidecar(sidecar: dict) -> Optional[str]:
    extracted_at = sidecar.get("extracted_at")
    if not extracted_at:
        return None
    date = extracted_at.split("T")[0]
    return f"price list snapshot as of {date} — prices may change, reconfirm before reuse"


# --- orchestration ------------------------------------------------------------
def run(
    source: Source,
    sink: Sink,
    output_prefix: str,
    max_tokens: int,
    overlap_tokens: int,
    topic: str,
    count: CountFn = count_tokens,
) -> None:
    manifest: List[dict] = []
    total_chunks = 0

    for slug, md, sidecar in source.iter_markdown():
        source_meta = {
            "slug": slug,
            "topic": topic,
            "source_url": sidecar.get("source_pdf"),
            "freshness": _freshness_from_sidecar(sidecar),
        }
        chunks = chunk_markdown(md, source_meta, max_tokens, overlap_tokens, count)
        key = f"{output_prefix}/{slug}.jsonl"
        body = "\n".join(json.dumps(c, ensure_ascii=False) for c in chunks).encode("utf-8")
        sink.put(key, body, "application/jsonl")

        manifest.append(
            {"slug": slug, "source_url": source_meta["source_url"], "chunk_count": len(chunks), "output_key": key}
        )
        total_chunks += len(chunks)
        print(f"  done   {slug}: {len(chunks)} chunks")

    sink.put(
        f"{output_prefix}/manifest.json",
        json.dumps({"items": manifest}, ensure_ascii=False, indent=2).encode("utf-8"),
        "application/json",
    )
    print(f"Done: {len(manifest)} files, {total_chunks} chunks total.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Chunk cleaned PDF markdown into KB-ready chunks.")
    ap.add_argument("--dry-run", action="store_true", help="read/write ./out/ instead of S3")
    ap.add_argument("--local-dir", default="sample_md", help="local dir of .md (+.json) for --dry-run")
    ap.add_argument("--max-tokens", type=int, default=CHUNK_MAX_TOKENS)
    ap.add_argument("--overlap-tokens", type=int, default=CHUNK_OVERLAP_TOKENS)
    ap.add_argument("--topic", default=CHUNK_TOPIC)
    args = ap.parse_args()

    source: Source
    sink: Sink
    if args.dry_run:
        source = LocalSource(args.local_dir)
        sink = LocalSink()
    else:
        source = S3Source(S3_BUCKET, S3_CHUNK_INPUT_PREFIX)
        sink = S3Sink(S3_BUCKET)

    run(source, sink, S3_CHUNK_OUTPUT_PREFIX, args.max_tokens, args.overlap_tokens, args.topic)


if __name__ == "__main__":
    main()
