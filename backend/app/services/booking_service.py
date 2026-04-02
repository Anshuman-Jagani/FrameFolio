import uuid
import math
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.exceptions import (
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
)
from app.models.booking import Booking, Review, BookingStatus
from app.models.photographer import PhotographerProfile
from app.models.availability import Availability
from app.models.user import User
from app.core.config import settings
from app.schemas.booking import (
    BookingCreate,
    BookingRead,
    BookingStatusUpdate,
    ReviewCreate,
)
from app.schemas.common import PaginatedResponse
from app.services.email_service import EmailService


# ──────────────────────────────── Valid Transitions ────────────────────────────────

ALLOWED_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.requested: {
        BookingStatus.accepted,
        BookingStatus.rejected,
        BookingStatus.cancelled,
    },
    BookingStatus.accepted: {
        BookingStatus.completed_by_client,
        BookingStatus.completed_by_admin,
        BookingStatus.cancelled,
    },
    BookingStatus.rejected: set(),
    BookingStatus.completed_by_client: {BookingStatus.completed_by_admin},
    BookingStatus.completed_by_admin: set(),
    BookingStatus.cancelled: set(),
}


class BookingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def enrich_booking_reads(self, bookings: list[Booking]) -> list[BookingRead]:
        """Attach client and photographer display names for dashboard UIs."""
        if not bookings:
            return []
        client_ids = {b.client_id for b in bookings}
        profile_ids = {b.photographer_id for b in bookings}

        client_map: dict[uuid.UUID, str] = {}
        if client_ids:
            cr = await self.db.execute(select(User).where(User.id.in_(client_ids)))
            for u in cr.scalars().all():
                label = (u.full_name or u.email or "").strip()
                client_map[u.id] = label or str(u.id)[:8]

        ph_map: dict[uuid.UUID, str] = {}
        if profile_ids:
            pr = await self.db.execute(
                select(PhotographerProfile, User)
                .join(User, PhotographerProfile.user_id == User.id)
                .where(PhotographerProfile.id.in_(profile_ids))
            )
            for prof, usr in pr.all():
                label = (usr.full_name or usr.email or "").strip()
                ph_map[prof.id] = label or "Photographer"

        out: list[BookingRead] = []
        for b in bookings:
            base = BookingRead.model_validate(b)
            out.append(
                base.model_copy(
                    update={
                        "client_name": client_map.get(b.client_id),
                        "photographer_name": ph_map.get(b.photographer_id),
                    }
                )
            )
        return out

    async def booking_to_read(self, booking: Booking) -> BookingRead:
        reads = await self.enrich_booking_reads([booking])
        return reads[0]

    async def get_or_404(self, booking_id: uuid.UUID) -> Booking:
        result = await self.db.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise NotFoundException("Booking", booking_id)
        return booking

    async def create_booking(self, client: User, data: BookingCreate) -> Booking:
        result = await self.db.execute(
            select(PhotographerProfile).where(
                PhotographerProfile.id == data.photographer_id
            )
        )
        photographer = result.scalar_one_or_none()
        if not photographer:
            raise NotFoundException("Photographer")

        if data.date <= datetime.now(timezone.utc).date():
            raise BadRequestException("Booking must be scheduled in the future")

        # Global photographer availability gate.
        # If the photographer is not accepting enquiries, block all bookings.
        if not photographer.is_available:
            raise BadRequestException("Photographer is not accepting bookings")

        # 1. Validate availability: block only if row exists and is_booked; else allow with soft bypass
        avail_result = await self.db.execute(
            select(Availability).where(
                Availability.photographer_id == data.photographer_id,
                Availability.date == data.date
            )
        )
        availability = avail_result.scalar_one_or_none()
        if availability:
            if availability.is_booked:
                raise ConflictException("This date is already booked")
        else:
            if not photographer.is_available:
                raise BadRequestException(
                    "Photographer does not have availability set for this date"
                )
            availability = Availability(
                photographer_id=data.photographer_id,
                date=data.date,
                is_booked=False,
            )
            self.db.add(availability)
            await self.db.flush()

        # 4. Prevent double booking: same client requesting same date twice
        existing_booking_result = await self.db.execute(
            select(Booking).where(
                Booking.client_id == client.id,
                Booking.photographer_id == data.photographer_id,
                Booking.date == data.date,
                Booking.status.in_([BookingStatus.requested, BookingStatus.accepted])
            )
        )
        if existing_booking_result.scalar_one_or_none():
            raise ConflictException("You already have an active or requested booking for this date")

        booking = Booking(
            client_id=client.id,
            **data.model_dump(),
        )
        self.db.add(booking)
        await self.db.flush()
        await self.db.refresh(booking)

        # Notify photographer via email
        photographer_user_result = await self.db.execute(
            select(User).where(User.id == photographer.user_id)
        )
        photographer_user = photographer_user_result.scalar_one_or_none()
        if (
            photographer_user
            and photographer_user.email
            and settings.SMTP_USER
            and settings.SMTP_PASSWORD
        ):
            import asyncio

            asyncio.create_task(
                EmailService.send_booking_request_email(
                    photographer_email=photographer_user.email,
                    client_name=client.full_name or client.email,
                    date=str(data.date),
                )
            )

        return booking

    async def update_status(
        self,
        booking: Booking,
        current_user: User,
        data: BookingStatusUpdate,
    ) -> Booking:
        allowed = ALLOWED_TRANSITIONS.get(booking.status, set())
        if data.status not in allowed:
            raise BadRequestException(
                f"Cannot transition from '{booking.status}' to '{data.status}'"
            )

        # Permission checks
        is_client = current_user.id == booking.client_id
        ph_result = await self.db.execute(
            select(PhotographerProfile).where(
                PhotographerProfile.user_id == current_user.id,
                PhotographerProfile.id == booking.photographer_id,
            )
        )
        is_photographer = ph_result.scalar_one_or_none() is not None

        if data.status in {BookingStatus.accepted, BookingStatus.rejected} and not is_photographer:
            raise ForbiddenException("Only the photographer can accept or reject a booking")
        if data.status == BookingStatus.completed_by_client and not (is_client or is_photographer):
            raise ForbiddenException("Only the client or photographer can mark booking as completed")
        if data.status == BookingStatus.completed_by_admin and current_user.role.value != "admin":
            raise ForbiddenException("Only an admin can forcibly complete a booking")
        if data.status == BookingStatus.cancelled:
            if current_user.role.value == "admin":
                pass  # Admin override
            elif not (is_client or is_photographer):
                raise ForbiddenException("Only the client or photographer can cancel")
            else:
                booking_datetime = datetime.combine(booking.date, datetime.min.time()).replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                
                # If they are both for some strange reason, validate based on whichever role they are operating under...
                # We'll prioritize the stricter photographer bounds if they are the photographer for this booking
                if is_photographer:
                    if now > booking_datetime - timedelta(days=3):
                        raise BadRequestException("Photographer cannot cancel within 3 days of the scheduled date")
                elif is_client:
                    if now > booking_datetime - timedelta(hours=48):
                        raise BadRequestException("Client cannot cancel within 48 hours of the scheduled date")

        # Unlock availability if cancelled and currently accepted
        if data.status == BookingStatus.cancelled and booking.status == BookingStatus.accepted:
            avail_result = await self.db.execute(
                select(Availability).where(
                    Availability.photographer_id == booking.photographer_id,
                    Availability.date == booking.date
                )
            )
            availability = avail_result.scalar_one_or_none()
            if availability:
                availability.is_booked = False

        # Lock availability and prevent double bookings on acceptance
        if data.status == BookingStatus.accepted:
            avail_result = await self.db.execute(
                select(Availability).where(
                    Availability.photographer_id == booking.photographer_id,
                    Availability.date == booking.date
                )
            )
            availability = avail_result.scalar_one_or_none()
            if not availability:
                raise NotFoundException("Availability record missing for this date")
            if availability.is_booked:
                raise ConflictException("This date is already locked by another accepted request")
            
            # Lock it
            availability.is_booked = True
            
            # Prevent double booking globally: Auto-reject all other pending requests for this exact date
            other_bookings_result = await self.db.execute(
                select(Booking).where(
                    Booking.photographer_id == booking.photographer_id,
                    Booking.date == booking.date,
                    Booking.status == BookingStatus.requested,
                    Booking.id != booking.id
                )
            )
            other_bookings = other_bookings_result.scalars().all()
            for other_booking in other_bookings:
                other_booking.status = BookingStatus.rejected

        booking.status = data.status

        await self.db.flush()
        await self.db.refresh(booking)

        # Handle Email Notifications via fire-and-forget
        if data.status in {BookingStatus.accepted, BookingStatus.completed_by_client, BookingStatus.completed_by_admin}:
            client_user_result = await self.db.execute(select(User).where(User.id == booking.client_id))
            client_user = client_user_result.scalar_one_or_none()
            
            photographer_result = await self.db.execute(select(PhotographerProfile).where(PhotographerProfile.id == booking.photographer_id))
            photographer_profile = photographer_result.scalar_one_or_none()
            photographer_name = "your photographer"
            
            if photographer_profile:
                ph_user_result = await self.db.execute(select(User).where(User.id == photographer_profile.user_id))
                ph_user = ph_user_result.scalar_one_or_none()
                if ph_user:
                    photographer_name = ph_user.full_name or "your photographer"

            if (
                client_user
                and client_user.email
                and settings.SMTP_USER
                and settings.SMTP_PASSWORD
            ):
                import asyncio

                if data.status == BookingStatus.accepted:
                    asyncio.create_task(
                        EmailService.send_booking_accepted_email(
                            client_email=client_user.email,
                            photographer_name=photographer_name,
                            date=str(booking.date),
                        )
                    )
                elif data.status in {
                    BookingStatus.completed_by_client,
                    BookingStatus.completed_by_admin,
                }:
                    asyncio.create_task(
                        EmailService.send_booking_completed_email(
                            client_email=client_user.email,
                            photographer_name=photographer_name,
                        )
                    )

        return booking

    async def list_user_bookings(
        self,
        user: User,
        page: int = 1,
        page_size: int = 20,
        status: Optional[BookingStatus] = None,
    ) -> PaginatedResponse:
        if user.role.value == "client":
            base_filter = Booking.client_id == user.id
        else:
            result = await self.db.execute(
                select(PhotographerProfile).where(PhotographerProfile.user_id == user.id)
            )
            profile = result.scalar_one_or_none()
            if not profile:
                return PaginatedResponse(items=[], total=0, page=page, page_size=page_size, pages=0)
            base_filter = Booking.photographer_id == profile.id

        query = select(Booking).where(base_filter)
        if status:
            query = query.where(Booking.status == status)

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        offset = (page - 1) * page_size
        result = await self.db.execute(
            query.offset(offset).limit(page_size).order_by(Booking.date.desc())
        )
        items = result.scalars().all()
        read_items = await self.enrich_booking_reads(list(items))

        return PaginatedResponse(
            items=read_items,
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if total else 0,
        )

    async def create_review(self, reviewer: User, data: ReviewCreate) -> Review:
        result = await self.db.execute(
            select(Booking).where(Booking.id == data.booking_id)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise NotFoundException("Booking", data.booking_id)
        if booking.client_id != reviewer.id:
            raise ForbiddenException("You can only review your own bookings")
            
        if booking.status not in {BookingStatus.completed_by_client, BookingStatus.completed_by_admin}:
            raise BadRequestException("Can only review completed bookings")

        existing = await self.db.execute(
            select(Review).where(Review.booking_id == data.booking_id)
        )
        if existing.scalar_one_or_none():
            raise ConflictException("Review already exists for this booking")

        review = Review(
            booking_id=data.booking_id,
            reviewer_id=reviewer.id,
            photographer_id=booking.photographer_id,
            rating=data.rating,
            comment=data.comment,
        )
        self.db.add(review)
        await self.db.flush()

        avg_result = await self.db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(
                Review.photographer_id == booking.photographer_id
            )
        )
        avg_rating, count = avg_result.one()
        profile_result = await self.db.execute(
            select(PhotographerProfile).where(
                PhotographerProfile.id == booking.photographer_id
            )
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.rating = round(float(avg_rating or 0), 2)
            profile.total_reviews = count or 0

        await self.db.flush()
        await self.db.refresh(review)
        return review
