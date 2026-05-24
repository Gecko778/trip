"""Add milestone 6 order flow fields.

Revision ID: 0003_milestone_6_order_flow
Revises: 0002_auth_tokens_and_invitations
Create Date: 2026-05-24
"""

from pathlib import Path

from alembic import op


revision = "0003_milestone_6_order_flow"
down_revision = "0002_auth_tokens_and_invitations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "migrations" / "0003_milestone_6_order_flow.sql"
    op.execute(schema_path.read_text())


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_review_records_order_reviewer_reviewee_active;")
    op.execute("DROP INDEX IF EXISTS idx_anonymous_agreements_order_active;")
    op.execute(
        """
        ALTER TABLE anonymous_agreements
          DROP COLUMN IF EXISTS breach_responsibility,
          DROP COLUMN IF EXISTS cancellation_policy,
          DROP COLUMN IF EXISTS price_currency,
          DROP COLUMN IF EXISTS price_amount,
          DROP COLUMN IF EXISTS service_region_id,
          DROP COLUMN IF EXISTS service_end_date,
          DROP COLUMN IF EXISTS service_start_date;
        """
    )
    op.execute(
        """
        ALTER TABLE service_orders
          DROP COLUMN IF EXISTS cancellation_penalty_note,
          DROP COLUMN IF EXISTS cancellation_penalty_applied,
          DROP COLUMN IF EXISTS cancellation_reason,
          DROP COLUMN IF EXISTS canceled_by_user_id,
          DROP COLUMN IF EXISTS canceled_at,
          DROP COLUMN IF EXISTS breach_responsibility,
          DROP COLUMN IF EXISTS cancellation_policy,
          DROP COLUMN IF EXISTS message_thread_id;
        """
    )
