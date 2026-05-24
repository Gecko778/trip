# Travel Service Platform

Market-aware travel guide platform for overseas travelers visiting China. `Plan.md` is the project source of truth.

## Current Status

The project is in Milestone 11 foundation work. The backend, frontend API layer, demo seed, local CI smoke flow, and Docker Compose wiring are available for local development.

Implemented core slices:

- FastAPI backend with standard response envelopes and trace ids.
- PostgreSQL schema managed by Alembic.
- Auth with email/password, JWT access/refresh tokens, `/auth/me`, role switching, and RBAC.
- Market, region, currency, payment config placeholders, traveler/guide profiles, guide verification.
- Travel plans, route nodes, message threads, greeting restriction, follow/block.
- Orders, independent traveler/guide confirmation, anonymous agreement signing, completion, reviews, notifications.
- Commerce placeholders for commission, payment records, payout accounts, membership, disputes, admin lists.
- React/Vite frontend API client, auth bootstrap, login/register, discovery, plans, messages, orders, agreement, notifications, guide verification, and admin basics.
- Stable demo seed and API smoke path.

Known deferred areas:

- Real Google/Apple/phone OAuth/SMS verification.
- Real payment providers, payouts, refunds, KYC/KYB, and exchange-rate provider integration.
- Full legal agreement copy, multilingual versions, and e-sign legal rules.
- Uploads for guide verification materials and evidence files.
- Email/Push providers, templates, retry policy, and notification preferences.
- Browser-level Playwright E2E and GitHub Actions CI.
- Recommendation ranking, map heat layers, true GIS routing, and complex moderation workflows.

## Requirements

- macOS or Linux shell
- Python 3.12
- Node.js compatible with the frontend package lock
- Docker Desktop for PostgreSQL / Compose workflows
- Local PostgreSQL on `127.0.0.1:5432` or Docker Compose PostgreSQL

## Developer Setup

From the repository root:

```bash
cd /Users/gecko/trip
```

Create and activate the Python environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e "backend[dev]"
```

Install frontend dependencies:

```bash
cd /Users/gecko/trip/frontend
npm install --legacy-peer-deps
```

Start PostgreSQL only if it is not already running:

```bash
cd /Users/gecko/trip
docker compose up -d postgres
```

Apply migrations and seed demo data:

```bash
cd /Users/gecko/trip
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip .venv/bin/alembic upgrade head
cd /Users/gecko/trip/backend
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip ../.venv/bin/python -m app.seed demo
```

Run the backend:

```bash
cd /Users/gecko/trip/backend
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip ../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Run the frontend:

```bash
cd /Users/gecko/trip/frontend
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1
```

Open:

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8000/health`

## Docker Compose

Compose includes PostgreSQL, Redis, MinIO, backend, and frontend. Backend startup runs migrations and demo seed.

```bash
cd /Users/gecko/trip
docker compose up --build
```

Useful endpoints:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- MinIO console: `http://127.0.0.1:9001`

Validate Compose syntax:

```bash
docker compose config --quiet
```

## Demo Accounts

All demo account passwords use:

```text
DemoPass123!
```

Seeded accounts:

- Traveler: `traveler1@trip.local`
- Guide: `guide1@trip.local`
- Reviewer: `reviewer@trip.local`
- Support: `support@trip.local`

Bootstrap system admin:

```text
email: admin@trip.local
password: ChangeMe123!
```

## Product Demo Flow

1. Log in as `traveler1@trip.local`.
2. Open plans and create/publish a China travel plan.
3. Open discovery and view seeded guide profiles.
4. Start a chat with a guide.
5. Create or open an order from the existing seeded order list.
6. Confirm price as traveler and itinerary as guide.
7. Sign the anonymous agreement after both sides confirm.
8. Complete the order and submit a review.
9. Check notifications and admin/reviewer basics with reviewer/support/admin accounts.

The automated API smoke test covers the main path:

```bash
cd /Users/gecko/trip
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip .venv/bin/python scripts/e2e_smoke.py
```

## Local CI

Run backend tests, frontend build, migrations, demo seed, and E2E smoke:

```bash
cd /Users/gecko/trip
DATABASE_URL=postgresql+psycopg://trip:trip@127.0.0.1:5432/trip scripts/local_ci.sh
```

Current expected result:

```text
Backend tests pass
Frontend build passes
Demo seed passes
E2E smoke passed: login -> plan -> guide -> chat -> order -> agreement
```

The frontend build may warn about chunk size. This is recorded in `Plan.md` and does not block the MVP demo.

## OAuth Configuration Notes

Google/Apple real token verification is intentionally not faked. If IDs are empty in `/Users/gecko/trip/.env`, OAuth login returns:

```text
未填写Google/Apple Id, bundle id，到 /Users/gecko/trip/.env 内填写完整id
```

Fill these later:

- `GOOGLE_OAUTH_CLIENT_ID`
- `APPLE_OAUTH_CLIENT_ID`
- `APPLE_OAUTH_BUNDLE_ID`
