import math
from typing import Optional
from fastapi import APIRouter, Query
from sqlalchemy import select, func

from app.api.deps import DBSession, CurrentAdmin
from app.models.user import User, UserRole, UserStatus
from app.models.booking import Booking, BookingStatus
from app.models.photographer import PhotographerProfile
from app.schemas.user import UserRead
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.booking_service import BookingService

router = APIRouter()


@router.get("/users", response_model=PaginatedResponse, summary="Admin: list all users")
async def admin_list_users(
    db: DBSession,
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: Optional[UserRole] = Query(default=None),
    status: Optional[UserStatus] = Query(default=None),
    search: Optional[str] = Query(default=None),
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    if search:
        query = query.where(
            User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.offset(offset).limit(page_size).order_by(User.created_at.desc())
    )
    items = result.scalars().all()
    read_items = [UserRead.model_validate(u) for u in items]

    return PaginatedResponse(
        items=read_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.patch(
    "/users/{user_id}/status",
    response_model=MessageResponse,
    summary="Moderate user (activate/deactivate)",
)
async def moderate_user(
    user_id: str, status: UserStatus, db: DBSession, _: CurrentAdmin
):
    import uuid
    from app.core.exceptions import NotFoundException

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User", user_id)
    user.status = status
    await db.flush()
    return MessageResponse(message=f"User status updated to {status.value}")


@router.delete(
    "/users/{user_id}", response_model=MessageResponse, summary="Admin: delete user"
)
async def delete_user(user_id: str, db: DBSession, _: CurrentAdmin):
    import uuid
    from app.core.exceptions import NotFoundException
    from app.models.photographer import PhotographerProfile

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User", user_id)

    await db.delete(user)
    await db.flush()
    return MessageResponse(message="User deleted successfully")


@router.get(
    "/bookings", response_model=PaginatedResponse, summary="Admin: list all bookings"
)
async def admin_list_bookings(
    db: DBSession,
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: Optional[BookingStatus] = Query(default=None),
):
    query = select(Booking)
    if status:
        query = query.where(Booking.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.offset(offset).limit(page_size).order_by(Booking.created_at.desc())
    )
    items = result.scalars().all()
    service = BookingService(db)
    read_items = await service.enrich_booking_reads(list(items))

    return PaginatedResponse(
        items=read_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.patch(
    "/photographers/{profile_id}/verify",
    response_model=MessageResponse,
    summary="Approve/reject photographer verification",
)
async def verify_photographer(
    profile_id: str, verified: bool, db: DBSession, _: CurrentAdmin
):
    import uuid
    from app.core.exceptions import NotFoundException

    result = await db.execute(
        select(PhotographerProfile).where(
            PhotographerProfile.id == uuid.UUID(profile_id)
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundException("Photographer profile", profile_id)
    profile.verified = verified
    await db.flush()
    action = "approved" if verified else "rejected/revoked"
    return MessageResponse(message=f"Photographer verification {action}")


@router.patch(
    "/photographers/{profile_id}/feature",
    response_model=MessageResponse,
    summary="Toggle featured status",
)
async def toggle_featured(profile_id: str, db: DBSession, _: CurrentAdmin):
    import uuid

    result = await db.execute(
        select(PhotographerProfile).where(
            PhotographerProfile.id == uuid.UUID(profile_id)
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        from app.core.exceptions import NotFoundException

        raise NotFoundException("Photographer profile", profile_id)
    profile.is_featured = not profile.is_featured
    await db.flush()
    status = "featured" if profile.is_featured else "unfeatured"
    return MessageResponse(message=f"Photographer marked as {status}")


@router.get("/stats", summary="Admin: platform statistics")
async def platform_stats(db: DBSession, _: CurrentAdmin):
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_photographers = (
        await db.execute(select(func.count(PhotographerProfile.id)))
    ).scalar_one()
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar_one()
    completed_bookings = (
        await db.execute(
            select(func.count(Booking.id)).where(
                Booking.status.in_(
                    [
                        BookingStatus.completed_by_client,
                        BookingStatus.completed_by_admin,
                    ]
                )
            )
        )
    ).scalar_one()

    return {
        "total_users": total_users,
        "total_photographers": total_photographers,
        "total_bookings": total_bookings,
        "completed_bookings": completed_bookings,
    }
