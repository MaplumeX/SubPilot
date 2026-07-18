# PRD: Resolve Residual Frontend Audit Issues

## Background

After running `/impeccable critique` (31/40) and `/impeccable audit` (15/20), then executing 8 impeccable commands to fix a11y/responsive/state-consistency issues, re-runs showed improved scores (critique 35/40, audit 17/20). This task resolves the remaining issues that were out of scope for the first pass.

## Residual Issues

### P1: Acknowledge has no undo

`handleAcknowledge` in DashboardPage and SubscriptionsPage immediately removes the subscription from the due_soon list and shows a success toast, but there is no undo path. A misclick silently dismisses a renewal reminder until the next billing cycle. This contradicts PRODUCT.md's "calm, reliable" promise.

**Requirements**:
- After acknowledging a subscription, the user can undo the action within a short window
- Undo restores the subscription to the due_soon list
- Works on both Dashboard and Subscriptions page
- Undo is accessible (keyboard operable, announced by screen reader)

### P2: icon-xs buttons have 24px touch target

`icon-xs` buttons (size-6 = 24px) are used for calendar prev/next, table row delete/edit. 24px meets WCAG 2.5.8 AA minimum but is tight for mobile. The Switch component solved this via `after:-inset-x-4 -inset-y-4` hit area expansion. Apply the same strategy to icon-xs and icon-sm buttons.

**Requirements**:
- icon-xs and icon-sm buttons have hit area ≥ 44px via pseudo-element expansion
- Visual size stays 24px/28px (product density preserved)
- Works on mobile and desktop

### P2: Form payment_method validation not front-loaded

SubscriptionForm validates payment_method only on submit. If the user has payment methods but hasn't selected one, the error appears after attempting to save. The empty-payment-method case shows a hint text, but the required-state isn't visually communicated before submit.

**Requirements**:
- Payment method field visually indicates required before submit
- If no payment methods exist, the hint includes a link to Settings
- Validation message is clear and actionable

### P2: No keyboard shortcuts / batch operations

Alex (power user) persona flags: no `N` for new subscription, no `/` for search, no `J/K` navigation, no multi-select batch delete. This is a product-depth gap, not a visual bug.

**Requirements**:
- A command palette / keyboard shortcut layer for the most common actions:
  - `N` — new subscription (open form)
  - `g` then `d/s/c/t/s` — navigate to Dashboard/Subscriptions/Calendar/Statistics/Settings (Gmail-style prefix)
- Shortcuts are discoverable (help hint, `?` to show available shortcuts)
- Shortcuts don't interfere with text input fields
- `prefers-reduced-motion` respected (no animation on palette open)

### P3: Toast error copy is generic ("加载失败")

All error toasts use `t("errors.loadFailed")` which is a generic "Load failed" / "加载失败". Specific errors (network, 403, 404, 500) should map to more specific, actionable messages.

**Requirements**:
- Error toast copy distinguishes at least: network error, permission denied, not found, server error
- Each message is actionable (tells the user what to do)
- Falls back to generic message for unknown errors

### P3: Detector advisories — DESIGN.md missing caption/micro type steps + shadow token registration

`detect.mjs` reports 6 advisories every run:
- `button.tsx` `0.8rem` (sm variant) — off type ramp
- `CalendarPage.tsx` `10px` (sm:text-[10px]) — off type ramp
- `index.css` `rgba(0,0,0,0.08/0.3/0.4)` — ambient shadow tokens not in DESIGN.md colors

**Requirements**:
- DESIGN.md typography section adds `caption` (0.75rem / 12px) and `micro` (0.625rem / 10px) steps
- DESIGN.md colors section registers ambient shadow token values
- These are intentional design-system additions, not drift

## Out of Scope

- Backend API changes beyond un-acknowledge endpoint
- New chart types or statistics features
- Redesigning existing pages
- Mobile app (native)

## Acceptance Criteria

1. Acknowledge undo works on Dashboard + Subscriptions, restores due_soon state, keyboard accessible
2. icon-xs/icon-sm buttons have ≥44px hit area via pseudo-element, visual size unchanged
3. Payment method field shows required indicator before submit; empty case links to Settings
4. Keyboard shortcuts: `N` (new subscription), `g`+letter (navigation), `?` (help) work and don't interfere with inputs
5. Error toasts distinguish network/permission/not-found/server errors with actionable copy
6. DESIGN.md has caption + micro type steps and shadow token registration; `detect.mjs` advisories reduced to 0 or only true false positives
7. All changes pass `tsc --noEmit`, `eslint`, and `npm run build`
8. WCAG AA maintained (contrast, keyboard, aria)