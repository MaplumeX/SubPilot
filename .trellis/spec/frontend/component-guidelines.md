# Component Guidelines

> How components are built in this project.

---

## Overview

- UI primitives: shadcn/ui (Radix-based, Tailwind-styled)
- Feature components: custom components in `src/components/`
- Page components: route-level in `src/pages/`

---

## Component Structure

- One component per file with `export default`
- No named exports of style variants (e.g., `buttonVariants`) — breaks react-refresh
- Keep component, its types, and logic in one file

---

## Props Conventions

- Use inline TypeScript interfaces for props
- Callback props: `onSubmit`, `onSuccess`, `onClick`
- Boolean props: use `disabled`, `loading`, not `isDisabled`, `isLoading`

---

## Styling Patterns

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Theme customization in `src/index.css` via CSS variables (oklch color space)
- Dark mode via `.dark` class on `<html>`, toggled by `next-themes` (`attribute="class"` matches `@custom-variant dark (&:is(.dark *))` in `index.css`)
- shadcn/ui `cn()` utility from `src/lib/utils.ts` for conditional classes
- No separate CSS files, no CSS modules

---

## Theme System

- **Provider**: `ThemeProvider` wraps `next-themes` with `attribute="class"`, `storageKey="vite-ui-theme"`, `enableSystem`, `disableTransitionOnChange`
- **Hook**: `useTheme` re-exported from `next-themes` via `src/theme-hook.ts` (matches flat `src/*.ts` hook convention)
- **Toggle UI**: `ThemeToggle` component — DropdownMenu with Light/Dark/System options; uses `resolvedTheme` (not `theme`) for trigger icon so system mode shows the correct light/dark icon
- **FOUC prevention**: inline `<script>` in `index.html` reads `vite-ui-theme` from localStorage **before** any CSS loads; must handle `theme === 'system'` branch (fall back to `matchMedia`) — otherwise system-mode users see a flash on refresh

```typescript
// FOUC script pattern (must handle system mode explicitly)
var theme = localStorage.getItem('vite-ui-theme');
if (theme === 'dark' || ((theme === 'system' || !theme) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}
```

---

## Common Mistakes

- **Exporting style variants alongside default** — causes react-refresh warning; extract variant logic inside the component only
- **Missing `key` on form components** — when reusing a form for create/edit, add `key={editing?.id ?? "create"}` to force remount
- **Forgetting `useCallback` for context values** — causes consumers to re-render on every provider update
- **Using `theme` instead of `resolvedTheme` for icon display** — in system mode `theme` is `"system"`, but the icon should reflect the actual resolved value (`"light"` or `"dark"`). Use `resolvedTheme` for UI that reflects what the user sees.
- **FOUC script missing `system` branch** — if the inline script only checks `theme === 'dark'`, users who selected "System" with a dark OS preference will see a white flash before `.dark` is applied
- **Wrapping oklch CSS vars with `hsl()`** — theme variables are defined in oklch format; `hsl(var(--primary))` produces invalid CSS like `hsl(oklch(0.205 0 0))`. Always use bare `var(--primary)` for SVG attributes (Recharts stroke/fill, etc.)

---

## Select Component (base-ui)

> **Warning**: `SelectContent` renders inside a Portal — `SelectItem` nodes are **not in the DOM** on initial render.
>
> This affects ALL Select triggers, not just sentinel values. When the component mounts with a `value` already set (e.g. default state, edit form), `SelectPrimitive.Value` cannot find the matching `ItemText` in the Portal and falls back to displaying the **raw value string** (e.g., `"USD"` instead of `"美元 ($)"`, `"monthly"` instead of `"每月"`).

**Fix**: Always pass the `label` prop to `SelectValue` so the trigger text is explicitly provided and never depends on Portal-mounted DOM lookup.

```tsx
// Always provide label — derive from the same i18n key used in SelectItem
<Select value={currency} onValueChange={...}>
  <SelectTrigger>
    <SelectValue label={t(`subscriptionForm.currencies.${currency}`)} />
  </SelectTrigger>
  <SelectContent>
    {CURRENCIES.map((c) => (
      <SelectItem key={c} value={c}>
        {t(`subscriptionForm.currencies.${c}`)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

For selects with a placeholder (e.g. filter selects with "All X" default):

```tsx
<Select value={filterCategory || undefined} onValueChange={...}>
  <SelectTrigger>
    <SelectValue
      label={filterCategory ? t(`subscriptions.categories.${filterCategory}`) : undefined}
      placeholder={t("subscriptions.allCategories")}
    />
  </SelectTrigger>
  ...
</Select>
```

When `label` is `undefined`, `SelectValue` falls back to `SelectPrimitive.Value` (which handles `placeholder`). When `label` is a string, it renders that text directly — no Portal dependency.

**Old sentinel-value pattern** (still applies for `value`/`onValueChange` logic):

**Wrong** — using sentinel as the `value` prop:
```tsx
<Select value={filterX || "__all__"} onValueChange={(v) => setFilterX(v === "__all__" ? "" : (v ?? ""))}>
```

**Correct** — use `undefined` for unselected state so placeholder renders:
```tsx
<Select value={filterX || undefined} onValueChange={(v) => setFilterX(v === "__all__" ? "" : v)}>
```

### oklch CSS variables in SVG / Recharts

> **Warning**: Theme variables in this project use oklch color space (e.g., `--primary: oklch(0.205 0 0)`).
>
> When passing CSS variables as SVG attributes (Recharts `stroke`, `fill`, etc.), do NOT wrap with `hsl()`. The variable already includes the color function, so `hsl(var(--primary))` resolves to `hsl(oklch(...))` which is invalid CSS and silently fails (color falls back to default/black).
>
> Use the bare variable reference instead:
>
> **Wrong**:
> ```tsx
> <Line stroke="hsl(var(--primary))" />
> ```
>
> **Correct**:
> ```tsx
> <Line stroke="var(--primary)" />
> ```

### Dialog width for forms

`DialogContent` defaults to `sm:max-w-lg` (512px) to accommodate form content. If a smaller dialog is needed, pass `className="sm:max-w-sm"` to override. Do NOT revert the base class to `sm:max-w-sm` — it conflicts with form layouts that need wider content (e.g., SubscriptionForm with two-column grid fields).

---

## Combobox Pattern (Command + Popover)

For fields where users need to **select from existing values OR type new ones** (e.g., custom categories), use the shadcn Combobox pattern built from `Command` + `Popover` components.

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-between">
      {value || <span className="text-muted-foreground">{placeholder}</span>}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
    <Command shouldFilter={false}>
      <CommandInput
        value={inputValue}
        onValueChange={(v) => { setInputValue(v); setValue(v); }}
        placeholder={searchPlaceholder}
      />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {options.map((opt) => (
          <CommandItem
            key={opt}
            value={opt}
            onSelect={() => { setValue(opt); setOpen(false); }}
          >
            {opt}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

Key points:
- `shouldFilter={false}` when the input directly controls the state value (typing IS the value, not just a search filter)
- `w-[--radix-popover-trigger-width]` ensures the popover matches the trigger width
- For filter-only dropdowns (no free-text creation), keep using regular `<Select>` with dynamically fetched options

---

## i18n in Components

- Use `const { t } = useTranslation()` in every component with user-facing strings
- Replace all hardcoded strings with `t('namespace.key')`
- Translation keys are organized by page/component namespace (auth, dashboard, subscriptions, subscriptionForm, layout, settings, errors)
- For dynamic keys (e.g., status/cycle names), use `t(\`subscriptions.statuses.\${status}\`)` pattern — ensure all dynamic values exist as keys in both language files. **Exception**: user-created free-form values (e.g., custom categories) should be displayed as raw text, not i18n-translated, since users may type anything
- Date/currency formatting: use `i18n.language` as locale for `toLocaleDateString()` and `Intl.NumberFormat`
- Backend error messages: map `err?.response?.data?.detail` through a local `ERROR_KEY_MAP` object to translate via `t('errors.xxx')`
