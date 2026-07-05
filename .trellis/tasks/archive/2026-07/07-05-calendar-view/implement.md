# Implement — Calendar view

Frontend-only. All changes under `frontend/`. Validation: `npm run lint` + `tsc -b` from `frontend/`.

## Ordered checklist

### 1. i18n keys
- [ ] Add `calendar.*` namespace to `frontend/src/i18n/en.json` (keys listed in design.md §i18n keys).
- [ ] Add the same keys to `frontend/src/i18n/zh-CN.json` with zh translations.
- [ ] Add `layout.calendar` ("Calendar" / "日历") to both files' `layout` block.

### 2. Calendar page
- [ ] Create `frontend/src/pages/CalendarPage.tsx` with:
  - `CalendarPage` default export, single file (inline `MonthHeader`, `WeekdayRow`, `MonthGrid`, `DayCell`, `DayPopover` helpers — define outside the page component to avoid ESLint "defining components during render").
  - State: `cursor: Date` (first of month, default today), `subsCache: Map<string, Subscription[]>`, `loading: boolean`, `openDay: Date | null`.
  - Fetch effect: on `cursor` change, if cache miss, call `listSubscriptions()` and store under `${YYYY-MM}`. Stale-effect guard with `active` flag (per `hook-guidelines.md`).
  - Filter `subs` to `status === "active" && next_billing_date != null`, group by ISO date into `eventsByDay: Map<string, Subscription[]>`.
  - `getFirstDayOfWeek(locale)` helper (Intl.Locale.weekInfo with Sunday fallback).
  - Render: header (prev/today/next + month label), weekday row, 7-col grid of day cells, popover when `openDay` set.
  - Currency/amount: render as `${sub.currency} ${sub.price.toFixed(2)}` (matches Dashboard due-soon row style).
  - Relative due label: `formatDueLabel(sub.next_billing_date, t)` from `@/lib/due`.
  - Empty month: calm "No billing this month" line inside the grid area.
  - No subscriptions at all: "You have no subscriptions yet." + link to Dashboard (`/`) "Add your first subscription" (message, not auto-redirect).
  - Loading skeleton: `bg-muted/40 animate-pulse` blocks matching Dashboard skeleton style.
- [ ] Constants at top of file: `MAX_VISIBLE_EVENTS = 2`, `WEEK_DAYS = 7`.

### 3. Route + nav
- [ ] `frontend/src/components/AppLayout.tsx`:
  - Add `CalendarPage` import.
  - Add `<Route path="/calendar" element={<CalendarPage />} />` inside `AppLayout`'s `<Routes>`, between `/subscriptions` and `/statistics`.
  - Add nav item to `NAV_ITEMS` between `subscriptions` and `statistics`: `{ to: "/calendar", labelKey: "layout.calendar", match: (p) => p.startsWith("/calendar") }`.

### 4. Day popover
- [ ] Use `Popover` / `PopoverTrigger` / `PopoverContent` from `@/components/ui/popover`.
- [ ] Trigger via `render={<button ... />}` (base-ui `render` prop, NOT `asChild`).
- [ ] Content: list of events for `openDay` — name, `currency price`, category `Badge` (only if `sub.category`), `formatDueLabel` result.
- [ ] No actions inside popover (read-only). Esc / outside-click closes (base-ui default).

### 5. Accessibility
- [ ] Day-with-events cell is focusable + activatable (keyboard opens popover).
- [ ] `role="grid"` / `role="row"` / `role="gridcell"` light ARIA on the grid.
- [ ] Dot marker `aria-hidden` (decorative); date number + text carry the signal.
- [ ] Prev/Today/Next are `<Button>` (already focusable, ring on focus).

## Validation commands

Run from `frontend/`:
```bash
npm run lint
npx tsc -b
```
Both must pass clean. Then run `npm run dev` and manually verify:
- `/calendar` reachable from nav between Subscriptions and Statistics.
- Current month renders with correct first-day-of-week for both `en` and `zh-CN` (toggle language in Settings to verify).
- A subscription with `next_billing_date` in the current month appears in the right cell.
- Prev/Next navigates months; Today returns to current month.
- Clicking a day with events opens the popover listing every event.
- A day with >2 events shows "+N more"; activating it opens the popover.
- Empty month shows "No billing this month" with no alarm styling.
- No edit/acknowledge/delete controls anywhere on the page.

## Risky files / rollback points

- `frontend/src/components/AppLayout.tsx` — nav order change is the only edit to a shared file; revert = remove the one nav entry + one `<Route>`.
- `frontend/src/components/ui/popover.tsx` — first feature use. If base-ui Popover misbehaves (portal/focus trap), rollback to an inline `aria-expanded` panel (no portal) showing the same event list. Keep this as a noted fallback, do not pre-build it.
- `frontend/src/i18n/{en,zh-CN}.json` — additive only; revert = delete the `calendar` block + `layout.calendar` key.

## Review gates

- [ ] After step 3 (route+nav): `tsc -b` passes (catches import/route type errors early).
- [ ] After step 4 (popover): manual click+keyboard test in `npm run dev`.
- [ ] Final: full `npm run lint` + `tsc -b` clean, both locales manually checked.