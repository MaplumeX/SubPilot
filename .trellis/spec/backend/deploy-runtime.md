# Deploy Runtime (Single Docker Image)

> Production packaging: one image runs Nginx + uvicorn. Local `make dev` stays split.

---

## 1. Scope / Trigger

Update this doc when changing:

- Root `Dockerfile`, `deploy/*`, `docker-compose.yml`, or GHCR release packaging
- Host/container port mapping or process orchestration
- Deploy-time env contracts (`SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_URL`)
- SPA edge routing (`/`, `/api/`, `/static/`)

Local dual-process development (`make dev`: API `:8000` + Vite `:5173`) is out of this deploy runtime contract.

---

## 2. Signatures

| Artifact | Contract |
|----------|----------|
| Image | `ghcr.io/<owner_lc>/subpilot:{version, major.minor, latest}` |
| Compose service | Single service name: `app` |
| Host port (default) | `7743` → container `80` (`ports: ["7743:80"]`) |
| Nginx | Container `listen 80`; serves SPA from `/usr/share/nginx/html` |
| uvicorn | `127.0.0.1:8000` only (not published) |
| Data volume | Named volume → `/app/data` (SQLite `DATABASE_URL=sqlite:///./data/subpilot.db`) |
| Logos volume | Named volume → `/app/static/logos` (user-uploaded / cached subscription logos; must persist across image updates) |
| Process manager | supervisord as PID 1 (`deploy/supervisord.conf`) |
| Release context | Repo root `.` (not `backend/` or `frontend/` alone) |

Obsolete (do not reintroduce):

- Images `subpilot-backend` / `subpilot-frontend`
- Dual-service compose (`backend` + `frontend`)
- Per-package `backend/Dockerfile` / `frontend/Dockerfile` as publish sources

---

## 3. Contracts

### Request path (browser → container)

```
Browser → host:7743 → Nginx:80
  /            → SPA (try_files → index.html)
  /api/        → proxy_pass http://127.0.0.1:8000
  /static/     → proxy_pass http://127.0.0.1:8000  (logos via FastAPI StaticFiles)
```

Frontend production client uses same-origin `baseURL: "/api/v1"` — do not hardcode a separate API host in the SPA for compose deploy.

### Environment

| Var | Required | Notes |
|-----|----------|--------|
| `SECRET_KEY` | **yes** | Compose uses `${SECRET_KEY:?...}`. Must not be `dev-secret-change-in-production` (Settings rejects it). |
| `DATABASE_URL` | default OK | Compose default `sqlite:///./data/subpilot.db` |
| `CORS_ORIGINS` | default OK | Default `http://localhost:7743`; set public origin if reverse-proxied under another host |

### Process startup order

1. supervisord starts `uvicorn` (priority 10).
2. `nginx` program runs `deploy/wait-for-uvicorn.sh`, which waits until TCP `127.0.0.1:8000` accepts, then `exec nginx -g 'daemon off;'`.
3. Healthcheck script `deploy/healthcheck.py` probes loopback `/api/v1/auth/me`; **401/403 = healthy**.

### Release

- Workflow builds/pushes **only** `subpilot`.
- Dual-image publish is discontinued; document migration in README, do not dual-track images.

---

## 4. Validation & Error Matrix

| Input / situation | Expected |
|-------------------|----------|
| Missing `SECRET_KEY` in env for compose | Compose fails interpolation (`:?` error) before start |
| `SECRET_KEY=dev-secret-change-in-production` | Container/process fails Settings validation at import |
| GET `/` | 200 SPA shell |
| GET SPA deep link e.g. `/login` | 200 (nginx `try_files` fallback) |
| GET `/api/v1/auth/me` unauthenticated | 401 via nginx → uvicorn |
| GET `/static/logos/...` | Proxied to uvicorn StaticFiles |
| uvicorn not ready yet | nginx not listening until wait script succeeds; external may reset briefly during cold start |
| HEALTHCHECK with broken multi-line `python -c` | Avoid — use `deploy/healthcheck.py` file |

---

## 5. Good / Base / Bad Cases

- **Good**: `.env` with long random `SECRET_KEY`, `docker compose up --build -d`, open `http://localhost:7743`, register/login works, volumes persist DB and logos.
- **Base**: Published image `SUBPILOT_VERSION=x.y.z docker compose up -d` with same env contract.
- **Bad**: Re-adding compose fallback `SECRET_KEY=dev-secret-change-in-production`; proxying to Docker DNS name `backend:8000` inside a single container; listening Nginx on host-specific 7743 inside the image; publishing dual GHCR images again.

---

## 6. Tests Required

- `docker compose build` succeeds from repo root.
- After `up`: curl SPA `/` → 200; `/api/v1/auth/me` → 401; SPA route refresh → 200.
- Empty/missing `SECRET_KEY` → compose config/up fails.
- Container health becomes `healthy` after start-period (healthcheck file, not inline escaped newlines).
- Optional: confirm no `subpilot-backend` / `subpilot-frontend` strings remain in release workflow.

---

## 7. Wrong vs Correct

#### Wrong — dual publish + insecure default

```yaml
services:
  backend:
    image: ghcr.io/example/subpilot-backend
    environment:
      - SECRET_KEY=${SECRET_KEY:-dev-secret-change-in-production}
  frontend:
    image: ghcr.io/example/subpilot-frontend
```

#### Correct — single app + required secret + 7743:80

```yaml
services:
  app:
    image: ghcr.io/example/subpilot:${SUBPILOT_VERSION:-latest}
    build: .
    ports:
      - "7743:80"
    environment:
      - SECRET_KEY=${SECRET_KEY:?Set SECRET_KEY in .env}
      - CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:7743}
```

#### Wrong — nginx proxies to old service DNS

```nginx
proxy_pass http://backend:8000;
```

#### Correct — loopback uvicorn in same container

```nginx
proxy_pass http://127.0.0.1:8000;
```

---

## Layout (repo)

```
Dockerfile                 # multi-stage: frontend-build → runtime
.dockerignore
deploy/
  nginx.conf               # listen 80; SPA + /api /static proxy
  supervisord.conf
  wait-for-uvicorn.sh
  healthcheck.py
docker-compose.yml         # single app service
```

---

## Code Review Checklist

- [ ] Only one GHCR image name in release workflow
- [ ] Compose maps host 7743 → container 80 (or documents intentional override)
- [ ] uvicorn bound to 127.0.0.1, not 0.0.0.0 published
- [ ] No `dev-secret-change-in-production` compose default
- [ ] nginx proxies `/api/` and `/static/` to loopback
- [ ] wait-for-uvicorn before nginx; healthcheck uses a real script file
- [ ] README migration notes for dual-image users
- [ ] Compose mounts a named volume at `/app/static/logos` so logos survive image updates
