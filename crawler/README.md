# TrustTim crawler → S3

A standalone Python process that deep-crawls the Hanoi Heart Hospital website
(`benhvientimhanoi.vn`) with [crawl4ai](https://github.com/unclecode/crawl4AI), converts each page
to clean markdown, and writes **markdown + a JSON metadata sidecar** per page to an S3 bucket for
later chunking into the knowledge base.

This is isolated from the Next.js app — it does not import from `lib/` and has its own deps and env.
It **stops at raw content in S3**; chunking/ingest into pgvector stays the existing TypeScript path
(`lib/rag/ingest.ts`). The sidecar metadata (`source_url`, `title`, `crawled_at`, `content_sha256`)
is shaped to map straight onto the KB chunk metadata that step expects.

## Setup

Uses [uv](https://docs.astral.sh/uv/). Deps live in `pyproject.toml`.

```bash
cd crawler
uv sync                       # creates .venv + installs deps (writes uv.lock)
uv run crawl4ai-setup         # one-time: installs the Playwright Chromium crawl4ai drives
# (if that command is unavailable: uv run playwright install chromium)
cp .env.example .env           # fill in AWS creds + S3_BUCKET
```

## Run

```bash
# Safe first run — writes to ./out/ instead of S3, small page cap:
uv run python crawl.py --dry-run --max-pages 5

# Real run to S3 (--env-file loads .env: S3_BUCKET, AWS_*, CRAWL_* ):
uv run --env-file .env python crawl.py
```

CLI flags override env: `--base-url`, `--max-depth`, `--max-pages`, `--dry-run`.

### Output layout (per run — immutable dated snapshot)

```
s3://$S3_BUCKET/$S3_PREFIX/crawl_date=YYYY-MM-DD/
├─ pages/<url-slug>.md      # filtered markdown (nav/boilerplate stripped)
├─ pages/<url-slug>.json    # sidecar: source_url, title, crawled_at, content_sha256, depth, ...
├─ files/<name>.pdf         # any linked .pdf/.doc/.docx, downloaded as-is
└─ manifest.json            # index of everything captured this run + run params
```

Pages under `MIN_CONTENT_CHARS` (nav-only hubs) and byte-identical duplicates are skipped.

## Schedule (the "automatic" part)

Run it on a timer with whatever scheduler you already have — no daemon needed. Examples:

- **cron** (weekly, Monday 02:00): `0 2 * * 1 cd /path/to/crawler && uv run --env-file .env python crawl.py`
- **GitHub Actions**: a workflow with `on: schedule: [ cron: "0 2 * * 1" ]` that runs `uv sync`,
  `uv run crawl4ai-setup`, sets the AWS/S3 secrets as env, and runs `uv run python crawl.py`.

## Test

```bash
uv run python test_crawl.py   # offline asserts on the pure helpers (no network, no AWS)
```
