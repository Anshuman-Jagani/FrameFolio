import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from app.models.user import UserRole, UserStatus, AuthProvider


# ──────────────────────────────── Base ────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


# ──────────────────────────────── Create ────────────────────────────────

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.client

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class PhotographerRegister(UserCreate):
    """Shorthand for registering specifically as a photographer."""
    role: UserRole = UserRole.photographer


# ──────────────────────────────── Update ────────────────────────────────

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_picture_url: Optional[str] = None


class AdminUserUpdate(UserUpdate):
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None
    is_email_verified: Optional[bool] = None


# ──────────────────────────────── Read ────────────────────────────────

class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: UserRole
    status: UserStatus
    auth_provider: AuthProvider
    google_id: Optional[str] = None
    is_email_verified: bool
    profile_picture_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UserPublic(BaseModel):
    """Minimal public user info (safe to expose in nested responses)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    profile_picture_url: Optional[str] = None
    role: UserRole
