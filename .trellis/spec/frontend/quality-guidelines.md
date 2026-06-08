# Quality Guidelines

> Code quality standards for frontend development.

---

## Forbidden Patterns

- `buttonVariants` / `badgeVariants` exports alongside default — breaks react-refresh
- `FormEvent` direct import (deprecated) — use `import { useState, type FormEvent as ReactFormEvent } from "react"`
- Inline style objects — use Tailwind classes
- Unkeyed form components in create/edit mode — always add `key` prop

---

## Required Patterns

- `export default` single component per file
- All shadcn/ui components in `src/components/ui/`
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- API types centralized in `src/api/types.ts`
- Path alias `@/` for all imports

---

## Testing Requirements

- `tsc --noEmit` must pass with zero errors
- `eslint` must pass with zero errors
- `npm run build` must produce no errors

---

## Code Review Checklist

- [ ] No deprecated API usage (`FormEvent` without rename)
- [ ] All form components have `key` prop for entity switching
- [ ] Context value functions wrapped in `useCallback`
- [ ] shadcn/ui components don't export style variants (react-refresh)
- [ ] TypeScript types match backend Pydantic schemas
- [ ] No `any` types
