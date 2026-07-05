# Refine calendar grid to minimalist Notion/Linear style

## Goal

Redesign the month grid in `frontend/src/pages/CalendarPage.tsx` so it reads as a calm, minimalist Notion/Linear-style calendar instead of the current heavy-boxed grid. Pure visual refactor — no behavior, data, or i18n key changes.

## Current Problems

- Every cell carries its own `border` + `rounded-lg`, so the 6×7 grid looks like 42 separate boxes rather than one calm surface.
- `gap-1` is too tight; cells nearly touch.
- Today has no highlight; past days are dimmed but today blends in.
- Event markers are plain text + a 1.5px dot — weak hierarchy, reads as a list, not a calendar.
- Month label sits flush right; weekday header is small and undifferentiated from cell content.

## Requirements

### Grid surface
- Replace per-cell borders with a **single shared grid**: thin divider lines between cells (Notion/Linear style), no per-cell box border. Use `divide-*` / inner borders on a wrapping container, not `border` on each cell.
- Increase outer padding and inter-cell spacing so the grid breathes (e.g. `gap-2` or `gap-px` with divider lines).
- Keep `min-h-24` (or slightly taller) so cells stay roomy.

### Day cells
- In-month cells: transparent / `bg-transparent` on the shared surface (no individual card).
- Out-of-month cells: text only, very low contrast (`text-muted-foreground/40`), no background fill.
- Past in-month days: dimmed number (`text-muted-foreground/50`), no fill.
- **Today**: a subtle highlight — a small filled primary dot under the number, OR a thin primary ring on the number itself (Notion-style), NOT a full-cell color fill. Pick whichever reads cleaner.
- Cells with events stay focusable/activatable (Popover behavior unchanged); hover state = very subtle `bg-muted/40` wash, not a border change.

### Event markers
- Replace plain-text list with a compact **pill**: small rounded bar (`rounded-sm`, `bg-pending/10 text-pending`, `text-[10px]`/`text-xs`, truncate) showing `name` only. Price moves to the popover (already there).
- Max 2 visible pills + a `+N` overflow pill in muted style (reuse existing `calendar.more` key).
- The standalone 1.5px dot next to the date number is removed — the pill itself signals events.

### Header & month label
- Month label: keep on the right but bump to `text-base font-semibold` and tighten spacing so it sits calmly above the grid.
- Weekday header row: `text-xs font-medium uppercase tracking-wide text-muted-foreground`, centered, slightly taller row (`h-9`). Keep narrow weekday format.

### Popover
- No structural change. Visual polish only: ensure pills inside the popover are consistent with cell pills (same `bg-pending/10 text-pending` treatment for the due badge is already fine).

## Out of Scope

- No new i18n keys.
- No data fetching / caching changes.
- No keyboard navigation behavior changes.
- No changes to the month nav buttons (already fine).
- No new shadcn components.

## Acceptance Criteria

- [ ] Grid reads as one calm surface with shared divider lines, not 42 bordered boxes.
- [ ] Today is visually distinguishable without a full-cell color fill.
- [ ] Event markers are compact pills (name only), max 2 + overflow count.
- [ ] Out-of-month and past days are clearly de-emphasized but still legible.
- [ ] Light + dark mode both look correct (check `bg-muted`, `text-muted-foreground`, `bg-pending/*` opacities).
- [ ] No behavior regression: Popover still opens on click, focus ring still shows, weekday order respects locale `firstDay`.
- [ ] No new i18n keys; all existing `calendar.*` keys still used.
- [ ] `tsc --noEmit` and lint pass.

## Notes

- Theme tokens available: `--pending` (brand blue), `--muted`, `--muted-foreground`, `--border`. Use opacity variants (`/10`, `/40`, `/50`) for calm washes.
- Keep `cn()` for conditional classes; do not introduce a CSS file.
- Reference vibe: Notion monthly calendar sidebar + Linear roadmap week grid.