"""Add role visibility and calendar support.

Revision ID: 0004_role_visibility_calendar
Revises: 0003_milestone_6_order_flow
Create Date: 2026-05-27
"""

from pathlib import Path

from alembic import op


revision = "0004_role_visibility_calendar"
down_revision = "0003_milestone_6_order_flow"
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "migrations" / "0004_role_visibility_calendar.sql"
    op.execute(schema_path.read_text())


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_route_follow_requests_users_active;")
    op.execute("DROP INDEX IF EXISTS idx_route_follow_requests_order_active;")
    op.execute("DROP TABLE IF EXISTS route_follow_requests;")
    op.execute("DROP INDEX IF EXISTS idx_guide_availability_region_dates_active;")
    op.execute("DROP INDEX IF EXISTS idx_guide_availability_market_guide_active;")
    op.execute("DROP TABLE IF EXISTS guide_availability_windows;")
    op.execute(
        """
        ALTER TABLE travel_plans
          DROP COLUMN IF EXISTS partner_note,
          DROP COLUMN IF EXISTS looking_for_partner;
        """
    )
