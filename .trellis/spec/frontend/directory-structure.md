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
│   ├── auth-context.tsx       # Auth context provider
│   ├── auth-hook.ts           # useAuth hook
│   ├── routes.tsx             # ProtectedRoute, GuestRoute wrappers
│   ├── App.tsx                # Router config
│   ├── main.tsx               # Entry point
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
