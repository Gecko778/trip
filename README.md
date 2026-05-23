# Travel Service Platform

This repository follows `Plan.md`.

## Current Milestone

Milestone 2 is in progress. The current implemented slice establishes market reference data and read-only market configuration APIs.

Included:

- FastAPI project structure.
- Standard success and error envelopes.
- Trace id middleware.
- `/health` endpoint.
- PostgreSQL, Redis, MinIO, and backend Docker Compose services.
- Alembic wiring to the existing database migration.
- Pytest smoke tests.
- `china_inbound` demo seed.
- Read-only market, region, currency, and payment method endpoints.
- Email/password and phone/password registration and login.
- JWT access/refresh tokens with refresh token revocation on logout.
- `/api/v1/auth/me`.
- Seeded `sys_admin` bootstrap account.
- Admin invitation create/accept flow for market admins, reviewers, and support users.
- Traveler / guide role switching through `/api/v1/me/role-switch`.
- User listing, user detail, and role assignment APIs protected by RBAC.
- User update API protected by RBAC.
- Region create and detail APIs protected by RBAC and market scope checks.
- Market config write API protected by RBAC and market scope checks.
- Exchange rate quote API with identity-currency fallback.
- Google/Apple OAuth API contract placeholder.
- Traveler and guide profile create/read/update APIs.
- Basic onboarding status APIs.
- Guide verification submit/read APIs.
- Basic guide verification review API protected by RBAC and market scope checks.
- Travel plan create/read/update/publish/archive APIs.
- Itinerary route node create/read/update/delete APIs.
- Market-scoped travel plan listing with basic private-plan protection.

Not implemented yet:

- Real Google/Apple provider token verification.
- Full guide verification material upload, per-material review, appeal workflow, and review queue.
- Guide listing rules for verified/unverified profiles.
- Full travel plan visibility semantics for public/guides_only/travelers_only/private.
- Map heat layers, recommendation content APIs, and search ranking algorithms.
- Email delivery for admin invitations.

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

Seed local demo data:

```bash
cd /Users/gecko/trip/backend
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip python -m app.seed
```

The demo seed creates a local bootstrap system admin:

```text
email: admin@trip.local
password: ChangeMe123!
```

Run auth smoke checks:

```bash
curl -s http://127.0.0.1:8000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"provider":"email","identifier":"admin@trip.local","password":"ChangeMe123!"}'

curl -s http://127.0.0.1:8000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"provider":"phone","identifier":"+447700900123","password":"PhonePass123!","display_name":"Phone Traveler"}'
```

If Google/Apple ids are still empty in `/Users/gecko/trip/.env`, OAuth login returns:

```text
未填写Google/Apple Id, bundle id，到 /Users/gecko/trip/.env 内填写完整id
```

Check market APIs:

```bash
curl -s -H 'x-trace-id: market-check' http://127.0.0.1:8000/api/v1/markets
curl -s -H 'x-trace-id: market-check' http://127.0.0.1:8000/api/v1/markets/00000000-0000-0000-0000-000000000100/config
curl -s -H 'x-trace-id: market-check' http://127.0.0.1:8000/api/v1/markets/00000000-0000-0000-0000-000000000100/regions
curl -s -H 'x-trace-id: market-check' http://127.0.0.1:8000/api/v1/markets/00000000-0000-0000-0000-000000000100/payment-methods
curl -s -H 'x-trace-id: market-check' 'http://127.0.0.1:8000/api/v1/markets/00000000-0000-0000-0000-000000000100/exchange-rates/quote?source_currency=CNY&target_currency=CNY&amount=100'
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
