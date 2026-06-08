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

---

## Select Component (base-ui)

> **Warning**: `SelectContent` renders inside a Portal — `SelectItem` nodes are **not in the DOM** on initial render.
>
> When `value` is set to a sentinel string (e.g. `"__all__"`, `"__none__"`), `SelectValue` cannot find a matching item's label text and falls back to displaying the raw value string.

**Symptom**: `__all__` or `__none__` appears as visible text in the Select trigger instead of the intended label.

**Wrong**:
```tsx
<Select value={filterX || "__all__"} onValueChange={(v) => setFilterX(v === "__all__" ? "" : (v ?? ""))}>
  <SelectTrigger><SelectValue placeholder="All X" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="__all__">All X</SelectItem>
    ...
  </SelectContent>
</Select>
```

**Correct** — use `undefined` for the unselected state so placeholder is triggered:
```tsx
<Select value={filterX || undefined} onValueChange={(v) => setFilterX(v === "__all__" ? "" : v)}>
  <SelectTrigger><SelectValue placeholder="All X" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="__all__">All X</SelectItem>
    ...
  </SelectContent>
</Select>
```

Key: `placeholder` only renders when `value` is `undefined`/empty. The sentinel `SelectItem` is still needed in the dropdown so users can explicitly select "All X" to clear the filter — but the trigger display must not depend on portal-mounted items for its initial text.
