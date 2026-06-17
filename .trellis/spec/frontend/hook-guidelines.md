# Hook Guidelines

> How hooks are used in this project.

---

## Overview

Custom hooks are minimal in this project. The patterns in use: `useAuth()` — a thin context wrapper over `AuthContext`; `useTheme` — re-exported from `next-themes` via `src/theme-hook.ts`. Data fetching is done via direct Axios calls inside `useEffect` or event handlers; there is no React Query / SWR integration.

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

Current pattern: direct Axios calls via `src/api/*` functions, no caching layer.

- **On mount**: call API in `useCallback`-wrapped `fetchX` inside `useEffect(() => { fetchX(); }, [fetchX])`, store result in `useState`. Set `loading=false` in `.finally`. See `DashboardPage.fetchStats`, `SubscriptionsPage.fetchSubscriptions`.
- **On mutation**: call API in an event handler, then manually re-fetch or update local state. `SubscriptionsPage.handleAcknowledge` optimistically patches local state from the response instead of refetching.
- **Unmanageable dependencies**: when a fetch depends on filter/sort state, put those values in the `useCallback` dependency array so the effect re-runs on change (`fetchSubscriptions` depends on `[filterCategory, filterStatus, sortBy, sortOrder]`).
- **Error handling**: the Axios response interceptor (`api/client.ts`) handles 401 globally (clears tokens, redirects to `/login`). Per-call errors are caught silently with `// 401 handled by interceptor` comments — only show local error UI for user-actionable failures (e.g. form submit, settings save).
- **Stale-effect guard**: for fetch-on-mount with async state, guard with an `active` flag in the effect cleanup so a slow response after unmount doesn't call `setState` on an unmounted component (see `SettingsPage.NotificationsCard` `useEffect`).

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
