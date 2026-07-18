# Implement: Resolve Residual Frontend Audit Issues

## Execution Checklist

### Phase A: Backend — Unacknowledge endpoint

- [ ] A1. Add `POST /subscriptions/{id}/unacknowledge` in `backend/app/routers/subscriptions.py`
  - Set `acknowledged_billing_date = None`, return `SubscriptionResponse`
  - Same ownership check + joinedload + converted_price as acknowledge
- [ ] A2. Verify: `cd backend && uv run pytest` passes (existing tests + new if any)

### Phase B: Frontend — Acknowledge undo

- [ ] B1. Add `unacknowledgeSubscription(id)` to `frontend/src/api/subscriptions.ts`
- [ ] B2. Extend `toast-store.ts` Toast type with optional `action: { label: string; onClick: () => void }`
- [ ] B3. Update `toaster.tsx` to render action button when present
- [ ] B4. Add i18n keys: `dashboard.undo`, `dashboard.undoneTitle`, `dashboard.acknowledgedAction`
- [ ] B5. Dashboard: `handleAcknowledge` → toast with undo action; `handleUndoAcknowledge` restores due_soon
- [ ] B6. Subscriptions: `handleAcknowledge` → toast with undo action; restore subscription state
- [ ] B7. Verify: `tsc --noEmit` + `eslint` + `npm run build`

### Phase C: Frontend — icon button hit area

- [ ] C1. Add `after:absolute after:-inset-2` to icon-xs and icon-sm variants in `button.tsx`
- [ ] C2. Verify: visual size unchanged, hit area expanded. `tsc --noEmit` + `npm run build`

### Phase D: Frontend — Payment method required indicator

- [ ] D1. Add required asterisk to payment method label in `SubscriptionForm.tsx` when methods exist
- [ ] D2. Add inline `<Link to="/settings">` to empty-payment-method hint
- [ ] D3. Verify: `tsc --noEmit` + `eslint`

### Phase E: Frontend — Keyboard shortcuts

- [ ] E1. Create `frontend/src/lib/use-keyboard-shortcuts.ts` hook
  - `N` → new subscription, `g`+letter → navigation, `?` → help dialog
  - Ignore when focus in input/textarea/select/contenteditable
- [ ] E2. Add i18n keys for shortcut help dialog (`shortcuts.title`, `shortcuts.*`)
- [ ] E3. Call `useKeyboardShortcuts` in `AppLayout.tsx` with `navigate` + `onAddSubscription`
- [ ] E4. Add shortcuts help Dialog (reuse Dialog component, list all shortcuts)
- [ ] E5. Verify: `tsc --noEmit` + `eslint` + `npm run build`

### Phase F: Frontend — Error toast copy

- [ ] F1. Add `toastError(err, t)` helper in `lib/utils.ts` (network/403/404/500/fallback)
- [ ] F2. Add i18n keys: `errors.networkError`, `errors.forbidden`, `errors.notFound`, `errors.serverError`
- [ ] F3. Replace all 16 `toast({ title: t("errors.loadFailed") })` with `toastError(err, t)`
- [ ] F4. Verify: `tsc --noEmit` + `eslint` + `npm run build`

### Phase G: Design system docs

- [ ] G1. Add Caption + Micro type steps to DESIGN.md Typography → Hierarchy
- [ ] G2. Add ambient shadow token values to DESIGN.md Colors (new Ambient Shadow subsection)
- [ ] G3. Verify: `detect.mjs` advisories reduced

### Phase H: Final verification

- [ ] H1. `cd frontend && npx tsc --noEmit && npx eslint src/ && npm run build`
- [ ] H2. `cd backend && uv run pytest`
- [ ] H3. Run `detect.mjs` — verify advisory count dropped
- [ ] H4. Commit all changes

## Validation Commands

```bash
# Frontend
cd frontend && npx tsc --noEmit && npx eslint src/ && npm run build

# Backend
cd backend && uv run pytest

# Detector
node .pi/skills/impeccable/scripts/detect.mjs --json frontend/src
```

## Review Gates

- After Phase B: test acknowledge → undo flow manually in browser (if available) or verify state logic
- After Phase E: test shortcuts don't fire inside inputs
- After Phase F: test each error type maps to correct message

## Rollback Points

- After Phase A: revert backend route if API issues
- After Phase B: revert toast-store/toaster/pages if undo flow breaks
- After Phase E: remove hook + dialog if shortcuts interfere with UX