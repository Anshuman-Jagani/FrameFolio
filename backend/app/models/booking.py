from __future__ import annotations
from typing import Optional
import uuid
import enum
from datetime import datetime, date, timezone
from sqlalchemy import Float, ForeignKey, DateTime, Enum as SAEnum, Integer, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class BookingStatus(str, enum.Enum):
    requested = "requested"
    accepted = "accepted"
    rejected = "rejected"
    completed_by_client = "completed_by_client"
    completed_by_admin = "completed_by_admin"
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    photographer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("photographer_profiles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="bookingstatus"),
        nullable=False,
        default=BookingStatus.requested,
        index=True,
    )
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    advance_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    remaining_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="client_bookings")
    photographer = relationship("PhotographerProfile", backref="bookings")
    review = relationship("Review", back_populates="booking", uselist=False)

    def __repr__(self) -> str:
        return f"<Booking id={self.id} status={self.status}>"


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    photographer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("photographer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    booking = relationship("Booking", back_populates="review")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    photographer = relationship("PhotographerProfile", foreign_keys=[photographer_id])
