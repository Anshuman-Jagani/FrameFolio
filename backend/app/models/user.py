from __future__ import annotations
from typing import Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class UserRole(str, enum.Enum):
    client = "client"
    photographer = "photographer"
    admin = "admin"


class UserStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"
    pending_verification = "pending_verification"


class AuthProvider(str, enum.Enum):
    local = "local"
    google = "google"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="userrole"), nullable=False, default=UserRole.client
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="userstatus"),
        nullable=False,
        default=UserStatus.pending_verification,
    )
    auth_provider: Mapped[AuthProvider] = mapped_column(
        SAEnum(AuthProvider, name="authprovider"), nullable=False, default=AuthProvider.local
    )
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    is_email_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
