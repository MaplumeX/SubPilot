# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

The frontend is a React 19 + Vite + TypeScript SPA. UI primitives come from shadcn/ui backed by **`@base-ui/react`** (not Radix; `components.json` style is `base-nova`). State is minimal: React Context for auth/theme, direct Axios for server state, i18next for localization.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | Filled |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | Filled |
| [State Management](./state-management.md) | Local state, global state, server state | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |
| [Type Safety](./type-safety.md) | Type patterns, validation | Filled |

---

## How to Use These Guidelines

These docs describe how THIS project works: actual conventions, real example files, and the specific shadcn/base-ui gotchas that have bitten us. Skim the relevant file before coding in an area (especially [Component Guidelines](./component-guidelines.md) — the Select/Combobox/oklch rules are non-obvious).

---

**Language**: All documentation should be written in **English**.
