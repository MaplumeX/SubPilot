# State Management

> How state is managed in this project.

---

## Overview

- **Auth state**: React Context (`AuthContext`) + `useAuth` hook
- **Server state**: direct fetch via Axios, no SWR/React Query
- **Local UI state**: `useState` per component
- **Form state**: `useState` per field (no form library)

---

## State Categories

| Category | Storage | Example |
|----------|---------|---------|
| Auth tokens | localStorage + Context | access_token, refresh_token |
| Current user | AuthContext | user object |
| Theme preference | localStorage + next-themes | light/dark/system mode |
| Page data | Component state | subscription list, stats |
| Form inputs | Component state | email, password, form fields |
| UI toggles | Component state | dialog open/close, loading flags |

---

## When to Use Global State

Only for truly cross-cutting concerns:
- Auth (user identity, tokens)
- Theme preferences

Everything else stays in component state. No premature abstraction.

---

## Server State

- Fetch on mount or user action
- No caching layer — refetch when needed
- Auth token injected via Axios interceptor in `api/client.ts`
- 401 responses trigger redirect to `/login`

---

## Common Mistakes

- **Missing `useCallback` on context value functions** — causes all consumers to re-render unnecessarily
- **Storing derived state** — calculate on the fly (e.g., monthly total from subscriptions) instead of storing separately
- **Not invalidating after mutation** — after create/update/delete, refetch the list or stats
