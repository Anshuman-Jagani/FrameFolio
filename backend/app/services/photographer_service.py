import uuid
import math
from datetime import date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, exists
from sqlalchemy.orm import selectinload, contains_eager

from app.models.availability import Availability

from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException, BadRequestException
from app.models.photographer import PhotographerProfile, PortfolioItem
from app.models.user import User
from app.schemas.photographer import (
    PhotographerProfileCreate,
    PhotographerProfileUpdate,
    PhotographerListItem,
    PhotographerProfileRead,
    PortfolioItemCreate,
)
from app.schemas.common import PaginatedResponse


class PhotographerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_404(self, profile_id: uuid.UUID) -> PhotographerProfile:
        result = await self.db.execute(
            select(PhotographerProfile)
            .options(
                selectinload(PhotographerProfile.portfolio_items),
                selectinload(PhotographerProfile.user),
            )
            .where(PhotographerProfile.id == profile_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise NotFoundException("Photographer profile", profile_id)
        return profile

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[PhotographerProfile]:
        result = await self.db.execute(
            select(PhotographerProfile)
            .options(selectinload(PhotographerProfile.portfolio_items))
            .where(PhotographerProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_profile(
        self, user: User, data: PhotographerProfileCreate
    ) -> PhotographerProfile:
        existing = await self.get_by_user_id(user.id)
        if existing:
            raise ConflictException("Photographer profile already exists for this user")

        profile = PhotographerProfile(user_id=user.id, **data.model_dump())
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def update_profile(
        self, profile: PhotographerProfile, data: PhotographerProfileUpdate
    ) -> PhotographerProfile:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(profile, key, value)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def list_photographers(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        location: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        specialization: Optional[str] = None,
        is_available: Optional[bool] = None,
        is_featured: Optional[bool] = None,
        available_on_date: Optional[date] = None,
    ) -> PaginatedResponse:
        query = select(PhotographerProfile).join(
            User, PhotographerProfile.user_id == User.id
        )

        if search:
            query = query.where(
                or_(
                    User.full_name.ilike(f"%{search}%"),
                    PhotographerProfile.description.ilike(f"%{search}%"),
                    PhotographerProfile.location.ilike(f"%{search}%"),
                )
            )
        if location:
            query = query.where(PhotographerProfile.location.ilike(f"%{location}%"))
        if min_price is not None:
            query = query.where(PhotographerProfile.price_per_day >= min_price)
        if max_price is not None:
            query = query.where(PhotographerProfile.price_per_day <= max_price)
        if specialization:
            query = query.where(
                PhotographerProfile.specializations.ilike(f"%{specialization}%")
            )
        if is_available is not None:
            query = query.where(PhotographerProfile.is_available == is_available)
        if is_featured is not None:
            query = query.where(PhotographerProfile.is_featured == is_featured)

        if available_on_date:
            # Subquery to check if the photographer is booked on the given date
            # We exclude them if ANY Availability record for that date says is_booked=True
            booked_exists = select(Availability.id).where(
                Availability.photographer_id == PhotographerProfile.id,
                Availability.date == available_on_date,
                Availability.is_booked == True
            )
            query = query.where(~exists(booked_exists))

        # Count total
        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        # Paginate — eager-load user so we can access full_name / profile_picture_url
        offset = (page - 1) * page_size
        result = await self.db.execute(
            query
            .options(contains_eager(PhotographerProfile.user))
            .offset(offset)
            .limit(page_size)
            .order_by(
                PhotographerProfile.is_featured.desc(),
                PhotographerProfile.rating.desc(),
            )
        )
        profiles = result.scalars().all()

        # Convert to PhotographerListItem by merging profile + user fields
        items = []
        for p in profiles:
            specializations_list = (
                [s.strip() for s in p.specializations.split(",") if s.strip()]
                if p.specializations
                else []
            )
            item = PhotographerListItem(
                id=p.id,
                user_id=p.user_id,
                full_name=p.user.full_name if p.user else None,
                profile_picture_url=p.user.profile_picture_url if p.user else None,
                location=p.location,
                price_per_day=p.price_per_day,
                rating=p.rating,
                total_reviews=p.total_reviews,
                verified=p.verified,
                is_featured=p.is_featured,
                is_available=p.is_available,
                specializations_list=specializations_list,
            )
            items.append(item)

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if total else 0,
        )

    async def add_portfolio_item(
        self, profile: PhotographerProfile, data: PortfolioItemCreate
    ) -> PortfolioItem:
        # Check limits
        query = select(func.count()).select_from(PortfolioItem).where(
            PortfolioItem.photographer_id == profile.id,
            PortfolioItem.media_type == data.media_type.value
        )
        count_result = await self.db.execute(query)
        current_count = count_result.scalar_one()

        if data.media_type.value == "image" and current_count >= 10:
            raise BadRequestException("Maximum limit of 10 portfolio images reached")
        elif data.media_type.value == "video" and current_count >= 3:
            raise BadRequestException("Maximum limit of 3 portfolio videos reached")

        item = PortfolioItem(photographer_id=profile.id, media_type=data.media_type.value, **data.model_dump(exclude={"media_type"}))
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def delete_portfolio_item(
        self, profile: PhotographerProfile, item_id: uuid.UUID
    ) -> None:
        result = await self.db.execute(
            select(PortfolioItem).where(
                PortfolioItem.id == item_id,
                PortfolioItem.photographer_id == profile.id,
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            raise NotFoundException("Portfolio item", item_id)
        await self.db.delete(item)

    async def get_portfolio(
        self, profile_id: uuid.UUID
    ) -> list[PortfolioItem]:
        result = await self.db.execute(
            select(PortfolioItem)
            .where(PortfolioItem.photographer_id == profile_id)
            .order_by(PortfolioItem.display_order.asc(), PortfolioItem.created_at.desc())
        )
        return list(result.scalars().all())
