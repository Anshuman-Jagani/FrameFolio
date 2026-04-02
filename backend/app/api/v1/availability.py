import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import DBSession, CurrentPhotographer
from app.models.photographer import PhotographerProfile
from app.schemas.availability import AvailabilityRead, AvailabilityCreate
from app.services.availability_service import AvailabilityService

router = APIRouter()


@router.get("/me", response_model=list[AvailabilityRead], summary="Get current photographer availability")
async def get_my_availability(
    db: DBSession,
    current_user: CurrentPhotographer,
    from_date: Optional[date] = Query(
        default=None, description="Start date (YYYY-MM-DD); defaults to today (UTC)"
    ),
    to_date: Optional[date] = Query(
        default=None,
        description="End date (YYYY-MM-DD); defaults to 90 days after from_date",
    ),
    is_booked: Optional[bool] = Query(
        default=None,
        description="Filter by booked status; omit to return both open and booked days",
    ),
):
    today = datetime.now(timezone.utc).date()
    start = from_date or today
    end = to_date or (start + timedelta(days=90))
    result = await db.execute(
        select(PhotographerProfile).where(PhotographerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return []
    service = AvailabilityService(db)
    return await service.get_photographer_availabilities(
        profile.id, start, end, is_booked
    )


@router.get("/{photographer_id}", response_model=list[AvailabilityRead], summary="Get available dates for photographer")
async def get_availability(
    photographer_id: uuid.UUID,
    db: DBSession,
    from_date: Optional[date] = Query(
        default=None, description="Start date (YYYY-MM-DD); defaults to today (UTC)"
    ),
    to_date: Optional[date] = Query(
        default=None,
        description="End date (YYYY-MM-DD); defaults to 90 days after from_date",
    ),
    is_booked: bool = Query(False, description="Filter by booked status (defaults to False for available dates)"),
):
    today = datetime.now(timezone.utc).date()
    start = from_date or today
    end = to_date or (start + timedelta(days=90))
    service = AvailabilityService(db)
    return await service.get_photographer_availabilities(photographer_id, start, end, is_booked)


@router.post("/me", response_model=list[AvailabilityRead], summary="Set availability for multiple dates")
async def set_availability(
    data: AvailabilityCreate, db: DBSession, current_user: CurrentPhotographer
):
    service = AvailabilityService(db)
    return await service.set_availability(current_user, data)
