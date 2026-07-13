# SubPilot

Calm subscription tracker — know what you pay, when it renews, and what is due soon.

## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + Vite + shadcn/ui
- **Deploy**: Single Docker image (Nginx + uvicorn) via Compose or GHCR

## Development

Local development stays split (API + Vite), independent of the production image:

```bash
# install
make install

# run API :8000 + web :5173
make dev
```

## Deploy with Docker Compose

One service serves the UI and API on host port **7743**:

```bash
cp .env.example .env
# set SECRET_KEY to a long random string (required)
docker compose up --build -d
```

Open http://localhost:7743

With a published image:

```bash
cp .env.example .env   # set SECRET_KEY, optional CORS_ORIGINS
export SUBPILOT_VERSION=1.0.0
docker compose up -d
```

Omit `SUBPILOT_VERSION` to use `:latest`.

Image: `ghcr.io/maplumex/subpilot:{version, major.minor, latest}`

> Public GHCR packages can be pulled anonymously once package visibility is set to public. Otherwise: `docker login ghcr.io`.

### Migrating from two images

Earlier releases published `subpilot-backend` and `subpilot-frontend` as separate images. That dual-image compose layout is no longer published.

| Before | After |
|--------|--------|
| Two services (`backend` + `frontend`) | One service (`app`) |
| Host ports 8000 + 80 | Host port **7743** → container 80 |
| Two GHCR images | `ghcr.io/maplumex/subpilot` only |

1. Stop the old stack (`docker compose down --remove-orphans`).
2. Replace `docker-compose.yml` / pull this repo’s compose file.
3. Set `SECRET_KEY` and `CORS_ORIGINS=http://localhost:7743` (or your public origin) in `.env`.
4. `docker compose up -d` (or pin `SUBPILOT_VERSION`). If Compose warns about orphan `backend`/`frontend` containers, re-run with `--remove-orphans`.
5. SQLite data still lives under the `/app/data` volume — existing named volumes that mounted `/app/data` on the backend remain usable if you keep the same volume name (`subpilot-data`).

Old `subpilot-backend` / `subpilot-frontend` tags may still exist in GHCR history but are no longer built.

## Versioning & release

SemVer. Root `VERSION` is the source of truth and must match backend / frontend package versions.

To publish:

1. Update `VERSION`, `backend/pyproject.toml`, `frontend/package.json` to the same semver.
2. Move notes from `CHANGELOG.md` `[Unreleased]` into a new `## [x.y.z] - YYYY-MM-DD` section.
3. Commit on `main` and push.
4. Create and push an annotated tag:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

GitHub Actions then:

- Builds and pushes `ghcr.io/maplumex/subpilot:{version, major.minor, latest}`
- Creates a GitHub Release from the changelog section

Workflows: https://github.com/MaplumeX/SubPilot/actions

## CI

Tag `v*` runs the release workflow: build/push the GHCR image and create a GitHub Release.
