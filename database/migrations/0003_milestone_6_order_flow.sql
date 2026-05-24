ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'pending_both_confirm';
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'pending_guide_confirm';
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'pending_traveler_confirm';

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS message_thread_id UUID REFERENCES message_threads(id),
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS breach_responsibility TEXT,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_penalty_applied BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_penalty_note TEXT;

ALTER TABLE anonymous_agreements
  ADD COLUMN IF NOT EXISTS service_start_date DATE,
  ADD COLUMN IF NOT EXISTS service_end_date DATE,
  ADD COLUMN IF NOT EXISTS service_region_id UUID REFERENCES regions(id),
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS price_currency CHAR(3) REFERENCES currencies(code),
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS breach_responsibility TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_anonymous_agreements_order_active
  ON anonymous_agreements (order_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_records_order_reviewer_reviewee_active
  ON review_records (order_id, reviewer_user_id, reviewee_user_id)
  WHERE deleted_at IS NULL;
