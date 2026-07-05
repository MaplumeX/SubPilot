# Rewrite logo search with backend proxy endpoint

## Goal

Replace the current single-favicon URL hack in `SubscriptionForm.tsx` with a real logo search: the user types a query (subscription name or domain), the backend proxies an image search and returns multiple candidate logos, the frontend shows a grid and the user picks one. The selected logo is stored in the existing `logo_url` field (string), compatible with current storage/display path.

## Background

Current implementation (`frontend/src/components/SubscriptionForm.tsx:126-130`):

```js
const handleSearchLogo = () => {
  if (!searchDomain.trim()) return;
  const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(searchDomain.trim())}&sz=64`;
  setLogoUrl(url);
};
```

- Only returns a single 64px favicon, no choice.
- Direct browser request to `google.com/s2/favicons` — breaks in regions where Google is blocked; no fallback.
- No keyword search; requires the user to already know the domain.

Backend context:
- FastAPI + sync `httpx` already used (`backend/app/services/exchange_rate.py`, `notifications/channels.py`).
- Auth: `Depends(get_current_user)` (JWT).
- Errors: `HTTPException` with `detail`; 400 for validation, 404 ownership, 422 auto.
- `logo_url: str | None` on `Subscription` (`backend/app/models/subscription.py:64`), 500 chars.
- Existing `/subscriptions/upload-logo` returns `{"logo_url": "/static/logos/<uuid>.<ext>"}`.
- No SSRF helper exists yet.

## Requirements

### R1 — Backend search endpoint
- New `GET /api/v1/subscriptions/search-logo?query=<q>` (auth-protected) that returns JSON `{ results: [{ thumbnail, image, width, height }] }`.
- Query is server-side appended with `" logo"` to bias toward logo images.
- Proxy an image search provider, with at least one fallback provider.
- SSRF protection: outbound requests restricted to a host allowlist; DNS result IP filtered against private/reserved/CGNAT ranges; `CURLOPT_RESOLVE`-equivalent pinning (httpx supports transport with pinned IP).
- Errors: empty `results` (not 500) on upstream failure; 400 on empty query; standard `HTTPException` shapes.

### R2 — Frontend candidate grid
- `SubscriptionForm.tsx` search tab: input + search button → calls new endpoint → renders a responsive grid of thumbnail candidates.
- User clicks a thumbnail to select it → frontend calls `POST /api/v1/subscriptions/cache-logo` with the chosen `image` URL → backend downloads it into `/static/logos/` (reusing the existing upload dir + SSRF guard) → returns `{"logo_url": "/static/logos/<uuid>.<ext>"}` → frontend sets `logoUrl` to that local URL.
- Loading / empty / error states with i18n keys (zh-CN + en).
- Replaces the current single-favicon behavior.

### R3 — Backend cache-logo endpoint
- New `POST /api/v1/subscriptions/cache-logo` (auth-protected) accepting `{ image_url: str }`.
- Downloads the remote image server-side with the same SSRF guard as the search endpoint; stores under `LOGOS_DIR` with a `uuid.<ext>` filename (reuses `upload-logo` conventions + `ALLOWED_CONTENT_TYPES` + `MAX_FILE_SIZE`).
- Returns `{"logo_url": "/static/logos/<uuid>.<ext>"}` on success; 400 on non-image / oversize / disallowed host / SSRF failure.
- Reuses the existing `/static/logos/` cleanup path in `DELETE /subscriptions/{id}`.

### R4 — Compatibility
- `logo_url` field semantics unchanged (string, ≤500 chars).
- Upload and link tabs untouched.
- No DB migration.

## Acceptance Criteria

- [ ] `GET /api/v1/subscriptions/search-logo?query=spotify` returns ≥1 candidate for a common query (manual test).
- [ ] Empty/blank query → 400 `{"detail": "..."}`.
- [ ] Upstream provider fully fails → 200 with `{ results: [] }` (or agreed error shape), not 500.
- [ ] SSRF: request to a host not in the allowlist is rejected before any network call; private/CGNAT IPs are rejected.
- [ ] `POST /subscriptions/cache-logo` with a valid remote image URL returns 200 `{"logo_url": "/static/logos/<uuid>.<ext>"}`; the file exists in `LOGOS_DIR`.
- [ ] `POST /subscriptions/cache-logo` with a non-image / oversize / non-allowlisted host → 400.
- [ ] Frontend renders a grid; clicking a candidate triggers cache-logo, then sets `logoUrl` to the returned local URL; preview reflects selection.
- [ ] Deleting a subscription whose `logo_url` points to `/static/logos/...` still removes the local file.
- [ ] i18n keys added to `frontend/src/i18n/zh-CN.json` and `en.json`.
- [ ] Lint + type-check pass on both backend and frontend.

## Out of Scope

- Changing `logo_url` schema, DB migration, or upload/link tabs.
- Building a custom icon library / CDN.
- AI-powered logo recognition.

## Open Questions

None — all three core decisions (local cache, DDG+Brave scraping, cache-logo SSRF scope) resolved during brainstorm. Remaining UX details (grid size, i18n key names) are design-level and do not block planning.