ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'paid_confirmed';
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'reserved';

ALTER TABLE travel_plans
  ADD COLUMN IF NOT EXISTS looking_for_partner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_note TEXT;

CREATE TABLE IF NOT EXISTS guide_availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  guide_user_id UUID NOT NULL REFERENCES users(id),
  region_id UUID REFERENCES regions(id),
  available_start_date DATE NOT NULL,
  available_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'paused', 'blocked')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  CHECK (available_end_date >= available_start_date)
);

CREATE INDEX IF NOT EXISTS idx_guide_availability_market_guide_active
  ON guide_availability_windows (market_id, guide_user_id, available_start_date, available_end_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guide_availability_region_dates_active
  ON guide_availability_windows (market_id, region_id, available_start_date, available_end_date)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS route_follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  order_id UUID NOT NULL REFERENCES service_orders(id),
  traveler_user_id UUID NOT NULL REFERENCES users(id),
  guide_user_id UUID NOT NULL REFERENCES users(id),
  next_region_id UUID REFERENCES regions(id),
  proposed_start_date DATE,
  proposed_end_date DATE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'traveler_shared', 'guide_requested', 'accepted', 'rejected', 'expired', 'cancelled')
  ),
  share_scope TEXT NOT NULL DEFAULT 'next_segment' CHECK (share_scope IN ('next_segment', 'selected_segments')),
  capability_check_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    capability_check_status IN ('pending', 'approved', 'rejected', 'manual_review')
  ),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  CHECK (proposed_end_date IS NULL OR proposed_start_date IS NULL OR proposed_end_date >= proposed_start_date)
);

CREATE INDEX IF NOT EXISTS idx_route_follow_requests_order_active
  ON route_follow_requests (order_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_route_follow_requests_users_active
  ON route_follow_requests (traveler_user_id, guide_user_id, status)
  WHERE deleted_at IS NULL;
