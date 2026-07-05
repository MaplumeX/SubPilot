# Calendar view for upcoming billing

## Goal

Give users a read-only month-calendar view that visually answers "which subscriptions charge me on which days this month," reinforcing SubPilot's first-citizen renewal-reminder promise. The calendar complements the existing Dashboard "Due Soon" list by showing the *spatial* distribution of upcoming billing dates rather than only the next few days.

## Background

- SubPilot is a subscription tracker whose product purpose (PRODUCT.md) is eliminating "forgot to renew" anxiety; renewal reminders are the first visual focus.
- The Dashboard already surfaces `due_soon` (next N days, driven by `reminder_days`) and a 30-day "Next-month projection" derived in-app from `listSubscriptions()`.
- `Subscription.next_billing_date` is the authoritative per-subscription billing date from the backend (`frontend/src/api/types.ts`). No dedicated calendar endpoint exists; the frontend already has everything it needs via `listSubscriptions()`.
- Navigation lives in `frontend/src/components/AppLayout.tsx` (`NAV_ITEMS` array + nested `<Route>`s under `AppLayout`). A new page means a new entry there.
- i18n is i18next with `en.json` / `zh-CN.json` under `frontend/src/i18n/locales/`.

## Confirmed Facts (from codebase inspection)

- Data source: `listSubscriptions()` returns `Subscription[]` with `next_billing_date: string | null` (ISO date). Active subs with a null `next_billing_date` cannot be placed on the calendar and will be excluded from date cells.
- The project uses React 19 + Vite + TS, shadcn/ui backed by `@base-ui/react` (not Radix), Tailwind v4 with custom semantic tokens (`bg-pending`, `text-pending`, `ring-pending`, etc.) — see `badge.tsx` `pending` variant for the existing "due" visual language.
- `formatDueLabel(dateStr, t)` and `isDueWithin(date, reminderDays)` already exist in `frontend/src/lib/due.ts` and should be reused for consistency.
- Locale comes from `i18n.language`; `Intl.NumberFormat` / `Intl.DateTimeFormat` are already used elsewhere (DashboardPage). Calendar weekday/month labels should follow the same locale-aware pattern.
- `prefers-reduced-motion` is respected elsewhere (Dashboard count-up); the calendar is static so motion is largely a non-issue, but any hover/focus transition should remain subtle per PRODUCT.md "calm, reliable, clear" tone.
- WCAG AA is the project baseline (PRODUCT.md Accessibility): color is not the only encoding (combine a dot/marker with the date number), keyboard navigation must reach the calendar, text contrast ≥ 4.5:1.

## Requirements

### R1 — New read-only Calendar page
- Add a new page at route `/calendar`, linked from the primary nav (`AppLayout.NAV_ITEMS`), between **Subscriptions** and **Statistics** (it's a subscriptions-adjacent view).
- Page renders a month grid (7 columns × 5–6 rows) showing the current month by default.
- User can navigate to previous / next month and jump to "today" (read-only; no editing, no acknowledge action on this page — acknowledged/edited state stays on Dashboard/Subscriptions).

### R2 — Date cells show billing events
- Each active subscription whose `next_billing_date` falls on a visible day is rendered in that cell as a compact marker: subscription name + localized amount (`currency price`, e.g. `USD 9.99`).
- Multiple events on the same day stack vertically inside the cell; if they overflow the cell, a "+N more" affordance summarizes the hidden ones (no truncation of data — clicking / focusing the cell reveals the full list in a popover or expanded panel).
- Days with events use the existing `pending` semantic color (a dot or thin side-bar) plus the date number — color is *not* the sole encoding, per the Accessibility principle.
- Past days within the visible month (before today) are de-emphasized (muted text) but still show any events that fall on them — read-only browsing of history within the month.

### R3 — Interaction is read-only and minimal
- Clicking a date cell with events opens a popover (or inline expand) listing every subscription billing that day: name, amount, category badge if present, and a "Due" relative label via `formatDueLabel`.
- No actions (no edit, no acknowledge, no delete) on the calendar page — keep it calm and uncluttered. Cross-links to per-subscription management are out of scope for v1 (Subscriptions page currently has no per-item detail route).
- Keyboard: Tab reaches each navigable control (prev/next/today + each day-with-events); focus states follow the project ring convention.

### R4 — i18n & locale
- All visible strings go through i18next (`calendar.*` namespace added to `en.json` + `zh-CN.json`).
- Month name + weekday header labels use `Intl.DateTimeFormat(locale, { month: 'long' })` and `{ weekday: 'narrow' | 'short' }` so they localize automatically; first-day-of-week follows locale convention (Monday for zh-CN, Sunday for en — verified via `Intl.Locale` weekInfo when available, fallback to Sunday).
- Currency formatting reuses the same `Intl.NumberFormat(locale, { style: 'currency', currency })` pattern as Dashboard.

### R5 — Data flow (no backend changes)
- The page calls `listSubscriptions()` once on mount (and on month change if the user navigates across a month boundary that wasn't loaded yet — keep it simple: refetch only if the visible month's data isn't already cached; otherwise reuse).
- Filter: only `status === "active"` subscriptions with a non-null `next_billing_date` are placed on the grid.
- No new API endpoint, no backend changes — this task is frontend-only.

### R6 — Empty & loading states
- Loading: month grid skeleton (matching Dashboard's `bg-muted/40 animate-pulse` style).
- Empty month (no events in visible month): a calm, single-line "No billing this month" message inside the grid area — no alarm styling.
- No subscriptions at all: redirect-like hint linking back to Dashboard "Add subscription" (but as a message, not an auto-redirect).

## Out of Scope (v1)

- Year view / yearly grid.
- Editing, acknowledging, or creating subscriptions from the calendar.
- Drag-and-drop rescheduling.
- Filtering by category / payment method on the calendar page (the Subscriptions page already owns filtering).
- Backend changes or a dedicated `/calendar` endpoint.
- Notifications or push reminders (already owned by the Notifications system).
- Historical billing *transactions* (only `next_billing_date` is surfaced; past billing history is not modeled in the API today).

## Acceptance Criteria

- [ ] `/calendar` route exists and is reachable from the primary nav (between Subscriptions and Statistics).
- [ ] Month grid renders the current month on first load with weekday headers and correct first-day-of-week for the active locale.
- [ ] Each active subscription with `next_billing_date` in the visible month appears in the correct date cell with name + localized amount.
- [ ] Cells with more events than fit show a "+N more" control; activating it reveals the full list.
- [ ] Prev / next / today controls navigate across months; navigation reuses already-fetched subscription data when the month is already cached.
- [ ] Clicking / keyboard-activating a date cell with events opens a popover listing every event that day; the popover shows name, amount, category badge, and a relative due label via `formatDueLabel`.
- [ ] No editing / acknowledge / delete actions exist on the calendar page (read-only).
- [ ] Empty month and no-subscriptions states render a calm message with no alarm styling.
- [ ] All visible strings go through i18next; `en.json` and `zh-CN.json` both have a `calendar.*` namespace.
- [ ] Color is not the sole encoding for "has billing" (a dot/bar plus date number, not color alone); WCAG AA contrast holds for date numbers and event markers.
- [ ] `npm run lint` and `tsc -b` (frontend) pass clean.
- [ ] No backend code is modified.

## Decisions

- **D-1** Calendar nav item sits between **Subscriptions** and **Statistics** in `NAV_ITEMS` (order: Dashboard → Subscriptions → Calendar → Statistics → Settings). Rationale: Calendar is a secondary *view* over the same subscription data; the primary management surface (Subscriptions) stays ahead of it, matching PRODUCT.md's "calm, reliable, clear" tone. Confirmed by user 2026-07-05.