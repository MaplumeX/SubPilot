# Subscription Manager App (SubPilot)

## Goal

Build a subscription management web app that helps users track, organize, and manage all their service subscriptions in one place — with spending stats and trend visualization.

## Requirements

### Core CRUD
* Add/edit/delete subscription entries
* Track subscription details: name, price, billing cycle (monthly/yearly/weekly), category, status (active/cancelled/trial), start date, next billing date, notes
* Each user owns their subscriptions (multi-user isolation)

### Dashboard & Stats
* Overview of total monthly and yearly spend
* Subscriptions can be filtered/sorted by category, status, billing cycle
* Trend chart: simple line chart showing monthly spending over time

### Renewal Indicators
* Subscriptions expiring within 3 days get a "due soon" visual badge
* No push/email notifications — in-app indicator only

### Auth
* Multi-user: registration, login, JWT-based authentication
* Each user sees only their own data

### Data
* All data manually entered (no import/auto-detect for MVP)
* Single currency for simplicity (user's chosen default)

## Acceptance Criteria

* [ ] User can register and log in with email/password
* [ ] User can add a new subscription with required fields
* [ ] User can view all their subscriptions in a list/dashboard
* [ ] User can edit and delete their subscriptions
* [ ] Total monthly and yearly spend is calculated and displayed
* [ ] Subscriptions can be filtered by category/status
* [ ] Monthly spending trend chart is displayed on dashboard
* [ ] Subscriptions due within 3 days show a "due soon" badge
* [ ] Users can only see and manage their own subscriptions

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Docker Compose works end-to-end

## Out of Scope

* CSV/data import or export
* Email or push notifications
* Multi-currency support
* Calendar view
* Subscription sharing / family features
* Bank statement auto-matching
* Free trial → paid auto-detection

## Technical Approach

### Stack
* **Backend**: Python FastAPI + SQLAlchemy + Alembic + SQLite
* **Frontend**: React + Vite + shadcn/ui + Tailwind CSS
* **Auth**: JWT (access + refresh tokens)
* **Charts**: lightweight chart library (e.g., Recharts)
* **Deployment**: Docker Compose (frontend + backend + SQLite volume)

### Architecture
* Monorepo with `backend/` and `frontend/` directories
* REST API backend, SPA frontend
* Backend serves API at `/api/v1/`, frontend served by Nginx in production
* User table + Subscription table with foreign key to user

### Key Data Model (draft)
* **User**: id, email, hashed_password, created_at
* **Subscription**: id, user_id, name, price, currency, billing_cycle, category, status, start_date, next_billing_date, notes, created_at, updated_at

## Decision (ADR-lite)

**Context**: Need to pick tech stack, DB, auth model, deployment, and MVP scope for a new project with no existing code.
**Decision**: FastAPI + React/shadcn/ui + SQLite + JWT + Docker Compose. MVP includes CRUD + stats + trend chart + renewal badge.
**Consequences**: SQLite keeps ops simple but limits concurrent writes; JWT auth adds boilerplate but enables future multi-tenant; no data import means users must enter everything manually initially.

## Technical Notes

* No codebase exists yet — all architectural decisions are open
* Spec templates are empty placeholders — conventions will be defined during implementation
* Tech stack: FastAPI (Python) backend + React/Vite + shadcn/ui frontend
* Database: SQLite (via SQLAlchemy/Alembic) — zero-config, migratable to PostgreSQL later
* Data entry: manual only for MVP
* Notifications: basic renewal indicator ("due soon" badge)
* Auth: multi-user with registration/login/JWT
* Deployment: Docker self-hosted — docker-compose frontend + backend + SQLite volume
