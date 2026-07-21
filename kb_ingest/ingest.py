"""Embed S3 knowledge-base chunk JSONL and upsert into Supabase's kb_chunks table.

Standalone tool, independent of `chunking/`/`pdf_ingest/` — it only consumes their S3 output
(`knowledge-base/**/*.jsonl`) as plain files; it does not import their code. Coupled to the rest of
the app only via S3 and the shared Supabase Postgres database (same `kb_chunks` table + upsert
semantics as `lib/rag/ingest.ts`, so both writers are consistent and idempotent on `id`).

Heavy deps (boto3, requests, psycopg) are imported lazily inside the functions that use them so the
pure helpers below stay importable offline (test_ingest.py needs none of them).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from typing import Iterator, List, Optional

# --- config (env, overridable by CLI) ---------------------------------------
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_KB_PREFIX = os.environ.get("S3_KB_PREFIX", "knowledge-base").strip("/")
API_BASE_URL = os.environ.get("API_BASE_URL", "")
API_KEY = os.environ.get("API_KEY", "")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "Vietnamese_Embedding")
EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", "1024"))
EMBED_BATCH_SIZE = int(os.environ.get("EMBED_BATCH_SIZE", "64"))

TIMEOUT_SECONDS = 15
MAX_RETRIES = 2

# Same semantics as lib/rag/ingest.ts's upsert (dict-style %(name)s params let us reuse `content`
# in the tsvector expression without duplicating it in the row).
UPSERT_SQL = """
insert into kb_chunks (id, topic, title, content, keywords, source_url, is_synthetic, freshness, embedding, fts)
values (%(id)s, %(topic)s, %(title)s, %(content)s, %(keywords)s, %(source_url)s, %(is_synthetic)s,
        %(freshness)s, %(embedding)s::vector, to_tsvector('simple', %(content)s || ' ' || %(keyword_text)s))
on conflict (id) do update set
  topic = excluded.topic, title = excluded.title, content = excluded.content,
  keywords = excluded.keywords, source_url = excluded.source_url,
  is_synthetic = excluded.is_synthetic, freshness = excluded.freshness,
  embedding = excluded.embedding, fts = excluded.fts
"""


# --- pure helpers (no I/O, unit-tested in test_ingest.py) -------------------
def parse_jsonl(text: str) -> List[dict]:
    """One JSON object per non-blank line."""
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def batched(items: List, size: int) -> Iterator[List]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def vector_literal(embedding: List[float]) -> str:
    """Formats a float list as a pgvector literal, e.g. "[0.1,0.2,...]" (mirrors
    lib/db/client.ts's toVectorLiteral)."""
    return f"[{','.join(str(x) for x in embedding)}]"


def build_upsert_params(chunk: dict, embedding: List[float], keyword_text: str) -> dict:
    """Pure mapping from a kb_chunks-shaped chunk dict + its embedding to the UPSERT_SQL params."""
    return {
        "id": chunk["id"],
        "topic": chunk.get("topic"),
        "title": chunk.get("title") or None,
        "content": chunk["content"],
        "keywords": chunk.get("keywords") or [],
        "source_url": chunk.get("source_url"),
        "is_synthetic": chunk.get("is_synthetic", False),
        "freshness": chunk.get("freshness"),
        "embedding": vector_literal(embedding),
        "keyword_text": keyword_text,
    }


# --- I/O (S3, FPT embeddings, Postgres) --------------------------------------
def iter_jsonl_keys(s3_client, bucket: str, prefix: str) -> Iterator[str]:
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=f"{prefix}/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.lower().endswith(".jsonl"):
                yield key


def read_jsonl_from_s3(s3_client, bucket: str, key: str) -> str:
    return s3_client.get_object(Bucket=bucket, Key=key)["Body"].read().decode("utf-8")


def embed_batch(texts: List[str]) -> List[List[float]]:
    """POSTs to FPT's /v1/embeddings with the same body shape as lib/embeddings/client.ts. Retries
    with backoff — this is a paid call, worth not re-doing the whole batch on a transient error."""
    import requests

    if not API_KEY or not API_BASE_URL:
        raise SystemExit("API_KEY / API_BASE_URL are not set.")
    url = f"{API_BASE_URL}/v1/embeddings"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}
    body = {
        "model": EMBEDDING_MODEL,
        "input": texts,
        "dimensions": EMBEDDING_DIM,
        "encoding_format": "float",
        "input_text_truncate": "none",
        "input_type": "passage",
    }
    delay = 1.0
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.post(url, headers=headers, json=body, timeout=TIMEOUT_SECONDS)
            resp.raise_for_status()
            data = resp.json()["data"]
            return [d["embedding"] for d in sorted(data, key=lambda d: d["index"])]
        except requests.RequestException:
            if attempt == MAX_RETRIES:
                raise
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("unreachable")


def get_db_connection():
    """Lazy psycopg connection from DATABASE_URL. sslmode=require unless localhost (mirrors
    lib/db/client.ts's isLocal check — Supabase/managed Postgres need TLS, local Docker doesn't)."""
    import psycopg

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        raise SystemExit("DATABASE_URL is not set.")
    is_local = re.search(r"@(localhost|127\.0\.0\.1)[:/]", database_url) is not None
    if not is_local:
        sep = "&" if "?" in database_url else "?"
        database_url = f"{database_url}{sep}sslmode=require"
    return psycopg.connect(database_url)


def upsert_chunks(conn, rows: List[dict]) -> None:
    with conn.cursor() as cur:
        for params in rows:
            cur.execute(UPSERT_SQL, params)
    conn.commit()


# --- orchestration ------------------------------------------------------------
def run(dry_run: bool, key_filter: Optional[str] = None) -> None:
    import boto3

    if not S3_BUCKET:
        raise SystemExit("S3_BUCKET is not set.")
    s3 = boto3.client("s3")
    keys = list(iter_jsonl_keys(s3, S3_BUCKET, S3_KB_PREFIX))
    if key_filter:
        keys = [k for k in keys if key_filter in k]
    print(f"Found {len(keys)} .jsonl file(s) under s3://{S3_BUCKET}/{S3_KB_PREFIX}/")

    if dry_run:
        for key in keys:
            chunks = parse_jsonl(read_jsonl_from_s3(s3, S3_BUCKET, key))
            print(f"  {key}: {len(chunks)} chunks")
            if chunks:
                print(f"    sample: {json.dumps(chunks[0], ensure_ascii=False)[:200]}")
        return

    conn = get_db_connection()
    total = 0
    for key in keys:
        try:
            chunks = parse_jsonl(read_jsonl_from_s3(s3, S3_BUCKET, key))
            rows = []
            for batch in batched(chunks, EMBED_BATCH_SIZE):
                embeddings = embed_batch([c["content"] for c in batch])
                for chunk, embedding in zip(batch, embeddings):
                    keyword_text = " ".join(chunk.get("keywords") or [])
                    rows.append(build_upsert_params(chunk, embedding, keyword_text))
            upsert_chunks(conn, rows)
            total += len(rows)
            print(f"  done   {key}: {len(rows)} chunks upserted")
        except Exception as err:  # a broken file must not abort the whole run
            print(f"  fail   {key}: {err}")
            conn.rollback()
    conn.close()
    print(f"Done: {total} chunks upserted across {len(keys)} file(s).")


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Embed S3 knowledge-base chunk JSONL and upsert into Supabase kb_chunks."
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="list files + print a sample chunk only; no embeddings call, no DB write",
    )
    ap.add_argument(
        "--filter",
        default=None,
        help="only process keys containing this substring (e.g. one filename), for staged testing",
    )
    args = ap.parse_args()
    run(dry_run=args.dry_run, key_filter=args.filter)


if __name__ == "__main__":
    main()
