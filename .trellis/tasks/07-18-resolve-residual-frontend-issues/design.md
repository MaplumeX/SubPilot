# Design: Resolve Residual Frontend Audit Issues

## Architecture Overview

This task spans backend (1 new endpoint) + frontend (multiple pages + new command palette) + design system docs. All changes are additive or modifications to existing code; no page redesigns.

## Issue 1: Acknowledge Undo

### Backend
Add `POST /subscriptions/{id}/unacknowledge` endpoint in `backend/app/routers/subscriptions.py`:
- Sets `acknowledged_billing_date = None`
- Returns updated `SubscriptionResponse` (same shape as acknowledge)
- Same ownership check as acknowledge

### Frontend API
Add `unacknowledgeSubscription(id)` in `frontend/src/api/subscriptions.ts`:
- `api.post<Subscription>(`/subscriptions/${id}/unacknowledge`)`

### Frontend UX
- Dashboard: `handleAcknowledge` keeps existing optimistic update (remove from due_soon). Toast changes to include an "Undo" action button. Clicking undo calls `unacknowledgeSubscription` and restores the item to due_soon.
- Subscriptions: same pattern — optimistic state update + undo toast.
- Toaster needs to support an action button. Extend `toast-store.ts` Toast type with optional `action: { label, onClick }`.
- Toaster component renders action button next to message.
- Undo window: 4 seconds (matches current toast auto-dismiss). No separate timer needed — the toast auto-dismisses and the undo is gone with it.

### Data Flow
```
User clicks Acknowledge
  → optimistic: remove from due_soon list
  → call acknowledgeSubscription API
  → toast success with "Undo" action
    → user clicks Undo within 4s
      → call unacknowledgeSubscription API
      → restore item to due_soon list
      → toast "Undone"
    → user doesn't click → toast auto-dismisses → done
```

## Issue 2: icon-xs/icon-sm Hit Area

- Add `after:absolute after:-inset-2` (or `-inset-x-2 after:-inset-y-2`) to icon-xs and icon-sm button variants in `button.tsx`.
- Visual size unchanged (size-6 / size-7).
- Hit area: 24px + 2×8px = 40px (icon-xs), 28px + 2×8px = 44px (icon-sm). Meets AAA 44px for icon-sm, AA for icon-xs (40px > 24px minimum).
- No CSS class changes needed — Tailwind `after:` utility works with the existing `after:` pseudo-element pattern already used by the Switch component.

## Issue 3: Payment Method Required Indicator

- In `SubscriptionForm.tsx`, add a visual required indicator (asterisk or "required" text) to the payment method label when payment methods exist.
- When no payment methods exist, the existing hint text gets a `<Link to="/settings">` inline link.
- No validation logic change — still validated on submit, but the user sees the requirement upfront.

## Issue 4: Keyboard Shortcuts / Command Palette

### Scope
A lightweight keyboard shortcut layer, NOT a full command palette UI. Gmail-style prefix navigation + single-key actions.

### Shortcuts
- `N` — open new subscription form (calls `onAddSubscription` in AppLayout)
- `g` then `d/s/c/t/e` — navigate to Dashboard/Subscriptions/Calendar/Statistics/S**e**ttings
- `?` — show shortcuts help dialog

### Implementation
- New `useKeyboardShortcuts` hook in `frontend/src/lib/use-keyboard-shortcuts.ts`.
- Listens for keydown on `document`.
- Ignores when focus is in an input/textarea/select/contenteditable (check `e.target.tagName`).
- `g` is a prefix: on first `g` press, set a 1-second window waiting for next key.
- `?` opens a Dialog listing all shortcuts (reuse existing Dialog component).
- All shortcuts respect `prefers-reduced-motion` (no animation needed, dialog uses existing fade).

### Registration
- `useKeyboardShortcuts` called once in `AppLayout.tsx`.
- Passes `navigate` (react-router) and `onAddSubscription` callback.

## Issue 5: Error Toast Copy

### Approach
Add a helper `toastError(err, t)` in `lib/utils.ts` that inspects the axios error and calls `toast()` with a specific message:
- Network error (no response) → "网络连接失败，请检查网络后重试"
- 403 → "没有权限执行此操作"
- 404 → "未找到请求的资源"
- 500 → "服务器错误，请稍后重试"
- Other → fallback to existing `errors.loadFailed`

### i18n
Add new keys to `errors` section in both en.json and zh-CN.json:
- `networkError`, `forbidden`, `notFound`, `serverError`

### Refactor
Replace `toast({ title: t("errors.loadFailed") })` calls (16 occurrences) with `toastError(err, t)`.

## Issue 6: DESIGN.md Updates

### Typography
Add to Hierarchy section:
- **Caption** (500, 0.75rem / 12px, 1.4): Small labels, mobile event markers (base size). Desktop can step down to Micro.
- **Micro** (500, 0.625rem / 10px, 1.4): Compact data labels, calendar event markers (desktop), button sm variant.

### Colors
Add ambient shadow tokens to a new "Ambient Shadow" subsection:
- `shadow-ambient-low`: `rgba(0,0,0,0.04)` (light) / `rgba(0,0,0,0.3)` (dark)
- `shadow-ambient-md`: `rgba(0,0,0,0.08)` (light) / `rgba(0,0,0,0.4)` (dark)

## Compatibility

- All backend changes are additive (new endpoint).
- All frontend changes are additive or in-place refactors.
- No breaking changes to existing API contracts.
- No database migration needed (acknowledged_billing_date already nullable).

## Rollback

- Backend: remove the unacknowledge route.
- Frontend: revert `useKeyboardShortcuts` hook, revert toast action extension, revert error helper.
- DESIGN.md: revert typography and color additions.