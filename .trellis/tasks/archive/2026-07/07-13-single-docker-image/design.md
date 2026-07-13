# Design: Single Docker Image (Nginx + uvicorn)

## Summary

Replace the two-service GHCR deploy (`subpilot-backend` + `subpilot-frontend`) with one image `ghcr.io/<owner>/subpilot` that runs Nginx (edge, **container port 80**) and uvicorn (loopback **8000**) in the same container. Host publishes **7743** via `7743:80`. Local `make dev` stays split.

## Architecture

```
Browser → host:7743 → [container]
                      Nginx :80
                        ├─ /            → SPA files (/usr/share/nginx/html)
                        ├─ /api/        → proxy_pass http://127.0.0.1:8000
                        └─ /static/     → proxy_pass http://127.0.0.1:8000
                      uvicorn 127.0.0.1:8000
                        ├─ FastAPI /api/v1/*
                        └─ StaticFiles /static (logos)
                      volume: /app/data (SQLite)
```

## Boundaries

| Layer | Responsibility |
|-------|----------------|
| Root `Dockerfile` | Multi-stage: frontend build + runtime (Python + nginx + process manager) |
| `deploy/nginx.conf` (or root `nginx.conf`) | Listen 80; SPA + reverse proxy to loopback |
| Process manager | Keep nginx + uvicorn alive; prefer **supervisord** |
| `docker-compose.yml` | Single `app` service, `7743:80`, data volume |
| Release workflow | Build/push only `subpilot` |
| Backend / Frontend app code | **No feature changes required** for same-origin SPA |

## Build contract

### Multi-stage Dockerfile (repo root)

1. **Stage `frontend-build`** (`node:22-alpine`)
   - `COPY frontend/`
   - `npm ci` / `npm install` + `npm run build`
   - artifact: `/app/dist`

2. **Stage `runtime`** (`python:3.12-slim` or debian-slim with nginx packages)
   - Install: `nginx`, `supervisor` (or equivalent), backend Python deps from `backend/requirements.txt`
   - `COPY backend/` → `/app`
   - `COPY --from=frontend-build dist` → `/usr/share/nginx/html`
   - Copy `nginx.conf`, `supervisord.conf`
   - `EXPOSE 80`
   - `CMD` supervisord (foreground)

### Context / ignore

- Root `.dockerignore` should exclude `node_modules`, `.git`, venvs, local DBs, Trellis noise, etc., while allowing `backend/` + `frontend/` sources.
- Existing per-package Dockerfiles can be removed or left unused; prefer **delete or document as obsolete** to avoid dual sources of truth. Recommendation: remove `backend/Dockerfile` + `frontend/Dockerfile` once root Dockerfile works, or replace them with a short pointer comment only if something external still references paths (release will stop using them).

## Runtime config

### Nginx

- `listen 80;` (container-internal; host maps 7743→80)
- `root /usr/share/nginx/html;`
- `location /` → SPA `try_files $uri $uri/ /index.html;`
- `location /api/` → `proxy_pass http://127.0.0.1:8000;` + standard forwarded headers
- `location /static/` → same proxy (backend StaticFiles + uploads)

### uvicorn

- Bind `127.0.0.1:8000` only (not published)
- Working dir `/app`, `DATABASE_URL=sqlite:///./data/subpilot.db`
- Ensure `/app/data` and `/app/static/logos` exist (entrypoint or lifespan already creates logos)

### Process manager (supervisord)

Programs:

1. `uvicorn app.main:app --host 127.0.0.1 --port 8000`
2. `nginx -g 'daemon off;'`

Both autorestart; supervisord as PID 1.

### Environment

| Var | Default / notes |
|-----|-----------------|
| `SECRET_KEY` | required in real deploy; compose may keep dev default |
| `DATABASE_URL` | `sqlite:///./data/subpilot.db` |
| `CORS_ORIGINS` | default `http://localhost:7743` |

Same-origin UI reduces CORS need, but keep setting for custom hostnames.

## Compose

```yaml
services:
  app:
    image: ghcr.io/maplumex/subpilot:${SUBPILOT_VERSION:-latest}
    build: .
    ports:
      - "7743:80"
    volumes:
      - subpilot-data:/app/data
    env_file:
      - path: .env
        required: false
    environment:
      - DATABASE_URL=sqlite:///./data/subpilot.db
      - SECRET_KEY=${SECRET_KEY:-dev-secret-change-in-production}
      - CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:7743}
    restart: unless-stopped

volumes:
  subpilot-data:
```

## Release / GHCR

- Image: `ghcr.io/<owner_lc>/subpilot`
- Tags: `{{version}}`, `{{major}}.{{minor}}`, `latest` (unchanged policy)
- **Stop** building/pushing `subpilot-backend` and `subpilot-frontend`
- Build context: repo root (`.`), not `./backend` / `./frontend`

## Docs migration

README should:

1. Show single-service deploy on port **7743**
2. List only `ghcr.io/maplumex/subpilot:...`
3. Short “Migrating from two images” note: one service, new port, old images no longer published
4. Keep local `make dev` section as dual-process

`.env.example`: default `CORS_ORIGINS=http://localhost:7743`

## Compatibility / rollback

- **Breaking** for anyone on dual-image compose (intentional; no dual-publish window)
- Rollback: redeploy previous dual-image tag pair from GHCR history if still present; new tags only publish single image
- Data: volume path `/app/data` stays compatible with backend-only volume usage

## Trade-offs

| Choice | Why |
|--------|-----|
| Nginx in image vs FastAPI SPA mount | User-selected A; matches prior production edge behavior |
| Host 7743 via `7743:80` | Conventional: Nginx listens 80 in-container; publish any host port |
| supervisord | Simple dual-process without s6 learning cost |
| Root Dockerfile | Needs both trees; compose `build: .` |

## Out of design scope

- TLS termination (expect reverse proxy outside if needed)
- Multi-arch matrix beyond current workflow behavior
- Changing app feature code
