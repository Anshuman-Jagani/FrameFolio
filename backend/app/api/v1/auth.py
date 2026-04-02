from fastapi import APIRouter
from app.api.deps import DBSession
from app.schemas.auth import Token, LoginRequest, RefreshTokenRequest, PasswordChangeRequest, GoogleLoginRequest
from app.schemas.user import UserCreate, UserRead
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService
from app.api.deps import CurrentUser

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=201, summary="Register a new user")
async def register(data: UserCreate, db: DBSession):
    """
    Register a new user account.
    - **email**: unique email address
    - **password**: min 8 chars, must contain a digit
    - **role**: client (default) | photographer | admin
    """
    service = AuthService(db)
    user = await service.register(data)
    return user


@router.post("/login", response_model=Token, summary="Obtain access + refresh tokens")
async def login(data: LoginRequest, db: DBSession):
    """Login with email/password and receive JWT tokens."""
    service = AuthService(db)
    return await service.login(data)


@router.post("/google", response_model=Token, summary="Google OAuth login/register")
async def google_login(data: GoogleLoginRequest, db: DBSession):
    """Verify Google ID token and return valid JWT matching the FrameFolio specs."""
    service = AuthService(db)
    return await service.google_login(data)


@router.post("/refresh", response_model=Token, summary="Refresh access token")
async def refresh_token(data: RefreshTokenRequest, db: DBSession):
    """Use the refresh token to get a new access token pair."""
    service = AuthService(db)
    return await service.refresh(data)


@router.post("/change-password", response_model=MessageResponse, summary="Change current user password")
async def change_password(
    data: PasswordChangeRequest, db: DBSession, current_user: CurrentUser
):
    """Authenticated endpoint to change own password."""
    service = AuthService(db)
    await service.change_password(current_user, data)
    return MessageResponse(message="Password changed successfully")


@router.get("/me", response_model=UserRead, summary="Get current user profile")
async def get_me(current_user: CurrentUser):
    """Returns the currently authenticated user's profile."""
    return current_user
