"""VietOCR-based OCR for scanned PDF pages.

VietOCR is a text-line *recognition* model only — it does not locate text on a page. We pair it
with a classical horizontal-projection-profile line segmentation (numpy, thresholded via cv2's
Otsu method to adapt to each scan's lighting/contrast), which is enough for scanned documents
(clean horizontal text bands) without adding a second deep-learning detector on top of VietOCR's
own torch dependency.

Heavy imports (cv2, vietocr/torch) are deferred into the functions that use them so segment_lines()
stays importable and unit-testable without those installed.
"""
from __future__ import annotations

from typing import List, Tuple

import numpy as np


# --- pure helper (no I/O, unit-tested in test_parse_pdfs.py) ----------------
def segment_lines(
    gray: np.ndarray,
    dark_threshold: int = 128,
    min_dark_ratio: float = 0.02,
    min_gap: int = 3,
    min_line_height: int = 5,
) -> List[Tuple[int, int]]:
    """Find horizontal text-line bands in a grayscale page image via row-wise dark-pixel density.

    Returns a list of (y_start, y_end) row ranges (end-exclusive), top to bottom.
    """
    height, width = gray.shape
    dark_counts = (gray < dark_threshold).sum(axis=1)
    has_text = dark_counts > (min_dark_ratio * width)

    bands: List[Tuple[int, int]] = []
    start = None
    gap = 0
    for y, row_has_text in enumerate(has_text):
        if row_has_text:
            if start is None:
                start = y
            gap = 0
        elif start is not None:
            gap += 1
            if gap > min_gap:
                end = y - gap + 1
                if end - start >= min_line_height:
                    bands.append((start, end))
                start = None
                gap = 0
    if start is not None:
        end = height - gap if gap else height
        if end - start >= min_line_height:
            bands.append((start, end))
    return bands


def otsu_threshold(gray: np.ndarray) -> int:
    """Adaptive dark/light split point for a page image (varies with scan lighting/contrast).

    Uses cv2's Otsu implementation; imported lazily so segment_lines() itself stays cv2-free.
    """
    import cv2

    threshold, _ = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return int(threshold)


# --- OCR (heavy deps, lazy imports) -----------------------------------------
_predictor = None


def get_predictor():
    """Lazily construct and cache the VietOCR Predictor (loads pretrained weights on first call)."""
    global _predictor
    if _predictor is None:
        from vietocr.tool.config import Cfg
        from vietocr.tool.predictor import Predictor

        config = Cfg.load_config_from_name("vgg_seq2seq")
        config["device"] = "cpu"
        _predictor = Predictor(config)
    return _predictor


def ocr_page_image(image, predictor=None) -> str:
    """OCR one full page image (PIL.Image) by segmenting it into text lines and recognizing each.

    Returns the page's recognized text, one line per row, top to bottom.
    """
    predictor = predictor or get_predictor()
    gray = np.array(image.convert("L"))
    bands = segment_lines(gray, dark_threshold=otsu_threshold(gray))

    lines: List[str] = []
    for y_start, y_end in bands:
        crop = image.crop((0, y_start, image.width, y_end))
        text = predictor.predict(crop).strip()
        if text:
            lines.append(text)
    return "\n".join(lines)
