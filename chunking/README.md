# TrustTim chunking

Structure-aware recursive chunking of cleaned PDF markdown into retrieval-sized, `kb_chunks`-shaped
chunks. Standalone Python process, **independent of `pdf_ingest/`** — it only reads `pdf_ingest`'s
S3 output (`pdf/cleaned-pdf/*.md` + sidecar `.json`) as plain files over S3; it does not import any
`pdf_ingest` code, own deps, own env, own venv (same convention as `crawler/` and `pdf_ingest/`).

Writes chunk JSONL to S3 only. No pgvector embed/upsert here — that ingest step is separate and
reads `knowledge-base/pdf-chunks/` later.

## Why not plain recursive splitting?

These hospital PDFs are large price tables. Naive size-based splitting keeps the section title and
the table's column-header row (`| STT | ... | GIÁ DỊCH VỤ |`) only in the *first* chunk — exactly the
context a price-lookup query needs. So table sections are chunked specially: **every** emitted chunk
repeats the section title + header/separator row, with a trailing-row overlap between chunks. Prose
sections use a classic recursive splitter (paragraph → line → sentence → word) with the same
token-budget + overlap packing.

## Setup

Uses [uv](https://docs.astral.sh/uv/).

```bash
cd chunking
uv sync
cp .env.example .env   # fill in AWS creds + S3_BUCKET (can reuse pdf_ingest's)
```

## Run

```bash
# Safe first run — reads from a local dir, writes to ./out/ instead of S3:
mkdir -p sample_md   # drop a cleaned-PDF .md (+ its .json sidecar) here
uv run python chunk.py --dry-run --local-dir sample_md

# Real run — reads every .md under s3://$S3_BUCKET/$S3_CHUNK_INPUT_PREFIX/, writes chunk JSONL
# under s3://$S3_BUCKET/$S3_CHUNK_OUTPUT_PREFIX/:
uv run --env-file .env python chunk.py
```

Every run re-chunks and overwrites all output (chunking is pure CPU work, unlike `pdf_ingest`'s
vision-OCR step — there's no expensive call to avoid redoing, so no idempotency skip is needed).

### Output layout

```
s3://$S3_BUCKET/$S3_CHUNK_INPUT_PREFIX/<slug>.md       # input (written by pdf_ingest)
s3://$S3_BUCKET/$S3_CHUNK_INPUT_PREFIX/<slug>.json     # input sidecar (written by pdf_ingest)
s3://$S3_BUCKET/$S3_CHUNK_OUTPUT_PREFIX/<slug>.jsonl   # output: one kb_chunks-shaped dict per line
s3://$S3_BUCKET/$S3_CHUNK_OUTPUT_PREFIX/manifest.json  # current full index of everything chunked
```

Each line of a `<slug>.jsonl` is `{id, topic, title, content, keywords, source_url, is_synthetic,
freshness}` — matching the `kb_chunks` columns in `lib/db/schema.sql`, so a later ingest step is a
trivial map (`keywords` ships empty; the content-based FTS still works once ingested).

## Test

```bash
uv run python test_chunk.py
```

Covers `split_sections`, `chunk_table` (header/title repetition + row overlap + token budget),
`recursive_split` (budget + overlap), and `chunk_markdown` end-to-end on a synthetic doc — all with
an injected word-counter, no tiktoken/network needed.
