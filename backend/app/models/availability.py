from __future__ import annotations
from typing import Optional
import uuid
from datetime import date, datetime, timezone
from sqlalchemy import Boolean, ForeignKey, DateTime, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Availability(Base):
    """Simple availability model (photographer_id, date, is_booked)."""

    __tablename__ = "availabilities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    photographer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("photographer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_booked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    photographer = relationship("PhotographerProfile", back_populates="availabilities")
    
    __table_args__ = (
        UniqueConstraint("photographer_id", "date", name="uix_photographer_date"),
    )

    def __repr__(self) -> str:
        return f"<Availability photographer={self.photographer_id} date={self.date} booked={self.is_booked}>"
