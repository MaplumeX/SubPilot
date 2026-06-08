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
- Theme customization in `src/index.css` via CSS variables
- shadcn/ui `cn()` utility from `src/lib/utils.ts` for conditional classes
- No separate CSS files, no CSS modules

---

## Common Mistakes

- **Exporting style variants alongside default** — causes react-refresh warning; extract variant logic inside the component only
- **Missing `key` on form components** — when reusing a form for create/edit, add `key={editing?.id ?? "create"}` to force remount
- **Forgetting `useCallback` for context values** — causes consumers to re-render on every provider update
