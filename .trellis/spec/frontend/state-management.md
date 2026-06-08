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
| User locale | Backend (user.locale) + i18next | "en", "zh-CN" |
| Theme preference | localStorage + next-themes | light/dark/system mode |
| Page data | Component state | subscription list, stats |
| Form inputs | Component state | email, password, form fields |
| UI toggles | Component state | dialog open/close, loading flags |

---

## When to Use Global State

Only for truly cross-cutting concerns:
- Auth (user identity, tokens)
- Theme preferences
- Locale (via i18next, persisted to backend user.locale)

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

---

## Locale State Flow

```
Browser (navigator.language) → i18next detection → localStorage fallback
                                         ↓
Login/refresh → GET /me → user.locale → i18n.changeLanguage(locale)
                                         ↓
Settings page → changeLanguage(newLocale) → PATCH /me/locale → backend persists
```

- i18next owns the runtime locale state (not React Context)
- `i18n.language` is the source of truth for the current locale
- Backend `user.locale` is the persistent source; loaded on auth init
- `i18next-browser-languagedetector` handles initial detection (localStorage → navigator)
