"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("timezone", sa.String(50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_refresh_user", "refresh_tokens", ["user_id"])
    op.create_index("idx_refresh_expires", "refresh_tokens", ["expires_at"])

    op.create_table(
        "anger_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trigger_reason", sa.Text(), nullable=False),
        sa.Column("intensity", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(20), nullable=True),
        sa.Column("is_resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolution_method", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "category IN ('工作', '家庭', '交通', '社交', '其他') OR category IS NULL",
            name="ck_anger_logs_category",
        ),
        sa.CheckConstraint("intensity BETWEEN 1 AND 10", name="ck_anger_logs_intensity"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "idx_logs_user_created",
        "anger_logs",
        ["user_id", "created_at"],
        postgresql_where=sa.text("is_deleted = FALSE"),
    )
    op.create_index(
        "idx_logs_intensity",
        "anger_logs",
        ["intensity"],
        postgresql_where=sa.text("is_deleted = FALSE"),
    )
    op.create_index(
        "idx_logs_resolved",
        "anger_logs",
        ["is_resolved"],
        postgresql_where=sa.text("is_deleted = FALSE"),
    )
    op.create_index(
        "idx_logs_category",
        "anger_logs",
        ["category"],
        postgresql_where=sa.text("is_deleted = FALSE"),
    )


def downgrade() -> None:
    op.drop_table("anger_logs")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
