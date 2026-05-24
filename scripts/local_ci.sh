#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://trip:trip@127.0.0.1:5432/trip}"

cd "$ROOT_DIR"

echo "==> Backend tests"
"$ROOT_DIR/.venv/bin/python" -m pytest backend

echo "==> Frontend build"
npm --prefix frontend run build

echo "==> Database migrations"
"$ROOT_DIR/.venv/bin/alembic" upgrade head

echo "==> Demo seed"
(
  cd backend
  "$ROOT_DIR/.venv/bin/python" -m app.seed demo
)

echo "==> E2E smoke"
"$ROOT_DIR/.venv/bin/python" scripts/e2e_smoke.py

echo "Local CI passed"
