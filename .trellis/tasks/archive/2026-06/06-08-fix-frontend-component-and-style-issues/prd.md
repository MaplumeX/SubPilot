# Fix Frontend Component and Style Issues

## Goal

Fix multiple frontend UI bugs and style issues that affect display correctness, usability, and consistency across the SubPilot app.

## What I already know

* Dialog `sm:max-w-sm` conflicts with `max-w-lg` on SubscriptionForm, capping dialog width at 384px on desktop
* Recharts uses `hsl(var(--primary))` but `--primary` is oklch, producing invalid color — chart line doesn't render correctly
* Table in SubscriptionsPage has no horizontal overflow handling, breaks on small screens
* Delete button triggers immediately without confirmation dialog
* Navigation buttons lack current-page highlight (no active state)
* `__all__`/`__none__` magic values in Select components are a design smell but mostly functional
* ThemeToggle uses `onClick` on DropdownMenuItem — works via DOM but not the @base-ui/react convention

## Assumptions (temporary)

* Fixes should be minimal — only touch what's needed, no refactors
* oklch is intentional (Tailwind v4/shadcn base-nova), so Recharts should adapt to it
* No new dependencies needed

## Open Questions

(none remaining)

## Decision (ADR-lite)

**Context**: Delete confirmation UX — native vs custom dialog
**Decision**: Use `window.confirm()` for delete confirmation
**Consequences**: Simple one-liner, no new component needed. Visual inconsistency with app theme is acceptable since no other confirmation patterns exist yet; refactor to custom dialog later if more confirmations are added.

## Requirements (evolving)

* Fix Dialog width: remove `sm:max-w-sm` from base DialogContent or override it properly
* Fix Recharts stroke color: use a valid CSS color expression compatible with oklch variables
* Add responsive overflow to subscriptions table
* Add delete confirmation before removing subscriptions
* Add active nav highlight based on current route

## Acceptance Criteria (evolving)

* [ ] SubscriptionForm dialog displays at correct width on desktop (512px / max-w-lg)
* [ ] Dashboard monthly trend chart line renders with correct theme color
* [ ] Subscriptions table scrolls horizontally on small screens
* [ ] Delete action requires confirmation before proceeding
* [ ] Current page is visually indicated in the navigation bar

## Definition of Done

* Lint / typecheck green
* Visual correctness verified (dev server or build)
* No regressions in existing Select/Dialog/Dropdown behavior

## Out of Scope

* Replacing `__all__`/`__none__` Select value pattern (functional, low priority)
* Changing DropdownMenuItem onClick to onSelect (works correctly as-is)
* Adding new features beyond the identified fixes

## Technical Notes

* `dialog.tsx:56` has `sm:max-w-sm` in base className
* `DashboardPage.tsx:135` uses `hsl(var(--primary))` — needs oklch or `currentColor`
* `index.css` defines all theme vars in oklch format
* `@base-ui/react` v1.5.0 is the headless primitive library
* shadcn/ui base-nova style with Tailwind v4
