# Implementation Plan — Rewrite logo search with backend proxy endpoint

## Ordered checklist

### Backend

1. **Create `backend/app/services/ssrf.py`**
   - `SsrfBlockedError(Exception)`
   - `ALLOWED_SEARCH_HOSTS = {"duckduckgo.com", "search.brave.com"}`
   - `safe_get(url, *, allowlist=None, timeout=10.0, headers=None, follow_redirects=True) -> httpx.Response`
   - DNS resolve → IP filter (private/reserved/loopback/link-local/multicast/unspecified + CGNAT `100.64.0.0/10`) → httpx transport with pinned IP via custom resolver.
   - Unit-reason: verify `safe_get("http://127.0.0.1/x")` raises `SsrfBlockedError`; `safe_get("https://duckduckgo.com/", allowlist=ALLOWED_SEARCH_HOSTS)` does not raise before network.

2. **Create `backend/app/services/logo_search.py`**
   - `search_logos(query: str) -> list[dict]` — query already has `" logo"` appended by caller OR append here (decide: append in router, keep service generic — see step 4).
   - `_fetch_ddg(query)` — get vqd (multi-pattern regex chain) → GET `i.js` → map results.
   - `_fetch_brave(query)` — GET images page → parse `<img>` → filter UI chrome.
   - On any upstream exception, return `[]` (do not raise); log at WARNING.
   - Both use `ssrf.safe_get(..., allowlist=ALLOWED_SEARCH_HOSTS)`.

3. **Add `CacheLogoRequest` to `backend/app/schemas/subscription.py`**
   ```python
   class CacheLogoRequest(BaseModel):
       image_url: HttpUrl
   ```

4. **Add routes to `backend/app/routers/subscriptions.py`**
   - Insert `GET /search-logo` and `POST /cache-logo` BEFORE the `/{subscription_id}` routes (between `/upload-logo` at line 290 and `/{subscription_id}/acknowledge` at 325 — actually the static sub-paths cluster must all come before any `/{subscription_id}` route, so place them right after `/upload-logo`).
   - `search_logo`: manual empty-query check → 400 (spec prefers explicit 400 over 422 for domain validation). Call `logo_search.search_logos(f"{query.strip()} logo")`. Always return `{"results": [...]}` with 200.
   - `cache_logo`: Pydantic validates `image_url` (HttpUrl). `try: resp = ssrf.safe_get(str(payload.image_url), allowlist=None, follow_redirects=True) except SsrfBlockedError: raise HTTPException(400, detail="Image URL host is not allowed")`. Validate `resp.headers["content-type"]` in `ALLOWED_CONTENT_TYPES` and `len(resp.content) <= MAX_FILE_SIZE`. Save to `LOGOS_DIR` as `f"{uuid.uuid4()}.{ext}"` using the same `ext_map` as `upload_logo`. Return `{"logo_url": f"/static/logos/{filename}"}`.
   - Reuse existing `ALLOWED_CONTENT_TYPES`, `MAX_FILE_SIZE`, `LOGOS_DIR`, `ext_map` — extract `ext_map` to a module constant if it's currently inline in `upload_logo` (it is — `routers/subscriptions.py:316-321`).

5. **Manual backend verification (curl)**
   - `curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/v1/subscriptions/search-logo?query=spotify"` → 200 with `results` array.
   - `curl ... "/search-logo?query="` → 400 `{"detail": "Query must not be empty"}`.
   - `curl ... "/search-logo?query=zzzznotarealquery"` → 200 `{results: []}` (or 200 with results).
   - Pick a result `image` URL → `curl -X POST .../cache-logo -H "Content-Type: application/json" -d '{"image_url":"<url>"}'` → 200 `{"logo_url": "/static/logos/<uuid>.png"}`; verify file exists in `backend/static/logos/`.
   - `curl -X POST .../cache-logo -d '{"image_url":"http://127.0.0.1/x"}'` → 400 `{"detail": "Image URL host is not allowed"}`.

### Frontend

6. **Add types to `frontend/src/api/types.ts`**
   ```ts
   export interface LogoCandidate {
     thumbnail: string;
     image: string;
     width: number | null;
     height: number | null;
   }
   ```

7. **Add API functions to `frontend/src/api/subscriptions.ts`**
   - `searchLogo(query: string)` → `api.get<{ results: LogoCandidate[] }>("/subscriptions/search-logo", { params: { query } })` → return `data`.
   - `cacheLogo(imageUrl: string)` → `api.post<{ logo_url: string }>("/subscriptions/cache-logo", { image_url: imageUrl })` → return `data`.

8. **Rewrite search tab in `frontend/src/components/SubscriptionForm.tsx`**
   - Replace `handleSearchLogo` (lines 126-130) with async version that calls `searchLogo` and sets `searchResults`/`searching`/`searchError`.
   - Replace the search-tab `TabsContent` (lines 279-289) with: input + button + grid below.
   - Grid: `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2`, each cell a `<button type="button" onClick={() => handlePick(candidate, i)} disabled={cachingIndex !== null}>` wrapping `<img src={candidate.thumbnail} loading="lazy" className="aspect-square w-full object-contain" />`.
   - `handlePick(candidate, i)`: set `cachingIndex=i`; call `cacheLogo(candidate.image)`; on success `setLogoUrl(data.logo_url)`; on error toast + `ERROR_KEY_MAP` lookup; finally `setCachingIndex(null)`.
   - Loading: disable search button + spinner text while `searching`. Empty: show `t("subscriptionForm.noLogos")` when `searchResults.length === 0 && !searching && hasSearched`. Error: inline `searchError` text.
   - New state: `searchResults`, `searching`, `cachingIndex`, `searchError`, `hasSearched`.
   - Keep `handleRemoveLogo` clearing `searchResults` too.

9. **Add `ERROR_KEY_MAP` entries**
   - Find `ERROR_KEY_MAP` in `SubscriptionForm.tsx` (or wherever it lives — grep first).
   - Add `"Image URL host is not allowed": "subscriptionForm.cacheLogoFailed"`.

10. **Add i18n keys to both `frontend/src/i18n/zh-CN.json` and `en.json`**
    - `subscriptionForm.logoSearchPlaceholder`
    - `subscriptionForm.searching`
    - `subscriptionForm.noLogos`
    - `subscriptionForm.logoSearchFailed`
    - `subscriptionForm.cacheLogoFailed`
    - Verify the old `subscriptionForm.domainPlaceholder` is either repurposed or removed (check usage before removing).

### Validation

11. **Backend lint/type-check**
    ```bash
    cd backend && python -m py_compile app/services/ssrf.py app/services/logo_search.py app/routers/subscriptions.py app/schemas/subscription.py
    # If a linter is configured (ruff/flake8), run it; else py_compile is the gate.
    ```

12. **Frontend lint/type-check/build**
    ```bash
    cd frontend && npx tsc --noEmit && npm run lint && npm run build
    ```

13. **Full integration manual test** (acceptance criteria sweep)
    - Run backend + frontend dev servers.
    - Open subscription form → search tab → type "spotify" → see grid → click a candidate → preview updates to local `/static/logos/...` URL.
    - Delete that subscription → verify the cached logo file is removed from `backend/static/logos/`.

## Risky files / rollback points

| File | Risk | Rollback |
|------|------|----------|
| `backend/app/routers/subscriptions.py` | Route order — new routes must stay before `/{subscription_id}` | Revert commit; route order in current file is correct baseline |
| `backend/app/services/ssrf.py` (new) | DNS pin via httpx transport resolver — verify httpx API supports `resolver=` kwarg (httpx ≥0.24) | If `resolver=` unsupported, fall back to URL host rewrite + manual `Host` header (note TLS SNI caveat in design) |
| `frontend/src/components/SubscriptionForm.tsx` | Large file, many existing state vars — keep edits scoped to search tab | Revert commit |

## Validation commands summary

```bash
# Backend
cd backend && python -m py_compile app/services/ssrf.py app/services/logo_search.py app/routers/subscriptions.py app/schemas/subscription.py

# Frontend
cd frontend && npx tsc --noEmit && npm run lint && npm run build

# Manual curl (backend running on :8000)
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/v1/subscriptions/search-logo?query=spotify" | python3 -m json.tool
```

## Pre-start review gate

Before `task.py start`, confirm:
- [ ] `prd.md` converged (no TBD, no resolved open questions left)
- [ ] `design.md` covers architecture, contracts, compatibility, tradeoffs
- [ ] `implement.md` has ordered steps + validation commands
- [ ] `implement.jsonl` and `check.jsonl` each have ≥1 real curated entry (next step)