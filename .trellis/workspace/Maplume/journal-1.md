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

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `a8f665f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
