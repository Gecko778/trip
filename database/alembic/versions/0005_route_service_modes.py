"""Add route and guide service mode fields.

Revision ID: 0005_route_service_modes
Revises: 0004_role_visibility_calendar
Create Date: 2026-05-27
"""

from alembic import op


revision = "0005_route_service_modes"
down_revision = "0004_role_visibility_calendar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE travel_plans
          ADD COLUMN IF NOT EXISTS guide_hiring_mode TEXT NOT NULL DEFAULT 'point_to_point';

        ALTER TABLE travel_plans
          DROP CONSTRAINT IF EXISTS chk_travel_plans_guide_hiring_mode;

        ALTER TABLE travel_plans
          ADD CONSTRAINT chk_travel_plans_guide_hiring_mode
          CHECK (guide_hiring_mode IN ('point_to_point', 'full_route'));

        ALTER TABLE itinerary_route_nodes
          ADD COLUMN IF NOT EXISTS place_name TEXT,
          ADD COLUMN IF NOT EXISTS looking_for_partner BOOLEAN NOT NULL DEFAULT false;

        ALTER TABLE guide_profiles
          ADD COLUMN IF NOT EXISTS service_scope_modes TEXT[] NOT NULL DEFAULT ARRAY['point_to_point']::TEXT[];

        ALTER TABLE guide_profiles
          DROP CONSTRAINT IF EXISTS chk_guide_profiles_service_scope_modes;

        ALTER TABLE guide_profiles
          ADD CONSTRAINT chk_guide_profiles_service_scope_modes
          CHECK (
            array_length(service_scope_modes, 1) >= 1
            AND service_scope_modes <@ ARRAY['point_to_point', 'full_route']::TEXT[]
          );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE guide_profiles
          DROP CONSTRAINT IF EXISTS chk_guide_profiles_service_scope_modes;
        ALTER TABLE guide_profiles
          DROP COLUMN IF EXISTS service_scope_modes;

        ALTER TABLE itinerary_route_nodes
          DROP COLUMN IF EXISTS looking_for_partner,
          DROP COLUMN IF EXISTS place_name;

        ALTER TABLE travel_plans
          DROP CONSTRAINT IF EXISTS chk_travel_plans_guide_hiring_mode;
        ALTER TABLE travel_plans
          DROP COLUMN IF EXISTS guide_hiring_mode;
        """
    )
