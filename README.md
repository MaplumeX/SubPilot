# SubPilot

Calm subscription tracker — know what you pay, when it renews, and what is due soon.

## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + Vite + shadcn/ui
- **Deploy**: Docker Compose (local build or GHCR images)

## Development

```bash
# install
make install

# run API :8000 + web :5173
make dev
```

Docker from source:

```bash
docker compose up --build
```

## Deploy with published images

```bash
cp .env.example .env   # set SECRET_KEY, CORS_ORIGINS
export SUBPILOT_VERSION=1.0.0
docker compose up -d
```

Omit `SUBPILOT_VERSION` to use `:latest`.

> Public GHCR packages can be pulled anonymously once package visibility is set to public. Otherwise: `docker login ghcr.io`.

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

- Builds and pushes:
  - `ghcr.io/maplumex/subpilot-backend:{version, major.minor, latest}`
  - `ghcr.io/maplumex/subpilot-frontend:{version, major.minor, latest}`
- Creates a GitHub Release from the changelog section

Workflows: https://github.com/MaplumeX/SubPilot/actions

## CI

Tag `v*` runs the release workflow: build/push GHCR images and create a GitHub Release.
