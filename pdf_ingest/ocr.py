"""Vision-LLM OCR for scanned PDF pages.

VietOCR (a single-text-line recognizer) mangled these multi-column scanned price tables — it
hallucinated on the binding rings / grid lines and can't reconstruct table structure. A vision-LLM
(gpt-4.1-mini) reads the whole clean page holistically and emits a proper markdown table, which is
exactly what the downstream chunker wants.

Only scanned PDFs reach here; native-text PDFs go through pymupdf4llm (no LLM cost). The OpenAI
client is imported lazily so the pure helpers stay importable offline (test needs no API/network).
"""
from __future__ import annotations

import base64
import os

_MODEL_DEFAULT = os.environ.get("LLM_MODEL", "gpt-4.1-mini")

_SYSTEM_PROMPT = (
    "Bạn là công cụ OCR cho tài liệu bệnh viện tiếng Việt. Chép lại TOÀN BỘ chữ trong ảnh trang "
    "tài liệu một cách trung thực, không bịa, không bỏ sót. Giữ nguyên cấu trúc bảng dưới dạng "
    "bảng Markdown (GitHub-flavored). Giữ chính xác các con số, giá tiền, mã dịch vụ và dấu tiếng "
    "Việt. Ô trống thì để trống. CHỈ trả về nội dung đã chép, không thêm lời giải thích, không bọc "
    "trong ``` code fence."
)

_USER_INSTRUCTION = "Chép lại toàn bộ nội dung trang này thành Markdown, giữ nguyên bảng."


# --- pure helper (no I/O, unit-tested) --------------------------------------
def build_vision_messages(png_b64: str) -> list:
    """Build the chat/completions `messages` for one page image (data-URI, high detail)."""
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": _USER_INSTRUCTION},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{png_b64}",
                        "detail": "high",  # dense small-text tables need the extra tiles
                    },
                },
            ],
        },
    ]


# --- OpenAI call (lazy client) ----------------------------------------------
_client = None


def get_client():
    """Lazily construct and cache an OpenAI client from OPENAI_API_KEY."""
    global _client
    if _client is None:
        from openai import OpenAI

        if not os.environ.get("OPENAI_API_KEY"):
            raise SystemExit("OPENAI_API_KEY is not set (needed for scanned-PDF OCR).")
        _client = OpenAI()
    return _client


def ocr_page_png(png_bytes: bytes, client=None, model: str = _MODEL_DEFAULT) -> str:
    """OCR one page image (PNG bytes) via the vision-LLM. Returns the page's markdown."""
    client = client or get_client()
    png_b64 = base64.b64encode(png_bytes).decode("ascii")
    resp = client.chat.completions.create(
        model=model,
        messages=build_vision_messages(png_b64),
        temperature=0,
    )
    return (resp.choices[0].message.content or "").strip()
