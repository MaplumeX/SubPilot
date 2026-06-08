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

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ac96abc` | (see git log) |
| `fdfc454` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
