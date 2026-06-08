# Hook Guidelines

> How hooks are used in this project.

---

## Overview

Custom hooks are minimal in this project. The primary pattern is `useAuth()` — a thin context wrapper. Data fetching is done via direct Axios calls inside `useEffect` or event handlers; there is no React Query / SWR integration.

---

## Custom Hook Patterns

When extracting stateful logic into a custom hook:

1. Name the file `src/<hook-name>.ts` or `src/<hook-name>.tsx` (flat under `src/`, matching the existing `auth-hook.ts` convention).
2. Export a single `use<Name>()` function.
3. If the hook reads from React Context, follow the `useAuth` pattern: `useContext(MyContext)` with a null guard that throws if used outside the provider.
4. If the hook wraps a third-party library (e.g., `useTheme` from `next-themes`), re-export from a flat `src/*.ts` file so consumers import from `@/theme-hook` instead of the library directly. This decouples components from the specific library implementation.

Example (`src/auth-hook.ts`):

```typescript
import { useContext } from "react";
import { AuthContext } from "./auth-context";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

---

## Data Fetching

Current pattern: direct Axios calls, no caching layer.

- **On mount**: call API in `useEffect(() => { fetch() }, [])`, store result in `useState`.
- **On mutation**: call API in event handler, then manually re-fetch or update local state.
- **Error handling**: narrow Axios errors with `((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail) ?? "Default message"`.

When a hook wraps data fetching, follow this shape:

```typescript
export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSubscriptions().then(setSubs).finally(() => setLoading(false));
  }, []);

  return { subs, loading };
}
```

If React Query is added later, migrate data-fetching hooks to use `useQuery` / `useMutation` internally while keeping the same public API.

---

## Naming Conventions

- Hook functions: `use<PascalCase noun>` — `useAuth`, `useSubscriptions`, `useTheme`
- Hook files: `src/<kebab-case-hook-name>.ts` — `auth-hook.ts`, `subscriptions-hook.ts`
- Context files: `src/<domain>-context.tsx` — `auth-context.tsx`
- Context provider: `<Domain>Provider` — `AuthProvider`

---

## Common Mistakes

- **Calling hooks conditionally** — hooks must be called at the top level of the component, never inside `if` / `try` / loops.
- **Forgetting the dependency array** in `useEffect` — omitting it causes infinite re-renders when the effect sets state.
- **Stale closures** — when `useEffect` callbacks read state that has changed, use `useCallback` or restructure to pass values through the dependency array.
- **Not handling the loading state** — always show a loading indicator while async data is being fetched.
