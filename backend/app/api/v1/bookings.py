import uuid
from typing import Optional
from fastapi import APIRouter, Query, BackgroundTasks

from app.api.deps import DBSession, CurrentUser, CurrentClient
from app.models.booking import BookingStatus
from app.schemas.booking import (
    BookingCreate,
    BookingUpdate,
    BookingStatusUpdate,
    BookingRead,
    ReviewCreate,
    ReviewRead,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.booking_service import BookingService
from app.core.exceptions import ForbiddenException

router = APIRouter()


@router.post("", response_model=BookingRead, status_code=201, summary="Create a booking")
async def create_booking(
    data: BookingCreate, db: DBSession, current_user: CurrentClient, background_tasks: BackgroundTasks
):
    """Clients create booking requests for a photographer."""
    service = BookingService(db, background_tasks)
    return await service.create_booking(current_user, data)


@router.get("", response_model=PaginatedResponse, summary="List my bookings")
async def list_bookings(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: Optional[BookingStatus] = Query(default=None),
):
    """Returns bookings for the current user (client sees own; photographer sees theirs)."""
    service = BookingService(db)
    return await service.list_user_bookings(current_user, page, page_size, status)


@router.get("/{booking_id}", response_model=BookingRead, summary="Get booking detail")
async def get_booking(
    booking_id: uuid.UUID, db: DBSession, current_user: CurrentUser
):
    service = BookingService(db)
    booking = await service.get_or_404(booking_id)
    # Only participants and admins can view
    from app.models.user import UserRole
    if current_user.role != UserRole.admin:
        if current_user.id not in (booking.client_id,):
            from app.models.photographer import PhotographerProfile
            from sqlalchemy import select
            result = await db.execute(
                select(PhotographerProfile).where(
                    PhotographerProfile.user_id == current_user.id,
                    PhotographerProfile.id == booking.photographer_id,
                )
            )
            if not result.scalar_one_or_none():
                raise ForbiddenException()
    return await service.booking_to_read(booking)


@router.patch("/{booking_id}/status", response_model=BookingRead, summary="Update booking status")
async def update_booking_status(
    booking_id: uuid.UUID,
    data: BookingStatusUpdate,
    db: DBSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """State-machine: pending → confirmed → in_progress → completed. Cancellation allowed by each party."""
    service = BookingService(db, background_tasks)
    booking = await service.get_or_404(booking_id)
    updated = await service.update_status(booking, current_user, data)
    return await service.booking_to_read(updated)


@router.patch("/{booking_id}", response_model=BookingRead, summary="Update booking details")
async def update_booking(
    booking_id: uuid.UUID,
    data: BookingUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    service = BookingService(db)
    booking = await service.get_or_404(booking_id)
    if current_user.id != booking.client_id:
        raise ForbiddenException("Only the client can update booking details")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(booking, key, value)
    await db.flush()
    await db.refresh(booking)
    return booking


# ──────────────────────────────── Reviews ────────────────────────────────

@router.post("/reviews", response_model=ReviewRead, status_code=201, summary="Submit a review")
async def create_review(
    data: ReviewCreate, db: DBSession, current_user: CurrentClient
):
    """Clients can review photographers after a completed booking."""
    service = BookingService(db)
    return await service.create_review(current_user, data)
