# Directory Structure

> How frontend code is organized in this project.

---

## Overview

React 19 + Vite + TypeScript + shadcn/ui (base-ui backed) + Tailwind CSS v4, organized by role (pages, components, api). i18n via i18next; charts via Recharts.

---

## Directory Layout

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios instance with auth request + 401 response interceptors
│   │   ├── auth.ts            # Auth + user-profile API functions
│   │   ├── subscriptions.ts   # Subscription + stats + forecast + categories + payment-methods + logo API
│   │   ├── notifications.ts   # Notification settings + test-channel API
│   │   └── types.ts          # Shared TypeScript types (API boundary)
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (base-ui backed, see below)
│   │   ├── AppLayout.tsx      # App shell: nav header, routed <main>, global create form
│   │   ├── SubscriptionForm.tsx  # Create/edit form (Dialog + Comboboxes)
│   │   ├── SubscriptionCard.tsx  # Card-view row component
│   │   ├── theme-provider.tsx    # Wraps next-themes provider
│   │   └── theme-toggle.tsx      # Dropdown theme switcher
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx     # Stats cards + due-soon list + next-30-days cashflow (from /forecast)
│   │   ├── SubscriptionsPage.tsx # Table + card view, filters, sorting
│   │   ├── StatisticsPage.tsx    # Category pie + top subs + 12-month cashflow bar chart
│   │   └── SettingsPage.tsx      # Language, base currency, notification settings
│   ├── i18n/
│   │   ├── index.ts            # i18next config (init + LanguageDetector)
│   │   ├── en.json             # English translations
│   │   └── zh-CN.json          # Simplified Chinese translations
│   ├── auth-context.tsx       # AuthContext provider (token + user state)
│   ├── auth-hook.ts           # useAuth hook (context wrapper)
│   ├── theme-hook.ts          # Re-exports next-themes useTheme
│   ├── routes.tsx             # ProtectedRoute, GuestRoute wrappers
│   ├── App.tsx                # Router config (BrowserRouter + providers)
│   ├── main.tsx               # Entry point (imports i18n + index.css before App)
│   ├── index.css              # Tailwind CSS v4 + oklch theme + @fontsource Geist
│   └── lib/
│       ├── utils.ts           # cn() utility
│       └── currencies.ts      # Frankfurter-aligned SUPPORTED_CURRENCIES + currencyLabel (mirrors backend)
├── components.json           # shadcn config: style "base-nova", base-ui registry
├── public/                   # Static assets (favicon.svg)
├── vite.config.ts             # Tailwind + path alias + /api + /static proxy
├── tsconfig.app.json          # Path alias (@/* → ./src/*)
└── eslint.config.js
```

---

## Module Organization

- **api/** — one file per domain (auth, subscriptions, notifications), shared types in `types.ts`
- **i18n/** — i18next config + JSON translation files (one per locale). Top-level namespaces: `auth, dashboard, subscriptions, subscriptionForm, layout, settings, notifications, errors, statistics`
- **lib/** — shared pure helpers (`utils.ts`, `currencies.ts`). Currency option codes live in `currencies.ts` (static mirror of `backend/app/currencies.py`); labels use `Intl.DisplayNames`, not i18n JSON keys.
- **components/ui/** — shadcn/ui primitives only, no business logic. Built on `@base-ui/react` (NOT Radix); `components.json` style is `base-nova`.
- **components/** — feature-level reusable components (incl. `theme-provider.tsx`, `theme-toggle.tsx` at this level, not under `ui/`)
- **pages/** — route-level page components

---

## Naming Conventions

- Page files: `<Name>Page.tsx` (PascalCase + Page suffix)
- Component files: `<Name>.tsx` or `<Name>Form.tsx`
- API files: domain name lowercase (`auth.ts`, `subscriptions.ts`, `notifications.ts`)
- Hook/context files: flat under `src/`, kebab-case (`auth-hook.ts`, `theme-hook.ts`, `auth-context.tsx`)
- CSS: Tailwind utility classes only, no separate CSS files except `index.css`

---

## Adding a New Page

1. Create `src/pages/<Name>Page.tsx`
2. Add a `<Route>` inside `AppLayout`'s `<Routes>` (authenticated pages live inside `AppLayout`, which is itself wrapped by `ProtectedRoute` in `App.tsx`)
3. Add nav link in `AppLayout.tsx` if needed

---

## Adding a New Locale

1. Create `src/i18n/<locale>.json` with all translation keys
2. Import and register in `src/i18n/index.ts` under `resources`
3. Add locale to the `PATCH /me/locale` allowlist in `backend/app/routers/auth.py`
4. Add the locale's `SelectItem` in `src/pages/SettingsPage.tsx` (and its trigger `label` — see Select guidelines)
