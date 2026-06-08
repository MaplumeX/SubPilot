# fix-select-sentinel-value-display

## Goal

Fix `__all__` / `__none__` sentinel values showing as raw text in `@base-ui/react` Select components instead of their intended display labels (e.g. "All cycles", "None").

## What I already know

* Root cause: `SelectContent` renders inside a Portal. On initial render, `SelectItem` nodes are not in the DOM yet. When `value` is set to `"__all__"` or `"__none__"`, `SelectValue` cannot find a matching item's label text, so it falls back to displaying the raw value string.
* `placeholder` is never triggered because `value` is never empty/null — the code uses `filterX || "__all__"` pattern.
* Affected locations (4 total):
  * `SubscriptionsPage.tsx:99` — Category filter (`__all__` → "All categories")
  * `SubscriptionsPage.tsx:117` — Status filter (`__all__` → "All statuses")
  * `SubscriptionsPage.tsx:129` — Cycle filter (`__all__` → "All cycles")
  * `SubscriptionForm.tsx:190` — Category field (`__none__` → "None")
* NOT affected: `SubscriptionForm.tsx` Billing Cycle (156) and Status (172) — their values are valid enum values that always have matching items.

## Requirements

* Replace `__all__` / `__none__` sentinel pattern with a mechanism that displays the correct label on initial render
* All 4 affected Select components must show their intended text (not `__all__` / `__none__`)
* Filter behavior must remain unchanged: empty value = no filter applied
* Form behavior must remain unchanged: empty category = null/empty

## Acceptance Criteria

* [ ] Category filter shows "All categories" when no filter is selected
* [ ] Status filter shows "All statuses" when no filter is selected
* [ ] Cycle filter shows "All cycles" when no filter is selected
* [ ] Category field in form shows "None" when no category is selected
* [ ] No `__all__` or `__none__` visible in the UI

## Definition of Done

* Lint / typecheck green
* Manual verification that all 4 selects display correctly

## Technical Approach

Switch from sentinel values to `value={undefined}` + render-function `SelectValue` pattern, letting the component use its placeholder when no real value is selected. For filters this means `value` is `undefined` when empty; for the form category field likewise.

For `SelectValue`, instead of relying on `SelectItem` lookup, render the displayed text explicitly based on the current state variable.

## Out of Scope

* Refactoring unrelated Select components
* Changing the API client query logic
* Adding i18n or label mapping abstractions
