import uuid
from datetime import date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.exceptions import NotFoundException, ConflictException, ForbiddenException
from app.models.availability import Availability
from app.models.photographer import PhotographerProfile
from app.models.user import User
from app.schemas.availability import AvailabilityCreate, AvailabilityUpdate


class AvailabilityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_photographer_availabilities(
        self,
        photographer_id: uuid.UUID,
        from_date: date,
        to_date: date,
        is_booked: Optional[bool] = None,
    ) -> list[Availability]:
        query = select(Availability).where(
            Availability.photographer_id == photographer_id,
            Availability.date >= from_date,
            Availability.date <= to_date,
        ).order_by(Availability.date.asc())
        if is_booked is not None:
            query = query.where(Availability.is_booked == is_booked)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def set_availability(
        self, user: User, data: AvailabilityCreate
    ) -> list[Availability]:
        # Validate user is photographer
        result = await self.db.execute(
            select(PhotographerProfile).where(PhotographerProfile.user_id == user.id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise ForbiddenException("Only photographers can set availability")

        added_or_updated = []
        for d in data.dates:
            # Check if exists
            existing_result = await self.db.execute(
                select(Availability).where(
                    Availability.photographer_id == profile.id,
                    Availability.date == d
                )
            )
            existing = existing_result.scalar_one_or_none()

            if existing:
                # Update it
                existing.is_booked = data.is_booked
                added_or_updated.append(existing)
            else:
                # Create new
                avail = Availability(
                    photographer_id=profile.id,
                    date=d,
                    is_booked=data.is_booked
                )
                self.db.add(avail)
                added_or_updated.append(avail)

        await self.db.flush()
        # Refresh all
        for avail in added_or_updated:
            await self.db.refresh(avail)

        return added_or_updated
