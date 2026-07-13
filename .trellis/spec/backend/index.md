# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

The backend is a FastAPI + SQLAlchemy (sync) + Alembic + APScheduler app. Code is organized by domain (models, schemas, services, routers). Notification settings endpoints are mounted under the auth router, and reminder sending runs as a subpackage-based scheduled service.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization, file layout, services subpackage | Filled |
| [Database Guidelines](./database-guidelines.md) | ORM patterns, queries, migrations, ack-marker pattern, per-user creds | Filled |
| [Error Handling](./error-handling.md) | Error types, handling strategies | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |
| [Logging Guidelines](./logging-guidelines.md) | Structured logging, log levels, what not to log | Filled |
| [Deploy Runtime](./deploy-runtime.md) | Single Docker image (Nginx + uvicorn), compose ports, SECRET_KEY, GHCR | Filled |

---

## How to Use These Guidelines

These docs describe how THIS backend works: actual conventions, real source files (paths cited inline), and the specific migration/ownership/ack-marker gotchas that have come up. Skim the relevant file before coding in an area.

---

**Language**: All documentation should be written in **English**.
