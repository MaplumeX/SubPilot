# Design — Rewrite logo search with backend proxy endpoint

## Architecture overview

```
Frontend (SubscriptionForm search tab)
  │
  │  1. GET /api/v1/subscriptions/search-logo?query=<q>
  ▼
Backend  search-logo endpoint (routers/subscriptions.py)
  │   ├── SSRF helper (app/services/ssrf.py) — host allowlist + IP filter + DNS pin
  │   ├── Provider: DuckDuckGo i.js (primary)
  │   └── Fallback: Brave image search HTML
  ▼
Returns { results: [{ thumbnail, image, width, height }] }
  │
  ▼
Frontend renders candidate grid
  │
  │  2. User clicks a candidate
  │     POST /api/v1/subscriptions/cache-logo { image_url }
  ▼
Backend  cache-logo endpoint
  │   ├── SSRF helper (IP filter + DNS pin, NO host allowlist for cache-logo)
  │   ├── httpx.get(remote) → validate content-type + size
  │   └── save to LOGOS_DIR as <uuid>.<ext> (reuse upload-logo conventions)
  ▼
Returns { logo_url: "/static/logos/<uuid>.<ext>" }
  │
  ▼
Frontend sets logoUrl = returned local URL → preview updates
```

No DB change. `logo_url` stays a `str | None` (≤500 chars). The only difference vs. the upload tab: the image bytes come from a server-side proxied download instead of a user-uploaded file.

## Module boundaries

### New file: `backend/app/services/ssrf.py`
Single responsibility: safe outbound HTTP GET with SSRF protection. Shared by `search-logo` and `cache-logo`.

```python
# Public API
ALLOWED_SEARCH_HOSTS = {"duckduckgo.com", "search.brave.com"}

def safe_get(
    url: str,
    *,
    allowlist: set[str] | None = None,
    timeout: float = 10.0,
    headers: dict[str, str] | None = None,
    follow_redirects: bool = True,
) -> httpx.Response:
    """
    Resolve host → validate IP (private/reserved/CGNAT rejected) → pin IP
    via a custom httpx transport resolver → GET.

    If `allowlist` is provided and the host is not in it, raise SsrfBlockedError.
    If the resolved IP is private/reserved/CGNAT, raise SsrfBlockedError.
    """
```

Implementation notes:
- Use `socket.gethostbyname(host)` for DNS resolution.
- IP rejection: `ipaddress.ip_address(ip).is_private or .is_reserved or .is_loopback or .is_link_local or .is_multicast or .is_unspecified` OR membership in `ipaddress.ip_network("100.64.0.0/10")` (CGNAT — `is_private` does NOT cover this range in Python's `ipaddress`).
- DNS pin: construct `httpx.Client(transport=httpx.HTTPTransport(resolver=lambda h, p: [(socket.AF_INET, (validated_ip, p))]))` so the TLS SNI uses the original hostname while the connection goes to the validated IP. This is the httpx equivalent of Wallos' `CURLOPT_RESOLVE`.
- `SsrfBlockedError(Exception)` — custom internal exception; routers translate it to `HTTPException(400)`.

### `backend/app/services/logo_search.py`
Image-search provider logic. Returns normalized candidates. No FastAPI/HTTP concerns — pure service, easy to unit-reason about.

```python
def search_logos(query: str) -> list[dict]:
    """query already has ' logo' appended by the router. Returns [{thumbnail, image, width, height}]."""
    candidates = _fetch_ddg(query)
    if not candidates:
        candidates = _fetch_brave(query)
    return candidates
```

DDG flow (research/image-search-providers.md §DuckDuckGo):
1. `safe_get("https://duckduckgo.com/?q=<q>&ia=images", allowlist=ALLOWED_SEARCH_HOSTS)` → extract `vqd` with a multi-pattern fallback chain.
2. `safe_get("https://duckduckgo.com/i.js?...", allowlist=ALLOWED_SEARCH_HOSTS, headers={Accept: application/json, Referer: ...})` → parse JSON `results` → map to `{thumbnail, image, width, height}`.

Brave flow (fallback):
1. `safe_get("https://search.brave.com/images?q=<q>", allowlist=ALLOWED_SEARCH_HOSTS, headers={...})` → parse HTML with `re`/`html.parser` → filter UI chrome → return `{thumbnail: url, image: url, width: null, height: null}`.

### `backend/app/routers/subscriptions.py` — two new routes
Declared BEFORE `/{subscription_id}` routes (spec: static sub-paths first).

```python
@router.get("/search-logo")
def search_logo(
    query: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
):
    # 400 on empty/whitespace is handled by Query(min_length=1) → 422 auto,
    # but spec prefers explicit 400 for domain constraints. Use a manual check:
    if not query.strip():
        raise HTTPException(400, detail="Query must not be empty")
    results = logo_search.search_logos(f"{query.strip()} logo")
    return {"results": results}  # always 200, even if []


@router.post("/cache-logo")
def cache_logo(
    payload: CacheLogoRequest,  # Pydantic { image_url: HttpUrl }
    current_user: User = Depends(get_current_user),
):
    try:
        resp = ssrf.safe_get(str(payload.image_url), allowlist=None, follow_redirects=True)
    except ssrf.SsrfBlockedError:
        raise HTTPException(400, detail="Image URL host is not allowed")
    # validate content-type + size, save to LOGOS_DIR, return {logo_url}
```

`CacheLogoRequest` lives in `schemas/subscription.py` alongside the other subscription schemas. Pydantic `HttpUrl` validates the URL scheme (http/https only) at the boundary.

### `frontend/src/api/subscriptions.ts` — two new functions
```ts
export async function searchLogo(query: string): Promise<{ results: LogoCandidate[] }> { ... }
export async function cacheLogo(imageUrl: string): Promise<{ logo_url: string }> { ... }
```

### `frontend/src/api/types.ts` — new type
```ts
export interface LogoCandidate {
  thumbnail: string;
  image: string;
  width: number | null;
  height: number | null;
}
```

### `frontend/src/components/SubscriptionForm.tsx` — search tab rewrite
State additions:
- `searchResults: LogoCandidate[]`
- `searching: boolean`
- `cachingIndex: number | null` (which thumbnail is being cached)
- `searchError: string`

Behavior:
- `handleSearchLogo` → calls `searchLogo(query)` → sets `searchResults` → renders grid.
- Grid: responsive 3–6 cols of `<button>` wrapping `<img src={candidate.thumbnail}>`.
- Click thumbnail → `cacheLogo(candidate.image)` → `setLogoUrl(returned.logo_url)` → preview updates.
- Loading state on the search button; empty state below grid; error toast/inline.

### `frontend/src/i18n/{zh-CN,en}.json` — new keys
```
subscriptionForm.logoSearchPlaceholder   "订阅名或域名 / Subscription name or domain"
subscriptionForm.searching               "搜索中... / Searching..."
subscriptionForm.noLogos                "未找到图标 / No logos found"
subscriptionForm.logoSearchFailed       "图标搜索失败 / Logo search failed"
subscriptionForm.cacheLogoFailed        "图标缓存失败 / Failed to cache logo"
```

### `frontend/src/components/SubscriptionForm.tsx` — `ERROR_KEY_MAP`
Add mapping for new backend `detail` strings:
- `"Image URL host is not allowed"` → `"subscriptionForm.cacheLogoFailed"`
- (search-logo returns 200 + empty results on failure, so no error key needed there)

## Data flow / contracts

### Request: `GET /api/v1/subscriptions/search-logo?query=spotify`
Response 200:
```json
{
  "results": [
    {"thumbnail": "https://tse1.mm.bing.net/...", "image": "https://.../logo.png", "width": 200, "height": 200}
  ]
}
```
Response 400 (empty query): `{"detail": "Query must not be empty"}`

### Request: `POST /api/v1/subscriptions/cache-logo`
Body: `{"image_url": "https://.../logo.png"}`
Response 200: `{"logo_url": "/static/logos/<uuid>.png"}`
Response 400 (non-image / oversize / SSRF): `{"detail": "..."}`

## Compatibility

- `logo_url` field: unchanged schema, no migration. Existing rows with remote URLs or `/static/logos/...` paths keep working.
- Upload tab + link tab: untouched.
- `DELETE /subscriptions/{id}` logo cleanup (`routers/subscriptions.py:421-428`): untouched — it already deletes any `logo_url` starting with `/static/logos/`, which is exactly what `cache-logo` produces.
- Frontend display (`SubscriptionCard`, `DashboardPage`): untouched — they render `logo_url` as `<img src>`, agnostic to source.

## Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| DDG+Brave scraping (no API key) | Zero ops cost, but fragile — provider HTML/vqd format changes break search. Mitigated by multi-pattern regex + Brave fallback + graceful `{results: []}` on total failure. |
| `cache-logo` downloads to local `/static/logos/` | Durable display, no hotlinking, but doubles disk usage vs. storing remote URL. Acceptable: logos are small (<2MB each, typically <50KB). |
| SSRF host allowlist for search, IP-only filter for cache-logo | Search has a small fixed target set (DDG/Brave) → strict allowlist. Cache-logo must accept arbitrary CDN hosts → IP filter is the real defense, host allowlist would break functionality. |
| `httpx` sync (not async) | Matches existing `exchange_rate.py` / `channels.py` pattern. Blocks the worker thread during upstream fetch, but logo search is low-frequency and the existing codebase is sync-only. |
| No background job / caching of search results | Search results are small and ephemeral; caching adds complexity for no real win. |

## Rollback shape

- Revert the commit; no DB migration to undo.
- `logo_url` values already stored as `/static/logos/<uuid>.<ext>` remain valid and keep displaying.
- `logo_url` values stored as remote URLs (from the old favicon hack) also keep displaying — no data loss.

## Operational notes

- SSRF helper must be imported only by `routers/subscriptions.py` (and future routers); keep it out of models/schemas.
- Provider scraping runs synchronously; the existing `httpx.get(..., timeout=10)` pattern applies. Set a 10s timeout per upstream call.
- If both providers fail, return `{"results": []}` with 200 — never 500. The frontend shows the empty state.
- Logging: `logger.warning("logo search upstream failed: %s", exc)` on provider failure, consistent with `exchange_rate.py`'s pattern. Do NOT log user query content at INFO (PII-ish); debug-level only.