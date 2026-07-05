# Design — Calendar view

Frontend-only task. No backend changes, no new API endpoint. The page reads the existing `listSubscriptions()` response and renders a month grid client-side.

## Architecture

```
AppLayout (NAV_ITEMS + nested <Route>)
  └─ <Route path="/calendar" element={<CalendarPage />} />

CalendarPage (frontend/src/pages/CalendarPage.tsx)
  ├─ state: { cursor: Date (first-of-month), loading, subsCache: Map<year-month, Subscription[]>, openDay: Date | null }
  ├─ fetches listSubscriptions() once per visible month, caches by `${YYYY-MM}`
  ├─ derives eventsByDay: Map<isoDate, Subscription[]> for the visible month
  └─ renders:
       MonthHeader  (prev / today / next + localized month/year label)
       WeekdayRow   (locale-aware first-day-of-week + narrow weekday labels)
       MonthGrid    (7-col grid of DayCell)
       DayCell      (date number + dot/bar marker + stacked EventMarker list + "+N more")
       DayPopover   (base-ui Popover: full event list for the open day)
```

Single-page component, no child files under `components/` — the grid is small enough to keep inline (matches `DashboardPage` keeping `NextMonthProjection` in-file). If a piece grows large it can be extracted later; v1 stays in one file.

## Data Flow

```
listSubscriptions()  →  Subscription[]
   filter: status === "active" && next_billing_date != null
   group by: next_billing_date (ISO date → YYYY-MM-DD)
   └─ eventsByDay: Map<isoDate, Subscription[]>
```

- `next_billing_date` is an ISO date string (`YYYY-MM-DD`). Parse with `new Date(dateStr + "T00:00:00")` (matches `lib/due.ts` convention) to avoid timezone drift.
- Only events whose `next_billing_date` falls in the visible month are placed in cells. Active subs with null `next_billing_date` are excluded silently (no UI).
- No conversion / projection math — show the subscription's own `currency` + `price` (raw, like Dashboard's `due_soon` rows: `USD 9.99`).

## Caching strategy

`subsCache: Map<string, Subscription[]>` keyed by `${YYYY-MM}` (the month being viewed, not the billing month).

- On mount and whenever `cursor` changes: if `subsCache.has(key)` is false, call `listSubscriptions()` and store the result under `key`. The API returns the user's full active+inactive list; we filter to active-with-billing-date at render time, not at fetch time, so the cache stays generic.
- If the cache already has the key, skip the fetch and render immediately.
- Loading state is per-month: `loading` is true only when fetching the currently visible month and the cache miss is in flight. Skeleton shows for that month only.
- No invalidation in v1 — the page is read-only and short-lived; navigating away and back refetches. (Matches the project's "no caching layer, refetch when needed" pattern from `state-management.md`.)

> Trade-off note: this is a tiny, in-component cache. It is NOT a global server-state cache — `listSubscriptions()` is called fresh each time the user visits `/calendar` for the first time in a session. Acceptable for a read-only view; do not promote to a hook-level cache without a real cross-page need.

## Locale & first-day-of-week

```ts
function getFirstDayOfWeek(locale: string): 0 | 1 {
  try {
    const info = new Intl.Locale(locale).weekInfo; // { firstDay: 1 (Mon) for zh, 7 (Sun) for en }
    return info.firstDay === 1 ? 1 : 0; // normalize 7 → 0
  } catch {
    return 0; // fallback Sunday
  }
}
```

Weekday headers: `Intl.DateTimeFormat(locale, { weekday: 'narrow' })` over 7 consecutive days starting at the computed first day.
Month label: `Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor)`.

## Day cell rendering

- 7-column CSS grid (`grid grid-cols-7`). Each cell is a `<td>`-equivalent `<div>` with `min-h` to keep rows even.
- Date number top-left. If the day has events: a `size-1.5 rounded-full bg-pending` dot next to the number (color + shape — not color alone).
- Event markers stack under the number, max visible = 2 (configurable constant `MAX_VISIBLE_EVENTS = 2`). Each marker: subscription name (truncate) + `currency price`.
- If `events.length > MAX_VISIBLE_EVENTS`: render `+N more` as a button that opens the day popover.
- Past days (date < today, same month): `text-muted-foreground/60` for the date number; events still render at full opacity (data is not hidden).
- Out-of-month days (leading/trailing blanks from the first-day-of-week offset): `text-muted-foreground/40`, no events. Kept to keep the grid a clean 7×N rectangle (matches the standard month-grid convention).

## Day popover (base-ui Popover)

First feature use of `frontend/src/components/ui/popover.tsx`. base-ui composition uses `render` prop (NOT `asChild`):

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger render={<button type="button" className="..." />}>
    {triggerLabel}
  </PopoverTrigger>
  <PopoverContent align="start" sideOffset={4}>
    {/* full event list: name, amount, category badge, formatDueLabel */}
  </PopoverContent>
</Popover>
```

- Trigger is the day cell itself (or the `+N more` button when the cell overflows — both open the same popover for that day). One popover per open day at a time (`openDay` state).
- Popover content lists every event for that day: avatar/logo (optional in v1 — keep minimal, skip for now), name, `currency price`, category `Badge` if `sub.category != null`, and a `formatDueLabel(sub.next_billing_date, t)` relative label.
- No actions inside the popover (read-only). Clicking outside / Esc closes (base-ui default).

## Keyboard & accessibility

- Prev / Today / Next are `<Button>` — already focusable, ring on focus.
- Each day-with-events cell is a `<button>` (or has `tabIndex={0}` + `role="button"`) so Tab reaches it; activating it opens the popover.
- `aria-pressed` on the open day. The grid uses `role="grid"` with `role="row"` per week and `role="gridcell"` per day (lightweight ARIA — no full data-grid semantics, just enough for AT to announce structure).
- Color is not the sole encoding: dot/bar + date number + event text all carry the "has billing" signal.
- WCAG AA: date numbers use default foreground (≥4.5:1); event text uses default foreground; the `pending` dot is decorative (aria-hidden).

## i18n keys (`calendar.*` namespace)

Added to both `en.json` and `zh-CN.json`:

```
calendar.title           — "Calendar" / "日历"
calendar.subtitle        — "Upcoming billing at a glance" / "一目了然的 upcoming 扣款"  (zh wording TBD by translator consistency)
calendar.prevMonth       — "Previous month" / "上个月"
calendar.nextMonth       — "Next month" / "下个月"
calendar.today           — "Today" / "今天"
calendar.noBilling       — "No billing this month" / "本月无扣款"
calendar.more           — "+{{count}} more" / "还有 {{count}} 项"
calendar.loading         — "Loading…" / "加载中…"
calendar.noSubscriptions  — "You have no subscriptions yet." / "你还没有添加订阅。"
calendar.addFirst        — "Add your first subscription" / "添加第一个订阅" (link label back to Dashboard)
calendar.dueLabel        — passed through formatDueLabel (reuses dashboard.dueToday / dashboard.dueInDays)
```

Nav label key: `layout.calendar` added alongside existing `layout.dashboard / subscriptions / statistics / settings`.

## Compatibility & rollback

- Pure addition — no existing route, component, or API changes. Safe to revert by deleting `CalendarPage.tsx`, the `<Route>`, the nav entry, and the i18n keys.
- The `Popover` ui primitive already exists in `components/ui/popover.tsx` (untested in feature code until now); if base-ui Popover has an integration issue, the fallback is an inline expanded panel (toggle a `aria-expanded` div) — same data, no portal. Keep this as a rollback note, not a parallel implementation.

## Out of scope (v1)

 reaffirmed from PRD: year view, editing, drag-reschedule, category filters on calendar, backend changes, historical transactions, notifications, per-subscription detail cross-links.