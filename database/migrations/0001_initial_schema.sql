CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE status_enum AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'locked', 'active', 'inactive', 'archived');
CREATE TYPE market_status_enum AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE user_role_enum AS ENUM ('traveler', 'guide', 'admin', 'reviewer', 'support');
CREATE TYPE visibility_enum AS ENUM ('public', 'guides_only', 'travelers_only', 'private');
CREATE TYPE order_status_enum AS ENUM ('draft', 'pending_traveler_price_confirm', 'pending_guide_itinerary_confirm', 'pending_agreement', 'pending_payment', 'confirmed', 'in_service', 'completed', 'pending_review', 'cancelled', 'disputed', 'closed');
CREATE TYPE payment_status_enum AS ENUM ('not_required', 'pending', 'paid', 'refunded', 'partially_refunded', 'failed', 'disputed');
CREATE TYPE agreement_status_enum AS ENUM ('draft', 'pending_sign', 'signed', 'broken', 'voided');
CREATE TYPE verification_status_enum AS ENUM ('not_started', 'pending', 'approved', 'rejected', 'expired');
CREATE TYPE notification_type_enum AS ENUM ('chat', 'system', 'order', 'agreement', 'refund', 'dispute', 'account_risk', 'announcement');
CREATE TYPE risk_level_enum AS ENUM ('none', 'low', 'medium', 'high', 'blocked');
CREATE TYPE region_type_enum AS ENUM ('country', 'province', 'city', 'district', 'airport', 'station', 'attraction', 'custom');
CREATE TYPE auth_provider_enum AS ENUM ('email', 'phone', 'oauth');
CREATE TYPE message_sender_type_enum AS ENUM ('user', 'system');
CREATE TYPE gender_enum AS ENUM ('unknown', 'female', 'male', 'non_binary', 'prefer_not_to_say');

CREATE TABLE currencies (
  code CHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locales (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  preferred_locale TEXT REFERENCES locales(code),
  preferred_currency CHAR(3) REFERENCES currencies(code),
  risk_level risk_level_enum NOT NULL DEFAULT 'none',
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status market_status_enum NOT NULL DEFAULT 'draft',
  default_country_code CHAR(2) NOT NULL,
  default_locale TEXT NOT NULL REFERENCES locales(code),
  default_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  timezone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  parent_id UUID REFERENCES regions(id),
  type region_type_enum NOT NULL,
  country_code CHAR(2) NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  localized_names JSONB NOT NULL DEFAULT '{}'::jsonb,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  timezone TEXT,
  status status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (market_id, code)
);

CREATE TABLE region_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id),
  alias TEXT NOT NULL,
  locale TEXT REFERENCES locales(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (region_id, alias)
);

CREATE TABLE market_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL UNIQUE REFERENCES markets(id),
  supported_locales TEXT[] NOT NULL DEFAULT '{}',
  supported_display_currencies CHAR(3)[] NOT NULL DEFAULT '{}',
  default_search_region_id UUID REFERENCES regions(id),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE market_policy_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  policy_type TEXT NOT NULL,
  policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (market_id, policy_type)
);

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  target_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  provider TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_currency, target_currency, provider, observed_at)
);

CREATE TABLE payment_method_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  method_code TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  supported_country_codes CHAR(2)[] NOT NULL DEFAULT '{}',
  supported_currencies CHAR(3)[] NOT NULL DEFAULT '{}',
  applies_to_user_roles user_role_enum[] NOT NULL DEFAULT '{}',
  applies_to_side TEXT NOT NULL,
  fee_rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  settlement_cycle TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (market_id, method_code, provider_code)
);

CREATE TABLE payment_provider_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  provider_code TEXT NOT NULL,
  merchant_account_ref TEXT NOT NULL,
  capabilities_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (market_id, provider_code, merchant_account_ref)
);

CREATE TABLE user_auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider auth_provider_enum NOT NULL,
  identifier TEXT NOT NULL,
  password_hash TEXT,
  provider_user_id TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (provider, identifier)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  market_id UUID REFERENCES markets(id),
  region_id UUID REFERENCES regions(id),
  scope_type TEXT NOT NULL DEFAULT 'global',
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_role_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role user_role_enum NOT NULL,
  market_id UUID REFERENCES markets(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  onboarding_status status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, role, market_id)
);

CREATE TABLE traveler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  preference_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, market_id)
);

CREATE TABLE guide_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  country_code CHAR(2) NOT NULL,
  home_region_id UUID NOT NULL REFERENCES regions(id),
  daily_price_amount NUMERIC(12,2) NOT NULL CHECK (daily_price_amount >= 0),
  quote_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  offers_pickup BOOLEAN NOT NULL DEFAULT false,
  gender gender_enum NOT NULL DEFAULT 'unknown',
  birth_year SMALLINT,
  language_tags TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3,2),
  reputation_status status_enum NOT NULL DEFAULT 'draft',
  verification_status verification_status_enum NOT NULL DEFAULT 'not_started',
  completed_order_count INTEGER NOT NULL DEFAULT 0,
  cancellation_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  breach_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  average_response_seconds INTEGER,
  badge_status status_enum NOT NULL DEFAULT 'draft',
  is_listed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, market_id)
);

CREATE TABLE guide_service_regions (
  guide_profile_id UUID NOT NULL REFERENCES guide_profiles(id),
  region_id UUID NOT NULL REFERENCES regions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guide_profile_id, region_id)
);

CREATE TABLE guide_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_profile_id UUID NOT NULL REFERENCES guide_profiles(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  identity_status verification_status_enum NOT NULL DEFAULT 'not_started',
  qualification_status verification_status_enum NOT NULL DEFAULT 'not_started',
  real_avatar_status verification_status_enum NOT NULL DEFAULT 'not_started',
  service_region_status verification_status_enum NOT NULL DEFAULT 'not_started',
  language_status verification_status_enum NOT NULL DEFAULT 'not_started',
  badge_status status_enum NOT NULL DEFAULT 'draft',
  failure_reason TEXT,
  appeal_status status_enum NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE travel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  traveler_user_id UUID NOT NULL REFERENCES users(id),
  country_code CHAR(2) NOT NULL,
  arrival_date DATE NOT NULL,
  arrival_region_id UUID REFERENCES regions(id),
  needs_pickup BOOLEAN NOT NULL DEFAULT false,
  traveler_count INTEGER NOT NULL CHECK (traveler_count > 0),
  budget_min_amount NUMERIC(12,2),
  budget_max_amount NUMERIC(12,2),
  budget_currency CHAR(3) REFERENCES currencies(code),
  visibility visibility_enum NOT NULL DEFAULT 'guides_only',
  status status_enum NOT NULL DEFAULT 'draft',
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE itinerary_route_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_plan_id UUID NOT NULL REFERENCES travel_plans(id),
  region_id UUID REFERENCES regions(id),
  sequence INTEGER NOT NULL,
  planned_start_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (travel_plan_id, sequence)
);

CREATE TABLE destination_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  region_id UUID NOT NULL REFERENCES regions(id),
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3,2),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE follow_relations (
  follower_user_id UUID NOT NULL REFERENCES users(id),
  followed_user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID REFERENCES markets(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (follower_user_id, followed_user_id)
);

CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  initiator_user_id UUID NOT NULL REFERENCES users(id),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  travel_plan_id UUID REFERENCES travel_plans(id),
  order_id UUID,
  is_mutual_follow BOOLEAN NOT NULL DEFAULT false,
  greeting_sent BOOLEAN NOT NULL DEFAULT false,
  recipient_replied BOOLEAN NOT NULL DEFAULT false,
  restriction_status TEXT NOT NULL DEFAULT 'greeting_allowed',
  contact_risk_detected BOOLEAN NOT NULL DEFAULT false,
  risk_level risk_level_enum NOT NULL DEFAULT 'none',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id),
  sender_user_id UUID REFERENCES users(id),
  sender_type message_sender_type_enum NOT NULL DEFAULT 'user',
  body TEXT NOT NULL,
  contact_risk_detected BOOLEAN NOT NULL DEFAULT false,
  risk_level risk_level_enum NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_blocks (
  blocker_user_id UUID NOT NULL REFERENCES users(id),
  blocked_user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID REFERENCES markets(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (blocker_user_id, blocked_user_id)
);

CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  traveler_user_id UUID NOT NULL REFERENCES users(id),
  guide_user_id UUID NOT NULL REFERENCES users(id),
  travel_plan_id UUID REFERENCES travel_plans(id),
  guide_price_amount NUMERIC(12,2) NOT NULL CHECK (guide_price_amount >= 0),
  guide_price_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  traveler_display_amount NUMERIC(12,2),
  traveler_display_currency CHAR(3) REFERENCES currencies(code),
  exchange_rate_snapshot_id UUID,
  service_start_date DATE,
  service_end_date DATE,
  service_region_id UUID REFERENCES regions(id),
  needs_pickup BOOLEAN NOT NULL DEFAULT false,
  traveler_count INTEGER NOT NULL CHECK (traveler_count > 0),
  traveler_price_confirmed_at TIMESTAMPTZ,
  guide_itinerary_confirmed_at TIMESTAMPTZ,
  status order_status_enum NOT NULL DEFAULT 'draft',
  payment_status payment_status_enum NOT NULL DEFAULT 'not_required',
  refund_status status_enum NOT NULL DEFAULT 'draft',
  dispute_status status_enum NOT NULL DEFAULT 'draft',
  itinerary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE message_threads ADD CONSTRAINT fk_message_threads_order FOREIGN KEY (order_id) REFERENCES service_orders(id);

CREATE TABLE exchange_rate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  source_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  target_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  provider TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  usage_context TEXT NOT NULL,
  order_id UUID REFERENCES service_orders(id),
  payment_record_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service_orders ADD CONSTRAINT fk_service_orders_exchange_rate_snapshot FOREIGN KEY (exchange_rate_snapshot_id) REFERENCES exchange_rate_snapshots(id);

CREATE TABLE anonymous_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  traveler_user_id UUID NOT NULL REFERENCES users(id),
  guide_user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL REFERENCES service_orders(id),
  agreement_version TEXT NOT NULL,
  status agreement_status_enum NOT NULL DEFAULT 'draft',
  traveler_signed_at TIMESTAMPTZ,
  guide_signed_at TIMESTAMPTZ,
  breached_at TIMESTAMPTZ,
  breach_reason TEXT,
  reputation_effect_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE commission_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  service_type TEXT NOT NULL,
  commission_type TEXT NOT NULL,
  commission_rate NUMERIC(6,5),
  fixed_service_fee_amount NUMERIC(12,2),
  currency_code CHAR(3) REFERENCES currencies(code),
  min_fee_amount NUMERIC(12,2),
  max_fee_amount NUMERIC(12,2),
  membership_discount_enabled BOOLEAN NOT NULL DEFAULT false,
  status status_enum NOT NULL DEFAULT 'draft',
  effective_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES service_orders(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  provider_code TEXT,
  merchant_account_id UUID REFERENCES payment_provider_accounts(id),
  payment_method_code TEXT,
  payment_type TEXT NOT NULL,
  deposit_amount NUMERIC(12,2),
  full_amount NUMERIC(12,2),
  platform_commission_amount NUMERIC(12,2),
  platform_service_fee_amount NUMERIC(12,2),
  guide_quote_amount NUMERIC(12,2),
  guide_quote_currency CHAR(3) REFERENCES currencies(code),
  traveler_display_amount NUMERIC(12,2),
  traveler_display_currency CHAR(3) REFERENCES currencies(code),
  paid_amount NUMERIC(12,2),
  paid_currency CHAR(3) REFERENCES currencies(code),
  guide_settlement_amount NUMERIC(12,2),
  guide_settlement_currency CHAR(3) REFERENCES currencies(code),
  exchange_rate_snapshot_id UUID REFERENCES exchange_rate_snapshots(id),
  commission_policy_id UUID REFERENCES commission_policies(id),
  channel TEXT,
  payment_country_code CHAR(2),
  escrow_status status_enum NOT NULL DEFAULT 'draft',
  split_status status_enum NOT NULL DEFAULT 'draft',
  guide_payout_status status_enum NOT NULL DEFAULT 'draft',
  refund_status status_enum NOT NULL DEFAULT 'draft',
  transaction_status payment_status_enum NOT NULL DEFAULT 'pending',
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE exchange_rate_snapshots ADD CONSTRAINT fk_exchange_rate_snapshots_payment_record FOREIGN KEY (payment_record_id) REFERENCES payment_records(id);

CREATE TABLE payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  account_type TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  account_reference TEXT,
  verification_status verification_status_enum NOT NULL DEFAULT 'not_started',
  kyc_status verification_status_enum NOT NULL DEFAULT 'not_started',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE payout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES service_orders(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  guide_user_id UUID NOT NULL REFERENCES users(id),
  payout_account_id UUID REFERENCES payout_accounts(id),
  commission_policy_id UUID REFERENCES commission_policies(id),
  platform_commission_amount NUMERIC(12,2),
  platform_service_fee_amount NUMERIC(12,2),
  guide_settlement_amount NUMERIC(12,2) NOT NULL,
  settlement_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  provider_code TEXT,
  status status_enum NOT NULL DEFAULT 'draft',
  settled_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  code TEXT NOT NULL,
  member_role user_role_enum NOT NULL,
  billing_period TEXT NOT NULL,
  price_amount NUMERIC(12,2) NOT NULL CHECK (price_amount >= 0),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  benefits_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (market_id, code)
);

CREATE TABLE membership_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  status status_enum NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE review_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  order_id UUID REFERENCES service_orders(id),
  reviewer_user_id UUID NOT NULL REFERENCES users(id),
  reviewee_user_id UUID REFERENCES users(id),
  region_id UUID REFERENCES regions(id),
  dimensions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rating NUMERIC(3,2),
  body TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  dispute_status status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE notification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type notification_type_enum NOT NULL,
  related_order_id UUID REFERENCES service_orders(id),
  related_thread_id UUID REFERENCES message_threads(id),
  related_agreement_id UUID REFERENCES anonymous_agreements(id),
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE safety_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID REFERENCES markets(id),
  location_sharing_enabled BOOLEAN NOT NULL DEFAULT false,
  risk_alert_status status_enum NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, market_id)
);

CREATE TABLE safety_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_profile_id UUID NOT NULL REFERENCES safety_profiles(id),
  name TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  relation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES service_orders(id),
  event_type TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dispute_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  order_id UUID REFERENCES service_orders(id),
  raised_by_user_id UUID NOT NULL REFERENCES users(id),
  dispute_type TEXT NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status status_enum NOT NULL DEFAULT 'draft',
  arbitration_result TEXT,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE admin_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id),
  work_item_type TEXT NOT NULL,
  related_user_id UUID REFERENCES users(id),
  related_order_id UUID REFERENCES service_orders(id),
  related_content_id UUID,
  assignee_user_id UUID REFERENCES users(id),
  status status_enum NOT NULL DEFAULT 'draft',
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id),
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_json JSONB,
  after_json JSONB,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regions_market_parent ON regions (market_id, parent_id);
CREATE INDEX idx_market_configs_market ON market_configs (market_id);
CREATE INDEX idx_payment_method_configs_market ON payment_method_configs (market_id, is_enabled);
CREATE INDEX idx_user_roles_user_scope ON user_roles (user_id, scope_type, scope_id);
CREATE INDEX idx_traveler_profiles_market ON traveler_profiles (market_id);
CREATE INDEX idx_guide_profiles_market_region ON guide_profiles (market_id, home_region_id);
CREATE INDEX idx_guide_service_regions_region ON guide_service_regions (region_id);
CREATE INDEX idx_travel_plans_market_status ON travel_plans (market_id, status);
CREATE INDEX idx_itinerary_route_nodes_plan ON itinerary_route_nodes (travel_plan_id, sequence);
CREATE INDEX idx_destination_contents_market_region ON destination_contents (market_id, region_id, status);
CREATE INDEX idx_message_threads_users ON message_threads (market_id, initiator_user_id, recipient_user_id);
CREATE INDEX idx_messages_thread_created ON messages (thread_id, created_at);
CREATE INDEX idx_service_orders_market_status ON service_orders (market_id, status);
CREATE INDEX idx_service_orders_users ON service_orders (traveler_user_id, guide_user_id);
CREATE INDEX idx_anonymous_agreements_order ON anonymous_agreements (order_id);
CREATE INDEX idx_payment_records_order ON payment_records (order_id);
CREATE INDEX idx_payout_records_order ON payout_records (order_id);
CREATE INDEX idx_review_records_order ON review_records (order_id);
CREATE INDEX idx_notification_records_user_read ON notification_records (user_id, read_at);
CREATE INDEX idx_dispute_cases_market_status ON dispute_cases (market_id, status);
CREATE INDEX idx_admin_work_items_market_status ON admin_work_items (market_id, status);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, created_at);
