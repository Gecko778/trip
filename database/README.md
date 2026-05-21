# Database Design

Milestone 0 owns the database contract for the Travel Service Platform.

The database is designed before backend API implementation so later FastAPI services can be built against a stable schema.

## Files

- `ERD.md`: domain groups, relationships, and table responsibilities.
- `migrations/0001_initial_schema.sql`: initial PostgreSQL schema.
- `seed_plan.md`: deterministic demo seed order and data scope.

## Design Rules

- Primary keys use UUID.
- Major business tables include `created_at`, `updated_at`, `created_by`, `updated_by`, and `deleted_at`.
- Market-scoped tables include `market_id` unless the row is global reference data.
- China inbound travel is seed data, not a hard-coded global rule.
- Payment, payout, commission, and membership tables are structural reservations only in Milestone 0.

## Verification

The initial schema was applied successfully to an empty temporary PostgreSQL 16 database.

Verified output:

- 45 base tables
- 14 enum types
- 85 total public indexes, including primary-key and unique-constraint indexes

Manual verification command:

```bash
psql "postgresql://trip:trip@localhost:5432/trip" \
  -v ON_ERROR_STOP=1 \
  -f database/migrations/0001_initial_schema.sql
```

Reference-data tables such as `currencies` and `locales` are intentionally global. Market-specific behaviour starts from `markets` and related configuration tables.
