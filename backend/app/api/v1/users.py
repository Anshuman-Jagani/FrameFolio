import uuid
from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DBSession, CurrentUser, CurrentAdmin
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, AdminUserUpdate, UserPublic
from app.schemas.common import MessageResponse
from app.core.exceptions import NotFoundException

router = APIRouter()


@router.get("/me", response_model=UserRead, summary="Get own profile")
async def get_my_profile(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserRead, summary="Update own profile")
async def update_my_profile(
    data: UserUpdate, db: DBSession, current_user: CurrentUser
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserRead, summary="Get user by ID (admin)")
async def get_user(user_id: uuid.UUID, db: DBSession, _: CurrentAdmin):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User", user_id)
    return user


@router.get("/public/{user_id}", response_model=UserPublic, summary="Get public user info")
async def get_public_user(user_id: uuid.UUID, db: DBSession, _: CurrentUser):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User", user_id)
    return user


@router.patch("/{user_id}", response_model=UserRead, summary="Admin update user")
async def admin_update_user(
    user_id: uuid.UUID, data: AdminUserUpdate, db: DBSession, _: CurrentAdmin
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User", user_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return user
