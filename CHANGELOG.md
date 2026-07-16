# Changelog

All notable changes to SubPilot are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
