# Travel Service Platform

This repository follows `Plan.md`.

## Current Milestone

Milestone 1 establishes the backend foundation on top of the Milestone 0 database schema.

Included:

- FastAPI project structure.
- Standard success and error envelopes.
- Trace id middleware.
- `/health` endpoint.
- PostgreSQL, Redis, MinIO, and backend Docker Compose services.
- Alembic wiring to the existing database migration.
- Pytest smoke tests.

## Backend Commands

Create and activate the project virtual environment before running backend commands:

```bash
cd /Users/gecko/trip
source .venv/bin/activate
```

Run tests:

```bash
cd /Users/gecko/trip/backend
pytest
```

Run the API locally:

```bash
cd /Users/gecko/trip/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Check health:

```bash
curl -i -H 'x-trace-id: local-check' http://127.0.0.1:8000/health
```

Validate Compose configuration:

```bash
cd /Users/gecko/trip
docker compose config --quiet
```

Check Alembic revision against a local database:

```bash
cd /Users/gecko/trip
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip alembic current
```

If the schema was applied manually before Alembic versioning, mark it without recreating tables:

```bash
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip alembic stamp head
```
