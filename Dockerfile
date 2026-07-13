# Multi-stage: frontend SPA build + single runtime (Nginx + uvicorn)
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/wait-for-uvicorn.sh /usr/local/bin/wait-for-uvicorn.sh
COPY deploy/healthcheck.py /usr/local/bin/healthcheck.py

RUN mkdir -p /app/data /app/static/logos \
    && chmod -R a+rX /usr/share/nginx/html \
    && chmod +x /usr/local/bin/wait-for-uvicorn.sh

ENV DATABASE_URL=sqlite:///./data/subpilot.db
EXPOSE 80

# 401/403 from /auth/me means the API is up (auth required).
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD ["python", "/usr/local/bin/healthcheck.py"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
