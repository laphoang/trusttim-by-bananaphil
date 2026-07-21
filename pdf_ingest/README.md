# TrustTim PDF ingest

Parses hospital PDFs — native-text or scanned/image-only — into **markdown + a JSON metadata
sidecar** for later chunking into the knowledge base. Standalone Python process, isolated from the
Next.js app and from the `crawler/` (crawl4ai) tool; own deps, own env.

Stops at markdown+sidecar in storage — chunking of this output into KB-ready chunks is the
standalone [`chunking/`](../chunking/README.md) tool; pgvector ingest from those chunks is a
separate, later step.

## How it decides native vs. OCR

Per PDF, whole-document (not per-page): average extractable characters per page is compared to
`MIN_CHARS_PER_PAGE` (default 40).

- **Native** (digital PDF): converted via `pymupdf4llm` straight to markdown — preserves headings
  and tables far better than plain text-joining. No LLM cost.
- **Scanned/image-only**: each page is rendered to an image and OCR'd with a **vision-LLM**
  (`gpt-4.1-mini`) that returns a clean markdown table — see `ocr.py`. These hospital scans are
  clean, well-ruled multi-column price tables; a vision model reads them holistically (layout +
  Vietnamese diacritics + numbers) and reconstructs the table structure, which a line-by-line OCR
  engine cannot. Uses the same `OPENAI_API_KEY` / model as the main app.

## Setup

Uses [uv](https://docs.astral.sh/uv/). Lightweight (~120 MB venv — no ML frameworks).

```bash
cd pdf_ingest
uv sync
cp .env.example .env   # fill in AWS creds + S3_BUCKET + OPENAI_API_KEY
```

## Run

```bash
# Safe first run — reads from a local dir, writes to ./out/ instead of S3:
mkdir -p sample_pdfs   # drop a test PDF or two in here
uv run python parse_pdfs.py --dry-run --local-dir sample_pdfs

# Real run — reads every PDF under s3://$S3_BUCKET/$S3_INPUT_PREFIX/, writes results under
# s3://$S3_BUCKET/$S3_OUTPUT_PREFIX/:
uv run --env-file .env python parse_pdfs.py
```

Re-runs are **idempotent**: a PDF whose sidecar already records a matching source-PDF hash is
skipped (avoids re-paying for vision OCR on unchanged files). `manifest.json` is overwritten each
run to reflect the full current state of the output prefix. Pass `--force` to re-process anyway —
needed after changing the OCR method, since the input hash is unchanged.

Only scanned PDFs incur an LLM cost (one `gpt-4.1-mini` vision call per page); native-text PDFs are
free. Ballpark: a few tenths of a cent per scanned page.

### Output layout

```
s3://$S3_BUCKET/$S3_INPUT_PREFIX/<name>.pdf     # input (written by the crawler or uploaded manually)
s3://$S3_BUCKET/$S3_OUTPUT_PREFIX/<slug>.md     # output: markdown
s3://$S3_BUCKET/$S3_OUTPUT_PREFIX/<slug>.json   # output: sidecar (source_pdf, ocr_used, hashes, ...)
s3://$S3_BUCKET/$S3_OUTPUT_PREFIX/manifest.json # current full index of everything processed
```

## Test

```bash
uv run python test_parse_pdfs.py
```

Covers the pure helpers (`is_native_text`, `slugify`, `content_hash`, `build_sidecar`,
`ocr.build_vision_messages`) plus one real end-to-end check: a one-page text PDF generated in-memory
with `fitz`, run through the native-text extraction path.

**Not covered by the automated test:** the vision-OCR path (needs a live OpenAI call). Verify it
manually — run against a real scanned PDF and check `./out/*.md` (or the S3 output) for a clean
markdown table with correct Vietnamese diacritics/prices and `"ocr_used": true` +
`"ocr_method": "vision-llm:gpt-4.1-mini"` in the sidecar. For a very dense page (~40 rows), if the
table comes back truncated, split tall pages into halves (two vision calls) — not implemented until
a real page needs it.
