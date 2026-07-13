# Single-image runtime notes (Nginx + uvicorn)

## Chosen shape

- One image: `ghcr.io/<owner>/subpilot`
- Host publish port: **7743**
- Container edge: **Nginx listens on 80** (compose `7743:80` — conventional; host port is independent of container listen port)
- App process: **uvicorn on 127.0.0.1:8000** (not published)
- SPA: built `frontend/dist` served by Nginx
- API + logos: Nginx proxies `/api/` and `/static/` to loopback uvicorn

## Multi-process options (pick simple)

| Option | Pros | Cons |
|--------|------|------|
| shell entrypoint (`uvicorn &` + `nginx -g daemon off;`) | minimal deps | weak signal handling / zombie risk if naive |
| **supervisord** | simple, common, restarts | extra package |
| s6-overlay | production-grade | heavier learning curve |

**Recommendation for this repo size: supervisord** (or a carefully written entrypoint that `exec`s nginx as PID 1 and traps signals to kill uvicorn). Prefer supervisord for predictable dual-process restarts.

## Build layout

Multi-stage Dockerfile at **repo root** (needs both `frontend/` and `backend/` contexts):

1. `frontend-build`: Node build → `/app/dist`
2. `runtime`: Python slim + nginx + supervisord
   - install backend deps
   - copy backend app
   - copy SPA dist → `/usr/share/nginx/html`
   - copy nginx.conf + supervisord.conf + entrypoint if any

## Nginx config deltas vs current `frontend/nginx.conf`

Current:

```
listen 80;
proxy_pass http://backend:8000;
```

New:

```
listen 80;
proxy_pass http://127.0.0.1:8000;
```

Keep SPA `try_files` and `/api/` + `/static/` locations.

## CORS

Same-origin browser access via `http://localhost:7743` means CORS is largely irrelevant for the SPA, but login from that origin still benefits from default:

```
CORS_ORIGINS=http://localhost:7743
```

Keep configurable for reverse-proxy / custom domains.

## Compose

Single service:

```yaml
services:
  app:
    image: ghcr.io/maplumex/subpilot:${SUBPILOT_VERSION:-latest}
    build: .
    ports:
      - "7743:80"
    volumes:
      - subpilot-data:/app/data
    env_file: .env (optional)
    environment:
      DATABASE_URL: sqlite:///./data/subpilot.db
      SECRET_KEY: ...
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:7743}
```

Backend working directory remains `/app` so `./data` volume path stays familiar.

## Release

- Drop dual image build/push steps
- One metadata + one build-push for `subpilot`
- README migration: replace two services with one; note old images no longer published

## What not to change

- Local `make dev` (8000 + 5173)
- API routes / SPA client `baseURL: "/api/v1"`
- SQLite schema
