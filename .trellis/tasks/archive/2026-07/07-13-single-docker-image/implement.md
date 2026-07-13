# Implement: Single Docker Image

## Ordered checklist

1. **Root build assets**
   - [ ] Add root `Dockerfile` (multi-stage: frontend-build → runtime with Python + nginx + supervisord)
   - [ ] Add root `.dockerignore`
   - [ ] Add deploy configs: `deploy/nginx.conf` (listen 80, proxy to 127.0.0.1:8000) and `deploy/supervisord.conf`
   - [ ] Optional tiny `deploy/entrypoint.sh` only if needed for dirs/permissions

2. **Compose & env**
   - [ ] Rewrite `docker-compose.yml` to single `app` service: image `ghcr.io/maplumex/subpilot`, `7743:80`, volume `/app/data`
   - [ ] Update `.env.example` defaults (`CORS_ORIGINS=http://localhost:7743`)

3. **Release**
   - [ ] Update `.github/workflows/release.yml` to one image `subpilot`; remove backend/frontend dual build-push

4. **Cleanup dual Dockerfiles**
   - [ ] Remove or obsolete `backend/Dockerfile`, `frontend/Dockerfile`, and unused package dockerignores if fully superseded
   - [ ] Remove or relocate `frontend/nginx.conf` if replaced by `deploy/nginx.conf` (avoid two live nginx sources)

5. **Docs**
   - [ ] Update `README.md`: single image, port 7743, migration from two images, GHCR name
   - [ ] Touch `CHANGELOG.md` Unreleased notes for deploy breaking change

6. **Local smoke**
   - [ ] `docker compose build`
   - [ ] `docker compose up -d` → open `http://localhost:7743`
   - [ ] Verify SPA load, `/api/v1` health/login path, SPA deep-link refresh, `/static` proxy path if easy
   - [ ] Confirm `make dev` still starts dual local processes (no regression)

## Validation commands

```bash
docker compose build
docker compose up -d
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:7743/
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:7743/api/v1/docs   # or openapi if mounted
# stop: docker compose down
make dev   # optional quick check that local split still works
```

## Risky files / rollback points

| File | Risk |
|------|------|
| Root `Dockerfile` | Wrong paths / missing nginx packages → container won't serve UI |
| `deploy/nginx.conf` | Wrong proxy target or port → API 502 |
| `docker-compose.yml` | Volume path mismatch → empty DB |
| `release.yml` | Wrong image name / context → broken publishes |
| Deleting package Dockerfiles | Only after root image proven |

Rollback: restore previous dual-service compose + package Dockerfiles from git; do not push a broken single-image tag as `latest` until smoke passes.

## Review gates before `task.py start`

- [x] `prd.md` decisions complete (A runtime, stop dual publish, image `subpilot`, port 7743)
- [x] `design.md` written
- [x] `implement.md` written
- [ ] User reviews artifacts
- [ ] `implement.jsonl` / `check.jsonl` curated
- [ ] Then `task.py start`

## Notes for implementer

- Do **not** change SPA `baseURL` or API routes.
- Prefer supervisord configs under `deploy/` so root stays tidy.
- Keep backend bind on loopback only.
- Image owner in docs can stay `maplumex`; workflow should keep dynamic `${OWNER_LC}` like today.
