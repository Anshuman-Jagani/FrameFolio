from typing import Annotated, Optional, Any
import uuid
from fastapi import Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User, UserRole, UserStatus

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not credentials:
        raise UnauthorizedException("Bearer token required")
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")

    if payload.get("type") != "access":
        raise UnauthorizedException("Access token required")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedException("User not found")
    if user.status == UserStatus.suspended:
        raise ForbiddenException("Account is suspended")
    if user.status == UserStatus.inactive:
        raise ForbiddenException("Account is inactive")
    return user


# ──────────────────────────────── Role Guards ────────────────────────────────

async def require_client(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role not in (UserRole.client, UserRole.admin):
        raise ForbiddenException("Client access required")
    return current_user


async def require_photographer(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role not in (UserRole.photographer, UserRole.admin):
        raise ForbiddenException("Photographer access required")
    return current_user


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != UserRole.admin:
        raise ForbiddenException("Admin access required")
    return current_user


# ──────────────────────────────── Type aliases ────────────────────────────────

CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentClient = Annotated[User, Depends(require_client)]
CurrentPhotographer = Annotated[User, Depends(require_photographer)]
CurrentAdmin = Annotated[User, Depends(require_admin)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
