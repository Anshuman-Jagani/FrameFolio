import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    photographer_id: uuid.UUID
    date: date
    total_amount: float
    advance_amount: float
    remaining_amount: float

    @field_validator("total_amount", "advance_amount", "remaining_amount")
    @classmethod
    def validate_amounts(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Amount cannot be negative")
        return v


class BookingUpdate(BaseModel):
    total_amount: Optional[float] = None
    advance_amount: Optional[float] = None
    remaining_amount: Optional[float] = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    photographer_id: uuid.UUID
    date: date
    status: BookingStatus
    total_amount: float
    advance_amount: float
    remaining_amount: float
    created_at: datetime
    updated_at: datetime
    # Populated in list/detail responses (not stored on the ORM row)
    client_name: Optional[str] = None
    photographer_name: Optional[str] = None


# ──────────────────────────────── Reviews ────────────────────────────────

class ReviewCreate(BaseModel):
    booking_id: uuid.UUID
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    reviewer_id: uuid.UUID
    photographer_id: uuid.UUID
    rating: int
    comment: Optional[str] = None
    created_at: datetime
