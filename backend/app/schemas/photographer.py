import uuid
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, field_validator, model_validator


import enum


class MediaType(str, enum.Enum):
    image = "image"
    video = "video"


class PortfolioItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    media_url: str
    media_type: MediaType
    caption: Optional[str] = None
    category: Optional[str] = None
    display_order: int
    created_at: datetime


class PortfolioItemCreate(BaseModel):
    media_url: str
    media_type: MediaType = MediaType.image
    caption: Optional[str] = None
    category: Optional[str] = None
    display_order: int = 0


# ──────────────────────────────── Profile ────────────────────────────────


class PhotographerProfileBase(BaseModel):
    description: Optional[str] = None
    years_of_experience: Optional[int] = None
    price_per_day: Optional[float] = None
    portfolio_url: Optional[str] = None
    instagram_url: Optional[str] = None
    location: Optional[str] = None
    specializations: Optional[str] = None  # comma-separated
    services: Optional[str] = None  # comma-separated
    is_available: Optional[bool] = True


class PhotographerProfileCreate(PhotographerProfileBase):
    pass


class PhotographerProfileUpdate(PhotographerProfileBase):
    pass


class PhotographerProfileRead(PhotographerProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    rating: float
    total_reviews: int
    total_bookings: int
    verified: bool
    is_featured: bool
    created_at: datetime
    updated_at: datetime
    portfolio_items: List[PortfolioItemRead] = []
    specializations_list: List[str] = []

    # Nested user fields surfaced at profile level
    full_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    email: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def pull_user_fields(cls, data: Any) -> Any:
        """When hydrating from a SQLAlchemy ORM object, merge user-level fields."""
        if not hasattr(data, "__tablename__"):
            return data  # already a dict / Pydantic instance — skip
        user = getattr(data, "user", None)
        # We can't set attributes on frozen ORM objects, so return a dict instead
        return {
            **{c.key: getattr(data, c.key) for c in data.__class__.__table__.columns},
            "portfolio_items": getattr(data, "portfolio_items", []),
            "specializations_list": data.specializations_list
            if hasattr(data, "specializations_list")
            else [],
            "full_name": user.full_name if user else None,
            "profile_picture_url": user.profile_picture_url if user else None,
            "email": user.email if user else None,
        }


class PhotographerListItem(BaseModel):
    """Lightweight representation for list/search views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    location: Optional[str] = None
    price_per_day: Optional[float] = None
    rating: float
    total_reviews: int
    verified: bool
    is_featured: bool
    is_available: bool
    specializations_list: List[str] = []
