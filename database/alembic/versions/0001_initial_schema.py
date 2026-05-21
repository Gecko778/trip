"""Initial database schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-21
"""

from pathlib import Path

from alembic import op


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "migrations" / "0001_initial_schema.sql"
    op.execute(schema_path.read_text())


def downgrade() -> None:
    op.execute(
        """
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        """
    )
