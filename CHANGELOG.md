# Changelog

All notable changes to SubPilot are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.4] - 2026-07-18

### Added

- **ui:** Add semantic success/warning colors and a distinguishable six-hue chart palette so status states stop sharing the brand-blue token with renewal reminders.
- **subscriptions:** Acknowledge undo action (Dashboard + Subscriptions) backed by a new `POST /subscriptions/{id}/unacknowledge` endpoint.
- **shortcuts:** Global keyboard shortcuts (`N` = new subscription, `g` + letter = navigate, `?` = help dialog).
- **errors:** `toastError` helper maps network/403/404/500 to specific i18n messages.

### Changed

- **calendar:** Polish day-grid visual hierarchy — solid primary fill for today, due-soon event priority, responsive mobile grid density, and unified event-marker color language.

### Fixed

- **frontend:** Improve a11y (AAA touch targets, aria-labels, keyboard-accessible sort headers), responsive layout (mobile nav hamburger, calendar label sizing), and state consistency (skeleton loaders, inline confirm-dialog errors).
- **subscriptions:** Add `min-w-0` to card header wrapper so long subscription names truncate instead of pushing status badges out of the card.

## [1.1.3] - 2026-07-18

### Added

- **subscriptions:** Show next renewal date in the subscription management UI.
- **subscriptions:** Add WebP support to logo upload and cache.

### Fixed

- **subscriptions:** Use 'Uncategorized' instead of None key in stats `by_category` to avoid Pydantic ValidationError.

## [1.1.2] - 2026-07-16

### Fixed

- **deploy:** Persist `/app/static/logos` via a named Docker volume so user-uploaded / cached subscription logos survive image updates and container recreation.
- **subscriptions:** Prevent long subscription names from squeezing out the status badge in card view.
- **subscriptions:** Import missing `SubscriptionBrief` in stats router, fixing a runtime error in the stats endpoint.

## [1.1.1] - 2026-07-16

### Added

- **notifications:** Consolidate due reminders into a single summary message instead of one message per subscription.
- **docs:** Bilingual README (English + Simplified Chinese) and curl-based one-command deploy without cloning.

### Fixed

- **subscriptions:** Use locale-aware `Intl` currency formatting for original prices so currency symbols render correctly per locale.
- **subscriptions:** Store a single-cycle `converted_price` and add `monthly_prices` stats field, fixing converted-price display mismatch.
- **subscriptions:** Divide by `cycle_count` in monthly normalization for custom billing cycles.
- **subscriptions:** Align `next_billing_date` to a future date on create/update.
- **subscription-form:** Reset all form state when the dialog reopens, preventing residual data.

## [1.1.0] - 2026-07-13

### Changed

- **Breaking (deploy):** Single Docker image `ghcr.io/<owner>/subpilot` replaces dual `subpilot-backend` + `subpilot-frontend` images. Compose exposes host port **7743** (maps to Nginx on container port 80); uvicorn listens on loopback only. Old dual-image publish is discontinued — see README migration notes.

## [1.0.0] - 2026-07-10

### Added

- First public release of SubPilot
- Subscription management (CRUD, categories, payment methods, renewals, reminders)
- Dashboard, stats, cashflow forecast, multi-currency conversion
- Docker Compose deployment and automated GHCR / GitHub Release pipeline
