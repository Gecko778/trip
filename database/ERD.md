# Travel Service Platform ERD

## Core Groups

### Market and Localisation

- `markets` is the top-level market boundary. `china_inbound` is seed data.
- `regions` stores country, province, city, district, airport, station, attraction, and custom service areas.
- `market_configs`, `market_policy_configs`, `payment_method_configs`, and `payment_provider_accounts` store market-specific operating rules.
- `currencies`, `locales`, `exchange_rates`, and `exchange_rate_snapshots` support display currency, payment currency, settlement currency, and historical price traceability.

### Identity and RBAC

- `users` stores account-level identity.
- `user_auth_identities` stores login identifiers such as email, phone, or OAuth provider IDs.
- `roles`, `permissions`, `role_permissions`, and `user_roles` implement scoped RBAC.
- `user_role_profiles`, `traveler_profiles`, and `guide_profiles` support one account switching between traveler and guide roles.
- `guide_service_regions` maps guide service coverage to regions.
- `guide_verifications` stores guide review state and audit-facing failure reasons.

### Travel Discovery

- `travel_plans` stores traveler demand.
- `itinerary_route_nodes` stores ordered route nodes under a travel plan.
- `destination_contents` stores city, attraction, recommendation, and review-photo content.

### Messaging and Safety

- `follow_relations` controls social relationship state.
- `message_threads` and `messages` store platform conversations.
- `user_blocks` supports blocking.
- `safety_profiles`, `safety_contacts`, and `safety_events` support emergency contacts, trip safety, and SOS events.

### Orders and Trust

- `service_orders` stores order drafts and later formal order lifecycle state.
- `anonymous_agreements` records pre-payment agreement signatures and breach events.
- `review_records` stores two-way reviews and destination content reviews.
- `notification_records` stores chat, order, agreement, refund, dispute, and risk notifications.

### Commercial and Payment Reservation

- `payment_records` stores payment attempts and amount breakdowns.
- `commission_policies` stores platform commission and service fee rules.
- `payout_accounts` stores guide settlement accounts.
- `payout_records` stores guide settlement outcomes.
- `membership_plans` and `membership_subscriptions` reserve membership monetisation.

### Admin, Disputes, and Audit

- `dispute_cases` stores refund, cancellation, breach, service-quality, and arbitration cases.
- `admin_work_items` is the operational queue for verification, reports, disputes, content review, and risk cases.
- `audit_logs` records state-changing actions.

## Important Relationships

```text
markets
  -> regions
  -> market_configs
  -> market_policy_configs
  -> payment_method_configs
  -> payment_provider_accounts

users
  -> user_auth_identities
  -> user_role_profiles
  -> traveler_profiles
  -> guide_profiles
  -> user_roles
  -> safety_profiles

guide_profiles
  -> guide_service_regions
  -> guide_verifications

travel_plans
  -> itinerary_route_nodes
  -> message_threads
  -> service_orders

message_threads
  -> messages

service_orders
  -> anonymous_agreements
  -> payment_records
  -> payout_records
  -> review_records
  -> dispute_cases
  -> notification_records

commission_policies
  -> payment_records
  -> payout_records

exchange_rate_snapshots
  -> service_orders
  -> payment_records
```

## Intentional Reservations

- Real payment provider integration is not implemented in Milestone 0.
- Actual commission percentages, refund exchange-rate rules, and membership benefits remain product decisions in `Plan.md`.
- Contact-risk detection is represented by risk fields and admin work items; the detector itself is backend logic for later milestones.
