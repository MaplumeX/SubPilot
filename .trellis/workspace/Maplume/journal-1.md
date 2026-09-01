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


## Session 12: Add subscription sorting

**Date**: 2026-06-13
**Task**: Add subscription sorting
**Branch**: `MaplumeX/subscription-sorting`

### Summary

Added server-side column sorting to subscriptions list (sort_by + sort_order query params). Sortable columns: name, price (converted_price via SQL JOIN on exchange_rates), next_billing_date (with nullslast). Frontend: clickable column headers with direction arrows and aria-sort accessibility. Updated spec docs with sorting patterns and whitelist validation convention.

## Session 12: Add card view for subscriptions

**Date**: 2026-06-13
**Task**: Add card view for subscriptions
**Branch**: `MaplumeX/sub-card-view`

### Summary

Added SubscriptionCard component and view mode toggle (table/card) to subscriptions page with responsive grid layout and sessionStorage persistence

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9bda160` | (see git log) |
| `e7c1a3f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 13: Add payment method field to subscriptions

**Date**: 2026-06-17
**Task**: Add payment method field to subscriptions
**Branch**: `MaplumeX/subscription-payment-method`

### Summary

Added a required payment_method field to subscriptions as a free-text combobox with history (mirrors the category field). DB migration uses server_default='' sentinel so it passes on existing rows; required/non-empty constraint enforced at Pydantic schema (min_length=1) and frontend trim check. Added GET /payment-methods distinct-list endpoint, table/card display, zh-CN/en i18n. Captured two specs: backend required-but-nullable-by-default pattern, frontend required-vs-optional combobox variant.

## Session 13: Subscription due-date reminders

**Date**: 2026-06-17
**Task**: Subscription due-date reminders
**Branch**: `MaplumeX/lumeX/due-date-reminders`

### Summary

Added daily due-date reminders (email via per-user SMTP + Telegram via per-user bot) with window [today, today+reminder_days], an acknowledged_billing_date marker that stops per-period reminders without advancing next_billing_date (avoids double-advance vs process_renewals), reminder settings UI, acknowledge button in subscription list/card views, and spec updates for ack-marker + per-user credential patterns.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9f25d0e` | (see git log) |
| `cdb7882` | (see git log) |
| `da8fe12` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 14: 修复订阅路由顺序导致支付方式 422

**Date**: 2026-06-26
**Task**: 修复订阅路由顺序导致支付方式 422
**Branch**: `emdash/two-socks-laugh-d4a3h`

### Summary

修复 backend/app/routers/subscriptions.py 中 GET /payment-methods 被动态路由 /{subscription_id} 抢先匹配导致 422、前端支付方式下拉无法加载的问题。将 list_payment_methods 路由声明上移至所有静态子路径位于 /{subscription_id} 之前（纯位置调整，函数实现/URL/语义不变）。并在 .trellis/spec/backend/quality-guidelines.md 补充 FastAPI 路由顺序约定与 review checklist 检查项以防止回归。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3323156` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 15: Redesign category & payment method as managed entities

**Date**: 2026-06-27
**Task**: Redesign category & payment method as managed entities
**Branch**: `emdash/forty-knives-rest-gl5he`

### Summary

Planned (brainstorm 6 questions: minimal field set, block-delete-on-reference, dev-stage FK swap, select-only form, rename support, no seed for new users) and implemented Category/PaymentMethod as per-user managed entities with CRUD routers, subscription FK swap, alembic migration with per-user dedup backfill, SettingsPage EntityManagerCard, SubscriptionForm Combobox->Select rewrite. All 21 AC met; ruff/lint/build/alembic upgrade head verified.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b3bba65` | (see git log) |
| `6d3eea4` | (see git log) |
| `ee07031` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 16: Fix Dashboard acknowledge 刷新重现 + toast 文案不一致

**Date**: 2026-07-05
**Task**: Fix Dashboard acknowledge 刷新重现 + toast 文案不一致
**Branch**: `main`

### Summary

Fixed two bugs in the Dashboard '确认已续费' flow. (A) Backend /stats due_soon query was missing the acknowledged_billing_date filter, so acknowledged subs reappeared on refresh — added the or_(is_(None), != next_billing_date) filter mirroring scanner.py:43-44. (B) Toast copy promised a next-reminder date that was actually the current billing date (ack does not advance next_billing_date) — dropped {{date}} from zh-CN/en acknowledgedMessage and removed the orphan date interpolation at both t() call sites. Also added a cross-query invariant warning to the ack-marker pattern in database-guidelines.md so future due-soon-style queries copy the filter verbatim. Verified via tsc -b, npm run build, ruff check; eslint no new violations.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ddc492b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 17: Rewrite logo search with backend proxy endpoint

**Date**: 2026-07-05
**Task**: Rewrite logo search with backend proxy endpoint
**Branch**: `main`

### Summary

Replaced single-favicon URL hack with backend-proxied image search: new services/ssrf.py (host allowlist + IP filter incl CGNAT + DNS pin) + services/logo_search.py (DDG i.js primary, Brave HTML fallback, zero API key). Added GET /search-logo and POST /cache-logo endpoints (declared before /{subscription_id}), cache-logo downloads chosen image to /static/logos/ reusing upload-logo conventions. Frontend SubscriptionForm search tab rewritten to candidate grid + click-to-cache flow; LogoCandidate type, searchLogo/cacheLogo API fns, 5 i18n keys (zh/en), ERROR_KEY_MAP entries. Codified SSRF helper pattern + httpx 0.28 DNS-pin limitation in backend quality-guidelines spec.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5dddfe2` | (see git log) |
| `65fc197` | (see git log) |
| `65ce55d` | (see git log) |
| `3796ccf` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 18: Calendar view for upcoming billing

**Date**: 2026-07-05
**Task**: Calendar view for upcoming billing
**Branch**: `main`

### Summary

Added a read-only /calendar month-grid page surfacing next_billing_date events (name + localized amount + due label) with prev/next/today nav, in-component month cache, base-ui Popover (first feature use via render prop), locale-aware first-day-of-week via Intl.Locale.weekInfo, ARIA grid semantics, and full en/zh-CN i18n. Frontend-only; lint + tsc clean. Recorded the weekInfo TS cast gotcha in type-safety.md.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5dbd039` | (see git log) |
| `0b92f8f` | (see git log) |
| `a2652aa` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 19: Refine calendar grid to minimalist Notion/Linear style

**Date**: 2026-07-05
**Task**: Refine calendar grid to minimalist Notion/Linear style
**Branch**: `main`

### Summary

Redesigned CalendarPage month grid as a calm Notion/Linear-style surface: shared divider lines via gap-px bg-border wrapper (no per-cell borders), today highlight via primary ring on the number, compact pending pills for events (name only, max 2 + +N overflow), de-emphasized out-of-month/past days, refined weekday header and month label. Pure visual refactor — no behavior/i18n/data changes. tsc + lint pass.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4588e75` | (see git log) |
| `5f1c919` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 20: Enhance reminder configuration

**Date**: 2026-07-05
**Task**: Enhance reminder configuration
**Branch**: `main`

### Summary

Added per-subscription reminder config (enable switch + default/custom mode + custom days 1..90) and free-form global reminder days input. Fixed pre-existing stats due_soon hardcoded 3-day window to use per-subscription effective days. Migration f5edd13044d3 with server_default preserves existing behavior. Trellis-check passed all 9 acceptance criteria.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `a1b4060a875a7a83ab593a7669dd71ef01fd1c6e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 21: Fix auto-renewal scheduler startup and catch-up

**Date**: 2026-07-09
**Task**: Fix auto-renewal scheduler startup and catch-up
**Branch**: `main`

### Summary

Diagnosed auto-renewal not firing: APScheduler interval days=1 never ran on startup and only advanced one cycle per run. Fixed by calling _run_renewals() in lifespan (like exchange rates) and looping process_renewals until next_billing_date > today. Documented startup-immediate-run and catch-up conventions in backend directory-structure spec.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `ca9bfb1` | (see git log) |
| `62be83f` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: Show acknowledged status in subscriptions table

**Date**: 2026-07-09
**Task**: Show acknowledged status in subscriptions table
**Branch**: `main`

### Summary

Fixed table view so due-soon rows show a secondary '已确认' badge after acknowledge (matching SubscriptionCard), instead of only hiding the button. Documented the dual-surface badge gotcha in frontend component guidelines.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `a15eb68` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 23: Configurable daily notification time

**Date**: 2026-07-09
**Task**: Configurable daily notification time
**Branch**: `main`

### Summary

Added user-local reminder_time + timezone settings, 1-minute scanner with once-per-local-day idempotency and startup catch-up, Settings UI + i18n, and documented the pattern in specs.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `204655f` | (see git log) |
| `4172bc5` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 24: Future monthly cashflow forecast on Statistics + Dashboard

**Date**: 2026-07-09
**Task**: Future monthly cashflow forecast on Statistics + Dashboard
**Branch**: `main`

### Summary

Added GET /subscriptions/forecast projecting actual billing charges (price×FX, not monthly-normalized) for 12 calendar months with auto_renew-aware rolling. Statistics page shows Recharts bar chart + click-for-month detail; Dashboard next-30-days now uses the same server total. Spec updated for cashflow vs stats semantics and /forecast route order.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `47b16b6` | (see git log) |
| `8c0942d` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 25: Finish code defect audit wrap-up

**Date**: 2026-07-13
**Task**: Finish code defect audit wrap-up
**Branch**: `main`

### Summary

Wrapped up the code defect audit task: confirmed six security/auth/input fixes already landed (SECRET_KEY hardening, SVG upload block, currency/payment validation, token refresh, toast lint split) with matching Trellis specs. Archived 07-12-code-defect-audit. Left unrelated lockfile version bumps (uv.lock, package-lock.json) uncommitted.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `801ac9a` | (see git log) |
| `49b443f` | (see git log) |
| `d2350d8` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 26: Full currency support from exchange-rate source

**Date**: 2026-07-13
**Task**: Full currency support from exchange-rate source
**Branch**: `main`

### Summary

Expanded SUPPORTED_CURRENCIES to Frankfurter's 30 codes; frontend static mirror with Intl.DisplayNames labels in SubscriptionForm and Settings; contract tests for HKD/SGD accept and ZZZ reject; Trellis specs updated for currency Select pattern and dual-list sync.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `4a4f5c0` | (see git log) |
| `82c7a15` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 27: Single Docker image deploy

**Date**: 2026-07-13
**Task**: Single Docker image deploy
**Branch**: `main`

### Summary

Merged dual subpilot-backend/frontend images into one subpilot image (Nginx+uvicorn, host 7743→80). Updated compose, release workflow, README migration notes, and deploy-runtime specs. Stopped dual GHCR publish.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `7d0fc5d` | (see git log) |
| `931be51` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 28: Add WebP support to logo upload and cache

**Date**: 2026-07-16
**Task**: Add WebP support to logo upload and cache
**Branch**: `main`

### Summary

Added image/webp to the backend ALLOWED_CONTENT_TYPES whitelist and EXT_MAP, the frontend upload allowedTypes array, the file input accept attribute, and the ERROR_KEY_MAP key. Updated invalidFileType error messages in EN/ZH i18n to include WebP. Updated spec notes in quality-guidelines.md and error-handling.md to reflect the new allowed list (and corrected an erroneous SVG reference in error-handling.md). Tests, lint, and build all pass.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `2f38097` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 29: Show next renewal date in subscription management UI

**Date**: 2026-07-18
**Task**: Show next renewal date in subscription management UI
**Branch**: `main`

### Summary

Added formatNextBillingDate/formatBillingDate helpers in due.ts and applied them in SubscriptionsPage table view and SubscriptionCard, so the next renewal date now shows as '<date> (<relative>)' e.g. '2026-07-21 (3天后)' in both views. Null shows '-'. No backend changes.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `22673a2` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 30: Persist subscription sort state

**Date**: 2026-08-02
**Task**: Persist subscription sort state
**Branch**: `main`

### Summary

Added localStorage persistence for subscription list sort state (sortBy + sortOrder) in SubscriptionsPage.tsx, following the existing viewMode pattern. Stored field validated against sortable columns whitelist; invalid/stale values fall back to defaults. Updated state-management.md spec to document the new persistence category. Caught and fixed a regression where STATUSES constant was accidentally deleted by the implement sub-agent.

### Git Commits

| Hash | Message |
|------|---------|
| `786e90d` | (see git log) |

### Status

[OK] **Completed**


## Session 31: Allow zero price for free subscriptions

**Date**: 2026-09-01
**Task**: Allow zero price for free subscriptions
**Branch**: `main`

### Summary

允许订阅价格设置为 0 元（免费）：后端 schema gt=0→ge=0（create/update），前端表单校验改为仅拒绝负数，中英文提示文案更新为「价格不能为负」，spec type-safety.md 同步。测试 22 passed，lint/typecheck 通过，check agent 确认无除以 price 的逻辑风险。

### Git Commits

| Hash | Message |
|------|---------|
| `9c62a9f` | (see git log) |

### Status

[OK] **Completed**
