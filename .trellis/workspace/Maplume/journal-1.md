# Journal - Maplume (Part 1)

> AI development session journal
> Started: 2026-06-08

---



## Session 1: SubPilot v1 MVP: full-stack subscription manager

**Date**: 2026-06-08
**Task**: SubPilot v1 MVP: full-stack subscription manager
**Branch**: `main`

### Summary

Implemented SubPilot subscription management app from scratch: FastAPI + SQLAlchemy + SQLite backend with JWT auth and subscription CRUD (stats, monthly normalization, due-soon logic); React + Vite + shadcn/ui frontend with dashboard, subscription list/filters, trend chart; Docker Compose deployment; updated trellis spec with project conventions.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `90dd4f7` | (see git log) |
| `6631394` | (see git log) |
| `6d7a8f0` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Add i18n support with en and zh-CN

**Date**: 2026-06-08
**Task**: Add i18n support with en and zh-CN
**Branch**: `MaplumeX/i18n-support`

### Summary

Implemented full i18n support: react-i18next + i18next setup, 92 translation keys across en/zh-CN, Settings page with language switching, backend user.locale field + Alembic migration + PATCH /me/locale endpoint, AuthProvider locale sync on login, dynamic date/currency formatting, ERROR_KEY_MAP for backend error message mapping. Updated frontend/backend specs with i18n patterns.

## Session 2: Add theme system with light/dark/system modes

**Date**: 2026-06-08
**Task**: Add theme system with light/dark/system modes
**Branch**: `MaplumeX/support-theme-system`

### Summary

Implemented theme system using next-themes: ThemeProvider with class attribute, ThemeToggle dropdown (Light/Dark/System), useTheme hook re-export, FOUC prevention inline script. Updated frontend component/hook/state-management specs with theme patterns and common mistakes.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ac96abc` | (see git log) |
| `fdfc454` | (see git log) |
| `46161ad` | (see git log) |
| `1338d8a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Fix Select sentinel value display

**Date**: 2026-06-08
**Task**: Fix Select sentinel value display
**Branch**: `MaplumeX/fix-subscription-all-display`

### Summary

Fixed __all__/__none__ appearing as raw text in @base-ui/react Select components by using value={x||undefined} instead of sentinel string values, so SelectValue placeholder is triggered correctly.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9af6931` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Fix frontend component and style issues

**Date**: 2026-06-08
**Task**: Fix frontend component and style issues
**Branch**: `MaplumeX/frontend-component-issues`

### Summary

Fixed 5 frontend UI bugs: Dialog width conflict (sm:max-w-sm→sm:max-w-lg), Recharts oklch color incompatibility, table horizontal overflow, delete confirmation dialog, and navigation active state highlight. Updated component-guidelines spec with oklch/SVG gotcha and dialog width convention.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `275ef8e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Fix Select text/style mismatch

**Date**: 2026-06-08
**Task**: Fix Select text/style mismatch
**Branch**: `MaplumeX/fix-text-and-menu-mismatch`

### Summary

SelectTrigger default width w-fit→w-full, currency Input→Select (CNY/USD/EUR/GBP/JPY with i18n), fix onValueChange null typing for base-ui Select

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9f923d9` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Fix Select trigger showing raw value instead of translated label

**Date**: 2026-06-08
**Task**: Fix Select trigger showing raw value instead of translated label
**Branch**: `MaplumeX/select-label-mismatch`

### Summary

Added label prop to SelectValue so trigger displays translated text instead of raw value string. Root cause: Base UI Portal renders SelectItem outside DOM, so SelectPrimitive.Value cannot resolve ItemText on mount.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f215204` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Customizable Billing Cycle

**Date**: 2026-06-08
**Task**: Customizable Billing Cycle
**Branch**: `MaplumeX/custom-billing-cycle`

### Summary

Replace BillingCycle enum with cycle_count (int) + cycle_unit (CycleUnit: day/week/month/year). Auto-compute next_billing_date. Preset buttons + custom entry in form. Removed cycle filter from list page.

## Session 7: Add auto-renewal feature for subscriptions

**Date**: 2026-06-08
**Task**: Add auto-renewal feature for subscriptions
**Branch**: `MaplumeX/auto-renewal`

### Summary

Added auto_renew boolean field (default True) to Subscription model, renewal service with date advancement logic (weekly/monthly/quarterly/yearly including month-end edge cases), APScheduler daily background job in FastAPI lifespan, frontend Switch toggle in SubscriptionForm, RefreshCw icon column in SubscriptionsPage table, i18n translations (en/zh-CN), alembic migration. Updated backend spec for services directory and Boolean server_default convention.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `8795659` | (see git log) |
| `a8f665f` | (see git log) |
| `0cf7aa7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Add currency exchange rate conversion

**Date**: 2026-06-09
**Task**: Add currency exchange rate conversion
**Branch**: `MaplumeX/exchange-rate-conversion`

### Summary

Added exchange rate conversion feature: Frankfurter API (ECB data) with daily fetch, SQLite caching, cross-rate calculation, user-level base_currency preference, converted_price in subscription responses, Dashboard dynamic currency display, list page converted price, Settings page base currency selector, i18n (en + zh-CN).


## Session 9: Remove preset categories and add custom category input

**Date**: 2026-06-09
**Task**: Remove preset categories and add custom category input
**Branch**: `MaplumeX/custom-category-management`

### Summary

Replaced hardcoded 9 preset categories with a Combobox (Command+Popover) that supports free-text input for creating new categories and selecting from existing ones. Added GET /subscriptions/categories backend endpoint. Filter dropdown on subscriptions page now dynamically fetches categories. Removed i18n category translations — categories display as raw text. Updated component guidelines spec with Combobox pattern.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `57fc951` | (see git log) |
| `7baf356` | (see git log) |
| `9325490` | (see git log) |
| `d758559` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Statistics Dashboard UI

**Date**: 2026-06-12
**Task**: Statistics Dashboard UI
**Branch**: `main`

### Summary

Added /statistics page with category distribution donut chart, monthly spending trend bar chart (12-month forward projection), and Top 5 subscriptions ranking. Includes dark mode support via CSS descendant selectors and themed Tooltip styles, i18n (en/zh-CN), loading/empty states.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `a2840b0` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Add core metric cards to statistics page

**Date**: 2026-06-13
**Task**: Add core metric cards to statistics page
**Branch**: `MaplumeX/more-statistics-data`

### Summary

Extended statistics page with 4 core metric cards (avg monthly cost, most expensive, cheapest, top3 concentration). Backend: added SubscriptionBrief schema and 4 new fields to stats endpoint. Frontend: responsive grid cards above existing charts, i18n support.

## Session 11: Fix subscription all-filter display

**Date**: 2026-06-13
**Task**: Fix subscription all-filter display
**Branch**: `MaplumeX/kampala`

### Summary

Kept category and status Select filters controlled with null empty values so choosing all displays translated placeholders instead of __all__; updated the Base UI Select guideline and verified frontend lint and production build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `887eba6` | (see git log) |
| `3f00e1e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
