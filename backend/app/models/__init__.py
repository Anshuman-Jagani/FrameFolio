"""
Central import for all models so Alembic autogenerate can discover them.
"""
from app.models.user import User, UserRole, UserStatus  # noqa: F401
from app.models.photographer import PhotographerProfile, PortfolioItem  # noqa: F401
from app.models.booking import Booking, Review, BookingStatus  # noqa: F401
from app.models.availability import Availability  # noqa: F401
from app.models.message import Message  # noqa: F401
