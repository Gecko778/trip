"""Add auth refresh tokens and admin invitations.

Revision ID: 0002_auth_tokens_and_invitations
Revises: 0001_initial_schema
Create Date: 2026-05-23
"""

from pathlib import Path

from alembic import op


revision = "0002_auth_tokens_and_invitations"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "migrations" / "0002_auth_tokens_and_invitations.sql"
    op.execute(schema_path.read_text())


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS admin_invitations;")
    op.execute("DROP TABLE IF EXISTS auth_refresh_tokens;")
