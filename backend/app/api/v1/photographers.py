import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Query

from app.api.deps import DBSession, CurrentUser, CurrentPhotographer
from app.schemas.photographer import (
    PhotographerProfileCreate,
    PhotographerProfileUpdate,
    PhotographerProfileRead,
    PhotographerListItem,
    PortfolioItemCreate,
    PortfolioItemRead,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.photographer_service import PhotographerService

router = APIRouter()


@router.get("", response_model=PaginatedResponse, summary="List photographers")
async def list_photographers(
    db: DBSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    specialization: Optional[str] = Query(default=None),
    is_available: Optional[bool] = Query(default=None),
    is_featured: Optional[bool] = Query(default=None),
    date: Optional[date] = Query(default=None),
):
    """Public endpoint: browse and filter photographer profiles."""
    service = PhotographerService(db)
    return await service.list_photographers(
        page=page,
        page_size=page_size,
        search=search,
        location=location,
        min_price=min_price,
        max_price=max_price,
        specialization=specialization,
        is_available=is_available,
        is_featured=is_featured,
        available_on_date=date,
    )


@router.get("/me", response_model=PhotographerProfileRead, summary="Get my photographer profile")
async def get_my_profile(db: DBSession, current_user: CurrentPhotographer):
    service = PhotographerService(db)
    profile = await service.get_by_user_id(current_user.id)
    if not profile:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Photographer profile")
    return profile


@router.post("/me", response_model=PhotographerProfileRead, status_code=201, summary="Create photographer profile")
async def create_profile(
    data: PhotographerProfileCreate, db: DBSession, current_user: CurrentPhotographer
):
    service = PhotographerService(db)
    return await service.create_profile(current_user, data)


@router.patch("/me", response_model=PhotographerProfileRead, summary="Update my photographer profile")
async def update_profile(
    data: PhotographerProfileUpdate, db: DBSession, current_user: CurrentPhotographer
):
    service = PhotographerService(db)
    profile = await service.get_by_user_id(current_user.id)
    if not profile:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Photographer profile")
    return await service.update_profile(profile, data)


@router.get("/{profile_id}", response_model=PhotographerProfileRead, summary="Get photographer profile")
async def get_profile(profile_id: uuid.UUID, db: DBSession):
    """Public endpoint: view a single photographer profile."""
    service = PhotographerService(db)
    return await service.get_or_404(profile_id)


@router.post("/me/portfolio", response_model=PortfolioItemRead, status_code=201, summary="Add portfolio item (image or video)")
async def add_portfolio_item(
    data: PortfolioItemCreate, db: DBSession, current_user: CurrentPhotographer
):
    service = PhotographerService(db)
    profile = await service.get_by_user_id(current_user.id)
    if not profile:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Photographer profile")
    return await service.add_portfolio_item(profile, data)


@router.delete("/me/portfolio/{item_id}", response_model=MessageResponse, summary="Delete portfolio item")
async def delete_portfolio_item(
    item_id: uuid.UUID, db: DBSession, current_user: CurrentPhotographer
):
    service = PhotographerService(db)
    profile = await service.get_by_user_id(current_user.id)
    if not profile:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Photographer profile")
    await service.delete_portfolio_item(profile, item_id)
    return MessageResponse(message="Portfolio item deleted")


@router.get("/{profile_id}/portfolio", response_model=list[PortfolioItemRead], summary="Get portfolio for photographer")
async def get_portfolio(profile_id: uuid.UUID, db: DBSession):
    service = PhotographerService(db)
    await service.get_or_404(profile_id)
    return await service.get_portfolio(profile_id)
