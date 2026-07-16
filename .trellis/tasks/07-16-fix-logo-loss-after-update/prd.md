# Fix subscription logo loss after docker image update

## Goal

Prevent user-uploaded / cached subscription logos from being wiped out when the Docker image is updated and the container is recreated. Today only `/app/data` is a persistent volume, while `/app/static/logos` lives in the container writable layer and is lost on every `docker compose up` with a new image.

## Requirements

- Mount `/app/static/logos` as a persistent Docker volume so logo files survive container recreation / image updates.
- Keep the existing behaviour for local development and first-run: `os.makedirs("static/logos", exist_ok=True)` in `backend/app/main.py` and `RUN mkdir -p /app/static/logos` in the Dockerfile still work when the volume is empty.
- Do not change the `/static/logos/{filename}` URL scheme stored in the database (`logo_url`).
- Do not introduce data migration for already-lost logos; they are unrecoverable. Document the one-time impact for existing deployments in README / deploy notes.

## Acceptance Criteria

- [ ] `docker-compose.yml` declares a persistent volume for `/app/static/logos`.
- [ ] After `docker compose down && docker compose up -d` with the same image, previously uploaded logos still render.
- [ ] After pulling a new image and `docker compose up -d`, previously uploaded logos still render (volume persists across image changes).
- [ ] Fresh deployment still starts cleanly (volume auto-created, `static/logos` writable by the app).
- [ ] README or deploy docs note the one-time loss of pre-existing logos for deployments upgrading from a version without the volume.

## Notes

- Root cause: `docker-compose.yml` only mounts `subpilot-data:/app/data`; `LOGOS_DIR` = `<backend root>/static/logos` is not persisted. DB rows still point at `/static/logos/{uuid}.png`, but files are gone after container recreation.
- Lightweight task; PRD-only.