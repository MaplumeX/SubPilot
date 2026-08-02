# Persist subscription sort state

## Goal

Persist the subscription list's sort state (`sortBy` + `sortOrder`) so that a user's chosen column and direction survive page refresh and re-entry, instead of resetting to the default (no sort / ascending).

## Background

`SubscriptionsPage` currently initializes `sortBy=""` and `sortOrder="asc"` via `useState`, losing the user's selection on every mount. The same file already persists `viewMode` via `sessionStorage` (`getInitialViewMode` + `handleViewModeChange`). Sorting is a longer-lived user preference than view mode, so it should use `localStorage` to survive across sessions.

## Requirements

- On mount, initialize `sortBy` and `sortOrder` from persisted storage when present.
- On every sort change (`handleSort`), persist the new `sortBy` / `sortOrder`.
- Storage mechanism: `localStorage` (cross-session persistence).
- Single storage key holding both fields together (e.g. JSON `{ field, order }`) — they are tightly coupled.
- Default when no stored value or invalid stored value: `sortBy=""`, `sortOrder="asc"` (current behavior).
- Validate the stored `field` against the set of sortable columns; fall back to default if unknown, so future column changes don't leave stale state.
- Tolerate `localStorage` being unavailable (private mode etc.) with try/catch, matching the `viewMode` pattern.
- No backend changes — the API already accepts `sort_by` / `sort_order` params.

## Acceptance Criteria

- [ ] Refreshing the page keeps the previously selected sort column and order.
- [ ] Navigating away and back to the subscriptions page keeps the sort state.
- [ ] First visit (no stored value) defaults to no sort / ascending — unchanged from today.
- [ ] An invalid/stale stored field (e.g. a column later removed) falls back to default without errors.
- [ ] `localStorage` disabled (private mode) does not throw or break sorting.
- [ ] No backend changes.

## Notes

- Implementation lives entirely in `frontend/src/pages/SubscriptionsPage.tsx`.
- Follow the existing `getInitialViewMode` / `handleViewModeChange` pattern for structure and error handling.
- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight task: PRD-only.
