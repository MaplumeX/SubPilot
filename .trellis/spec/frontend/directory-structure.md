# Directory Structure

> How frontend code is organized in this project.

---

## Overview

React + Vite + TypeScript + shadcn/ui + Tailwind CSS v4, organized by role (pages, components, api).

---

## Directory Layout

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios instance with auth interceptor
│   │   ├── auth.ts            # Auth API functions
│   │   ├── subscriptions.ts   # Subscription API functions
│   │   └── types.ts           # Shared TypeScript types (API boundary)
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── AppLayout.tsx      # App shell with nav header
│   │   └── SubscriptionForm.tsx # Feature components
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── SubscriptionsPage.tsx
│   ├── i18n/
│   │   ├── index.ts            # i18next config (init + LanguageDetector)
│   │   ├── en.json             # English translations
│   │   └── zh-CN.json          # Simplified Chinese translations
│   ├── auth-context.tsx       # Auth context provider
│   ├── auth-hook.ts           # useAuth hook
│   ├── routes.tsx             # ProtectedRoute, GuestRoute wrappers
│   ├── App.tsx                # Router config
│   ├── main.tsx               # Entry point (imports i18n before App)
│   ├── index.css              # Tailwind CSS v4 + shadcn theme
│   └── lib/
│       └── utils.ts           # cn() utility
├── vite.config.ts             # Tailwind + path alias + API proxy
├── tsconfig.app.json          # Path alias (@/* → ./src/*)
└── eslint.config.js
```

---

## Module Organization

- **api/** — one file per domain (auth, subscriptions), shared types in `types.ts`
- **i18n/** — i18next config + JSON translation files (one per locale)
- **components/ui/** — shadcn/ui primitives only, no business logic
- **components/** — feature-level reusable components
- **pages/** — route-level page components

---

## Naming Conventions

- Page files: `<Name>Page.tsx` (PascalCase + Page suffix)
- Component files: `<Name>.tsx` or `<Name>Form.tsx`
- API files: domain name lowercase (`auth.ts`, `subscriptions.ts`)
- CSS: Tailwind utility classes only, no separate CSS files except `index.css`

---

## Adding a New Page

1. Create `src/pages/<Name>Page.tsx`
2. Add route in `App.tsx` (within AppLayout for authenticated pages)
3. Add nav link in `AppLayout.tsx` if needed

---

## Adding a New Locale

1. Create `src/i18n/<locale>.json` with all translation keys
2. Import and register in `src/i18n/index.ts` under `resources`
3. Add locale to the `PATCH /me/locale` allowlist in `backend/app/routers/auth.py`
4. Add `SelectItem` in `src/pages/SettingsPage.tsx`
