from datetime import timedelta
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.core.exceptions import (
    UnauthorizedException,
    ConflictException,
    BadRequestException,
)
from app.models.user import User, UserRole, UserStatus, AuthProvider
from app.schemas.auth import Token, LoginRequest, RefreshTokenRequest, PasswordChangeRequest, GoogleLoginRequest
from app.schemas.user import UserCreate
from jose import JWTError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: UserCreate) -> User:
        # Check duplicate email
        result = await self.db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise ConflictException("A user with this email already exists")

        user = User(
            email=data.email,
            password_hash=get_password_hash(data.password),
            full_name=data.full_name,
            phone=data.phone,
            role=data.role,
            status=UserStatus.active,  # Auto-verify for now; swap with email flow
            auth_provider=AuthProvider.local,
            is_email_verified=True,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def login(self, data: LoginRequest) -> Token:
        result = await self.db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        if user.status == UserStatus.suspended:
            raise UnauthorizedException("Account is suspended")

        return Token(
            access_token=create_access_token(
                subject=str(user.id),
                role=user.role.value,
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            ),
            refresh_token=create_refresh_token(
                subject=str(user.id),
                role=user.role.value,
                expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            ),
        )

    async def refresh(self, data: RefreshTokenRequest) -> Token:
        try:
            payload = decode_token(data.refresh_token)
        except JWTError:
            raise UnauthorizedException("Invalid or expired refresh token")

        if payload.get("type") != "refresh":
            raise UnauthorizedException("Refresh token required")

        result = await self.db.execute(
            select(User).where(User.id == uuid.UUID(payload["sub"]))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise UnauthorizedException("User not found")

        return Token(
            access_token=create_access_token(
                subject=str(user.id),
                role=user.role.value,
            ),
            refresh_token=create_refresh_token(
                subject=str(user.id),
                role=user.role.value,
            ),
        )

    async def change_password(
        self, user: User, data: PasswordChangeRequest
    ) -> None:
        if not user.password_hash or not verify_password(data.current_password, user.password_hash):
            raise BadRequestException("Current password is incorrect")
        user.password_hash = get_password_hash(data.new_password)
        await self.db.flush()

    async def google_login(self, data: GoogleLoginRequest) -> Token:
        if not settings.GOOGLE_CLIENT_ID:
            raise BadRequestException("Google login is not configured on the server")
        
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                data.id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
            
            google_id = idinfo["sub"]
            email = idinfo.get("email")
            name = idinfo.get("name", "Google User")
            
            if not email:
                raise UnauthorizedException("Google token did not contain an email address")
            
        except ValueError:
            raise UnauthorizedException("Invalid Google token")
        
        # Check if user exists
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            # Link accounts implicitly if local
            if user.auth_provider == AuthProvider.local and not user.google_id:
                user.auth_provider = AuthProvider.google
                user.google_id = google_id
                await self.db.flush()
        else:
            # Create a brand new user
            user = User(
                email=email,
                password_hash=None,
                full_name=name,
                role=UserRole.client,
                status=UserStatus.active,
                auth_provider=AuthProvider.google,
                google_id=google_id,
                is_email_verified=True,
            )
            self.db.add(user)
            await self.db.flush()
            await self.db.refresh(user)

        # Generate tokens
        return Token(
            access_token=create_access_token(
                subject=str(user.id),
                role=user.role.value,
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            ),
            refresh_token=create_refresh_token(
                subject=str(user.id),
                role=user.role.value,
                expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            ),
        )
