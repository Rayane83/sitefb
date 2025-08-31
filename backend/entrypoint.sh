#!/usr/bin/env bash
set -e

# If a .env is mounted, load it
if [ -f /app/.env ]; then
  export $(grep -v '^#' /app/.env | xargs)
fi

# Run migrations
cd /app
alembic upgrade head || true

# Start server
exec uvicorn app.main:app --host 0.0.0.0 --port 8001