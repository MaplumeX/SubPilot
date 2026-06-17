# Quality Guidelines

> Code quality standards for frontend development.

---

## Forbidden Patterns

- `buttonVariants` / `badgeVariants` exports alongside default — breaks react-refresh. The `cva` consts stay module-private; only the component is exported.
- `FormEvent` direct import — use `React.SyntheticEvent<HTMLFormElement>` for the form submit handler (as in `SubscriptionForm.handleSubmit`), or `import { type FormEvent as ReactFormEvent } from "react"`.
- `asChild` on shadcn primitives — Radix-only. base-ui components use the `render` prop (see [Component Guidelines: base-ui vs Radix](./component-guidelines.md)).
- Inline style objects — use Tailwind classes.
- Unkeyed form components in create/edit mode — always add `key` prop (`key={editing?.id ?? "create"`, or `key="app-create"` for the global create form in `AppLayout`).
- `any` — use `unknown` and narrow (see [Type Safety](./type-safety.md)).

---

## Required Patterns

- `export default` single component per file (react-refresh).
- All shadcn/ui components in `src/components/ui/`, kept thin (no business logic).
- Tailwind CSS v4 with `@tailwindcss/vite` plugin; theme tokens in `index.css` (oklch). Fonts via `@fontsource-variable/geist`.
- API types centralized in `src/api/types.ts`; mirror backend Pydantic field names exactly (snake_case).
- Path alias `@/` for all imports.
- `useCallback` for handler/context values passed into effects and providers.
- Date/currency formatting: pass `i18n.language` as the locale to `Intl.NumberFormat` / `toLocaleDateString`.

---

## Testing Requirements

- `tsc --noEmit` must pass with zero errors
- `eslint` must pass with zero errors
- `npm run build` must produce no errors

---

## Code Review Checklist

- [ ] No deprecated API usage (`FormEvent` without rename; `asChild` on base-ui primitives)
- [ ] All form components have `key` prop for entity switching
- [ ] Context value functions wrapped in `useCallback`
- [ ] shadcn/ui components don't export style variants (react-refresh)
- [ ] TypeScript types match backend Pydantic schemas (field-for-field, snake_case)
- [ ] No `any` types
- [ ] oklch theme vars used bare (`var(--primary)`), never wrapped in `hsl()`
