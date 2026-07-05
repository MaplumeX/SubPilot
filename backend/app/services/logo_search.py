"""Image-search provider logic for the logo search feature.

Returns normalized candidate dicts: ``{thumbnail, image, width, height}``.
Primary provider: DuckDuckGo ``i.js``. Fallback: Brave image search HTML.
On any upstream failure, returns ``[]`` (never raises) and logs at WARNING.
"""

from __future__ import annotations

import logging
import re

from html.parser import HTMLParser

from app.services import ssrf

_logger = logging.getLogger(__name__)

# DDG soft-blocks clients without a browser User-Agent.
_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_DDGS_SEARCH_URL = "https://duckduckgo.com/?q={q}&ia=images"
_DDGS_IMAGE_URL = (
    "https://duckduckgo.com/i.js?l=us-en&o=json&q={q}&vqd={vqd}"
    "&f=,,transparent,Wide,&p=1"
)
_BRAVE_URL = "https://search.brave.com/images?q={q}"

# vqd extraction fallback chain (DDG changes HTML format occasionally).
_VQD_PATTERNS = (
    re.compile(r"vqd=([0-9-]+)\&", re.IGNORECASE),
    re.compile(r'["\']vqd["\']\s*[:=]\s*["\']([^"\']+)["\']', re.IGNORECASE),
    re.compile(r"vqd:\s*[\"']([^\"']+)[\"']", re.IGNORECASE),
    re.compile(r'vqd="?([\d-]+)"?', re.IGNORECASE),
)


def search_logos(query: str) -> list[dict]:
    """Return logo candidates for ``query``.

    ``query`` is expected to already have ``" logo"`` appended by the router
    to bias toward logo images. Returns ``[]`` on total upstream failure.
    """
    candidates = _fetch_ddg(query)
    if not candidates:
        candidates = _fetch_brave(query)
    return candidates


def _fetch_ddg(query: str) -> list[dict]:
    try:
        resp = ssrf.safe_get(
            _DDGS_SEARCH_URL.format(q=query),
            allowlist=ssrf.ALLOWED_SEARCH_HOSTS,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": _UA,
            },
        )
        resp.raise_for_status()
        vqd = _extract_vqd(resp.text)
        if not vqd:
            # Query omitted: user query is PII-ish, keep it debug-only.
            _logger.warning("logo search: could not extract DDG vqd token")
            return []
        resp2 = ssrf.safe_get(
            _DDGS_IMAGE_URL.format(q=query, vqd=vqd),
            allowlist=ssrf.ALLOWED_SEARCH_HOSTS,
            headers={
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Referer": "https://duckduckgo.com/",
                "User-Agent": _UA,
                "X-Requested-With": "XMLHttpRequest",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
            },
        )
        if resp2.status_code != 200:
            _logger.warning("logo search: DDG i.js returned %s", resp2.status_code)
            return []
        data = resp2.json()
        results = data.get("results", []) if isinstance(data, dict) else []
        out: list[dict] = []
        for item in results:
            thumb = item.get("thumbnail") or item.get("thumbnail_url")
            image = item.get("image") or item.get("image_url")
            if not thumb or not image:
                continue
            out.append({
                "thumbnail": thumb,
                "image": image,
                "width": item.get("width"),
                "height": item.get("height"),
            })
        return out
    except Exception as exc:  # noqa: BLE001 — best-effort, never raise
        _logger.warning("logo search: DDG upstream failed: %s", type(exc).__name__)
        return []


def _extract_vqd(html: str) -> str | None:
    for pattern in _VQD_PATTERNS:
        m = pattern.search(html)
        if m:
            return m.group(1)
    return None


class _BraveImgParser(HTMLParser):
    """Collect ``<img>`` ``src``/``data-src`` URLs from the Brave images page."""

    def __init__(self) -> None:
        super().__init__()
        self.srcs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "img":
            return
        for name, value in attrs:
            if name.lower() in ("src", "data-src", "data-srcset") and value:
                # data-srcset can be "url 1x, url 2x" — take the first URL.
                url = value.split(",")[0].split(" ")[0]
                if url:
                    self.srcs.append(url)


def _fetch_brave(query: str) -> list[dict]:
    try:
        resp = ssrf.safe_get(
            _BRAVE_URL.format(q=query),
            allowlist=ssrf.ALLOWED_SEARCH_HOSTS,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Referer": "https://search.brave.com/",
            },
        )
        resp.raise_for_status()
        parser = _BraveImgParser()
        parser.feed(resp.text)
        out: list[dict] = []
        seen: set[str] = set()
        for src in parser.srcs:
            if not src.startswith("http"):
                continue
            # Filter Brave UI chrome.
            if "cdn.search.brave.com" in src:
                continue
            if "/favicon" in src:
                continue
            if src in seen:
                continue
            seen.add(src)
            out.append({
                "thumbnail": src,
                "image": src,
                "width": None,
                "height": None,
            })
        return out
    except Exception as exc:  # noqa: BLE001 — best-effort, never raise
        _logger.warning("logo search: Brave upstream failed: %s", type(exc).__name__)
        return []