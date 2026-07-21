# TrustTim PDF ingest

Parses hospital PDFs — native-text or scanned/image-only — into **markdown + a JSON metadata
sidecar** for later chunking into the knowledge base. Standalone Python process, isolated from the
Next.js app and from the `crawler/` (crawl4ai) tool; own deps, own env.

Stops at markdown+sidecar in storage — chunking/ingest into pgvector stays the existing TypeScript
path (`lib/rag/ingest.ts`), fed manually.

## How it decides native vs. OCR

Per PDF, whole-document (not per-page): average extractable characters per page is compared to
`MIN_CHARS_PER_PAGE` (default 40).
- **Native** (digital PDF): converted via `pymupdf4llm` straight to markdown — preserves headings
  and tables far better than plain text-joining.
- **Scanned/image-only**: each page is rendered to an image and OCR'd with **VietOCR**
  (Vietnamese-specialized recognition), after locating text lines via a classical horizontal
  projection-profile scan (numpy + cv2 Otsu thresholding for adaptive contrast) — see `ocr.py`.
  VietOCR only *recognizes* text in a given crop; it doesn't locate text on a page itself, which is
  why the line-segmentation step exists.

## Setup

Uses [uv](https://docs.astral.sh/uv/).

```bash
cd pdf_ingest
uv sync   # NOTE: pulls CPU-only torch via vietocr — a much larger/slower install than crawler/'s;
          # still prebuilt wheels, no compile step.
cp .env.example .env   # fill in AWS creds + S3_BUCKET
```

VietOCR downloads its pretrained weights on first real OCR call (one-time, needs network — same
idea as the crawler's `crawl4ai-setup`). No system package needed (no Tesseract).

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
skipped (OCR is the expensive step — avoid redoing it on unchanged files). `manifest.json` is
overwritten each run to reflect the full current state of the output prefix.

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
`ocr.segment_lines` on a synthetic image) plus one real end-to-end check: a one-page text PDF
generated in-memory with `fitz`, run through the native-text extraction path.

**Not covered by the automated test:** the OCR path (needs VietOCR's downloaded weights + a real
scanned image). Verify it manually — drop a real scanned/photographed-page PDF into a local dir and
run the `--dry-run` command above; check `./out/*.md` for legible Vietnamese text (correct
diacritics) and `"ocr_used": true` in the sidecar. If line segmentation misses lines on a messy
real scan, consider swapping in a dedicated text detector (e.g. `craft-text-detector`) instead of
the projection-profile heuristic in `ocr.py`.
