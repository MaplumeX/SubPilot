# SubPilot

**A calm, reliable subscription tracker — the steady assistant for your recurring spend.**

[中文](./README.zh-CN.md)

SubPilot gathers every subscription you have into one place and answers three questions: what am I paying for, how much does it cost per month / per year, and what is about to renew. It exists to remove the anxiety of a forgotten renewal — renewal reminders are a first-class citizen, not a setting buried three menus deep.

Success looks like this: you open SubPilot, confirm in a few seconds that "this month is safe / one charge is coming up," and close it with peace of mind.

---

## Features

- **Subscription management** — CRUD for subscriptions with cycle (day / week / month / year), currency, category, payment method, notes, and logo.
- **Renewal-first dashboard** — due-soon items are the primary visual focus, ahead of totals and trends.
- **Automatic renewals** — a daily scheduler advances `next_billing_date` for active auto-renew subscriptions.
- **Reminders** — per-subscription reminder windows (default or custom days ahead). Due reminders are consolidated into a single summary message per scan.
- **Statistics** — monthly / yearly spend, monthly trend, and next-30-day projection.
- **Multi-currency** — on-demand exchange-rate fetching with conversion to a single display currency.
- **Cashflow forecast** — upcoming charges laid out on a calendar.
- **Auth** — JWT access + refresh tokens, bcrypt password hashing.
- **i18n** — English (default) and Simplified Chinese, auto-detected from the browser.
- **Dark mode** — a first-class theme, not an afterthought.

## Tech Stack

| Layer    | Stack                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| Backend  | FastAPI, SQLAlchemy, Alembic, APScheduler, python-jose, passlib[bcrypt], Python 3.12+ |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, shadcn, Recharts, i18next                  |
| Runtime  | Single Docker image — Nginx (SPA + static) + uvicorn via supervisord                   |
| Data     | SQLite (file-based, persisted via volume)                                              |

## Quick Start (Docker)

The published image is `ghcr.io/maplumex/subpilot`. Compose exposes host port **7743**.

No need to clone the repo — pull the two files you need and go:

```bash
# 1. Fetch docker-compose.yml and .env.example from the repo
curl -LO https://raw.githubusercontent.com/MaplumeX/SubPilot/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/MaplumeX/SubPilot/main/.env.example

# 2. Set SECRET_KEY to a long random string
#    (e.g.  openssl rand -hex 32  >> .env  after editing the placeholder)
$EDITOR .env

# 3. Launch
docker compose up -d
```

Open `http://localhost:7743` and register an account.

### Required environment

| Variable        | Example                              | Notes                                                                    |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `SECRET_KEY`    | a long random string                 | Required. The development default is rejected at startup.                |
| `DATABASE_URL`  | `sqlite:///./data/subpilot.db`       | Set automatically by Compose; override for external databases.           |
| `CORS_ORIGINS`  | `http://localhost:7743`              | Comma-separated list of allowed origins. Defaults to the compose origin. |

To pin a specific version:

```bash
SUBPILOT_VERSION=1.1.0 docker compose up -d
```

## Local Development

Prerequisites: Python 3.12+ with [`uv`](https://docs.astral.sh/uv/), Node.js 22+.

```bash
# install both backend and frontend deps
make install

# run backend (uvicorn :8000) and frontend (vite :5173) in parallel
make dev
```

The frontend dev server proxies `/api` to the backend. Open `http://localhost:5173`.

Backend-only:

```bash
cd backend && uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend-only:

```bash
cd frontend && npm install
npm run dev
```

## Project Structure

```
SubPilot/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + lifespan schedulers
│   │   ├── config.py          # pydantic-settings
│   │   ├── routers/           # auth, subscriptions, categories, payment_methods
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # renewals, reminders, exchange rates, forecast
│   ├── alembic/               # migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/               # axios clients
│   │   ├── components/        # shadcn-based UI
│   │   ├── pages/             # Dashboard, Subscriptions, Calendar, Statistics, Settings
│   │   ├── i18n/              # en.json, zh-CN.json
│   │   └── routes.tsx
│   └── package.json
├── deploy/                    # nginx.conf, supervisord.conf, healthcheck
├── Dockerfile                 # multi-stage: frontend build → single runtime
├── docker-compose.yml
└── .github/workflows/release.yml
```

## Deployment

### Single Docker image (v1.1.0+)

One image serves the SPA and API on container port 80 — Nginx fronts uvicorn over the loopback. The healthcheck treats a 401/403 from `/auth/me` as "API is up" (auth is required).

### Migrating from the dual-image setup (pre-1.1.0)

v1.1.0 replaced the separate `subpilot-backend` and `subpilot-frontend` images with a single `subpilot` image.

1. Pull `ghcr.io/maplumex/subpilot:1.1.0` (or `latest`).
2. Update `docker-compose.yml` to the single-service form shown above (host port `7743` → container `80`).
3. Move any backend env vars onto the single service.
4. The SQLite volume path inside the container is `/app/data/subpilot.db` — keep the same volume to preserve data.

### Release pipeline

Tags matching `v*` trigger `.github/workflows/release.yml`, which:

1. Verifies the `VERSION` file matches the tag.
2. Builds and pushes the image to GHCR with `major.minor`, `major.minor.patch`, and `latest` tags.
3. Creates a GitHub Release with notes extracted from `CHANGELOG.md`.

To cut a release: bump `VERSION`, `backend/pyproject.toml`, and `frontend/package.json` in one commit, then tag `vX.Y.Z`.

## Background Jobs

On startup the app initializes a scheduler with three jobs:

| Job              | Interval | Purpose                                                          |
| ---------------- | -------- | ---------------------------------------------------------------- |
| Auto-renewal     | 1 day    | Advances `next_billing_date` for active auto-renew subscriptions.|
| Exchange rates   | 1 day    | Fetches fresh rates for multi-currency conversion.               |
| Reminders        | 1 minute | Scans for due reminders and consolidates them per user.          |

All three also run once on boot as catch-up after a restart (safe via per-user time + idempotency gates).

## License

All rights reserved. This project is not currently released under an open-source license.