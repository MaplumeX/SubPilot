.PHONY: dev backend frontend install-backend install-frontend install

dev:
	@make -j2 backend frontend

backend:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend
