# Changelog

All notable changes to SubPilot are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Breaking (deploy):** Single Docker image `ghcr.io/<owner>/subpilot` replaces dual `subpilot-backend` + `subpilot-frontend` images. Compose exposes host port **7743** (maps to Nginx on container port 80); uvicorn listens on loopback only. Old dual-image publish is discontinued — see README migration notes.

## [1.0.0] - 2026-07-10

### Added

- First public release of SubPilot
- Subscription management (CRUD, categories, payment methods, renewals, reminders)
- Dashboard, stats, cashflow forecast, multi-currency conversion
- Docker Compose deployment and automated GHCR / GitHub Release pipeline
