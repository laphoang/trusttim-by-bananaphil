# TrustTim KB ingest

Reads every `.jsonl` chunk file from `s3://$S3_BUCKET/$S3_KB_PREFIX/` (written by
[`chunking/`](../chunking/README.md)), embeds each chunk's `content` via the FPT
`vietnamese-embedding` API, and upserts into Supabase's `kb_chunks` table. Standalone Python
process, independent of `chunking/`/`pdf_ingest/` — it only reads their S3 output as plain files;
own deps, own env.

Coupled to the Next.js app only through the shared `kb_chunks` table: this tool and
[`lib/rag/ingest.ts`](../lib/rag/ingest.ts) (which ingests the hand-curated `hackathon_docs/kb/*.md`
+ `rules.json`) use the same upsert semantics (`on conflict (id) do update`), so both writers are
safe to re-run and don't collide — they write disjoint `id` namespaces (`pdf-<slug>-<NNNN>` here vs.
hand-authored ids there).

## Setup

Uses [uv](https://docs.astral.sh/uv/).

```bash
cd kb_ingest
uv sync
cp .env.example .env   # fill in AWS creds + S3_BUCKET, FPT API_KEY, Supabase DATABASE_URL
```

## Run

```bash
# Safe first look — lists files + prints a sample chunk per file. No embeddings call, no DB write,
# zero cost:
uv run python ingest.py --dry-run

# Real run on just one file first, to confirm one end-to-end round-trip before spending on the
# full corpus:
uv run --env-file .env python ingest.py --filter banggiadvktyc

# Full real run — embeds + upserts every chunk under s3://$S3_BUCKET/$S3_KB_PREFIX/:
uv run --env-file .env python ingest.py
```

Every run re-embeds and re-upserts everything it finds (`on conflict (id) do update`) — safe to
re-run. Commits once per source file, so a failure partway through doesn't lose already-completed
files (a broken file is skipped with a `fail` line, not a crash).

### Cost

FPT `vietnamese-embedding` is $0.011/M input tokens (`hackathon_docs/guide/llm_api_example.md`).
Embedding the full current corpus (a few thousand ~500-token chunks) costs a small fraction of a
dollar.

## Test

```bash
uv run python test_ingest.py
```

Covers the pure helpers (`parse_jsonl`, `batched`, `vector_literal`, `build_upsert_params`) — no
network, no DB needed.
