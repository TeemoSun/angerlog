import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

CATEGORIES = ("工作", "家庭", "交通", "社交", "其他")
BOTTLE_STYLES = ("A", "B", "C", "D", "E", "F", "G", "H", "classic")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "bottle_style IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'classic')",
            name="ck_users_bottle_style",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Shanghai")
    bottle_style: Mapped[str] = mapped_column(
        String(20), nullable=False, default="C", server_default="C"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    anger_logs: Mapped[list["AngerLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        Index("idx_refresh_user", "user_id"),
        Index("idx_refresh_expires", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class AngerLog(Base):
    __tablename__ = "anger_logs"
    __table_args__ = (
        CheckConstraint("intensity BETWEEN 1 AND 10", name="ck_anger_logs_intensity"),
        CheckConstraint(
            "category IN ('工作', '家庭', '交通', '社交', '其他') OR category IS NULL",
            name="ck_anger_logs_category",
        ),
        Index(
            "idx_logs_user_created",
            "user_id",
            "created_at",
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index("idx_logs_intensity", "intensity", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_logs_resolved", "is_resolved", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_logs_category", "category", postgresql_where=text("is_deleted = FALSE")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    trigger_reason: Mapped[str] = mapped_column(Text, nullable=False)
    intensity: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    resolution_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="anger_logs")
