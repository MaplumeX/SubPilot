# Fix: Select trigger shows raw value instead of translated label

## Problem

When a `Select` has a `value` set on mount, the trigger displays the raw `value` string (e.g., `"USD"`, `"monthly"`) instead of the translated label from `SelectItem` (e.g., `"美元 ($)"`, `"每月"`).

**Root cause**: `SelectContent` renders inside a Portal. On initial render, `SelectItem` nodes are not in the DOM, so Base UI's `SelectPrimitive.Value` cannot find the matching item's `ItemText` and falls back to displaying the raw `value` string.

## Scope

- `frontend/src/components/ui/select.tsx` — add `label` prop to `SelectValue`
- All Select usage sites that need translated labels:
  - `frontend/src/components/SubscriptionForm.tsx` (4 selects)
  - `frontend/src/pages/SubscriptionsPage.tsx` (3 filter selects)
  - `frontend/src/pages/SettingsPage.tsx` (1 language select)

## Solution

Add an optional `label` prop to `SelectValue`. When provided, render the label text directly instead of relying on Base UI's auto-resolution from portal-mounted items. This decouples trigger display from DOM-mounted item lookup.

### select.tsx change

```tsx
function SelectValue({ className, label, ...props }: SelectPrimitive.Value.Props & { label?: string }) {
  if (label !== undefined) {
    return (
      <span data-slot="select-value" className={cn("flex flex-1 text-left", className)}>
        {label}
      </span>
    );
  }
  return (
    <SelectPrimitive.Value ... />
  );
}
```

### Usage pattern

```tsx
<SelectValue label={t(`subscriptionForm.currencies.${currency}`)} />
```

For filter selects using placeholder for unselected state:
```tsx
<SelectValue
  label={filterCategory ? t(`subscriptions.categories.${filterCategory}`) : undefined}
  placeholder={t("subscriptions.allCategories")}
/>
```

When `label` is `undefined`, fall back to `SelectPrimitive.Value` which handles placeholder logic.

## Out of scope

- Changing the value/label architecture of Select itself
- Removing sentinel values (`__all__`, `__none__`)
- Any backend changes
