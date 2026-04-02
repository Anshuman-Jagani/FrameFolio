"""
Populate sample marketplace data for existing FrameFolio accounts (looked up by email).

Run from the backend directory (uses .env):
  .venv/bin/python -m scripts.seed_user_sample_data

Idempotent: safe to run multiple times; skips rows that already exist.
Does not read or store passwords.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.models.availability import Availability
from app.models.booking import Booking, BookingStatus, Review
from app.models.message import Message
from app.models.photographer import PhotographerProfile, PortfolioItem
from app.models.user import User, UserRole, UserStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Accounts you registered (emails only — no passwords in source control)
ADMIN_EMAIL = "Anshuman.r.1797@gmail.com"
PHOTOGRAPHER_EMAIL = "Anshumanjagani1@gmail.com"
CLIENT_EMAIL = "fourthfloorddu@gmail.com"


async def _user_by_email(session, email: str) -> User | None:
    result = await session.execute(
        select(User).where(func.lower(User.email) == email.lower().strip())
    )
    return result.scalar_one_or_none()


async def _ensure_photographer_profile(session, user: User) -> PhotographerProfile:
    result = await session.execute(
        select(PhotographerProfile).where(PhotographerProfile.user_id == user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Enrich if still sparse
        if not existing.description:
            existing.description = (
                "UAE-based photographer focused on weddings, portraits, and brand work. "
                "Natural light and editorial style."
            )
        if not existing.location:
            existing.location = "Dubai, UAE"
        if existing.price_per_day is None or existing.price_per_day == 0:
            existing.price_per_day = 3500.0
        if not existing.specializations:
            existing.specializations = "Wedding,Portrait,Corporate"
        existing.verified = True
        existing.is_featured = True
        existing.years_of_experience = existing.years_of_experience or 8
        existing.is_available = True
        if not user.full_name or user.full_name.strip() == user.email.split("@")[0]:
            user.full_name = "Anshuman Jagani Photography"
        return existing

    profile = PhotographerProfile(
        user_id=user.id,
        description=(
            "UAE-based photographer focused on weddings, portraits, and brand work. "
            "Natural light and editorial style."
        ),
        years_of_experience=8,
        price_per_day=3500.0,
        location="Dubai, UAE",
        specializations="Wedding,Portrait,Corporate",
        portfolio_url="https://www.framefolio.ae",
        instagram_url="https://instagram.com/example",
        verified=True,
        is_featured=True,
        is_available=True,
    )
    session.add(profile)
    await session.flush()
    if not user.full_name or user.full_name.strip() == user.email.split("@")[0]:
        user.full_name = "Anshuman Jagani Photography"
    logger.info("Created photographer profile for %s", user.email)
    return profile


async def _ensure_portfolio(session, profile_id: uuid.UUID) -> None:
    count_result = await session.execute(
        select(func.count()).select_from(PortfolioItem).where(
            PortfolioItem.photographer_id == profile_id
        )
    )
    if count_result.scalar_one() >= 2:
        return
    samples = [
        (
            "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
            "Wedding",
            "Beach ceremony — golden hour",
        ),
        (
            "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200&auto=format&fit=crop",
            "Portrait",
            "Editorial portrait session",
        ),
        (
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
            "Event",
            "Corporate gala coverage",
        ),
    ]
    for i, (url, category, caption) in enumerate(samples):
        exists = await session.execute(
            select(PortfolioItem).where(
                PortfolioItem.photographer_id == profile_id,
                PortfolioItem.media_url == url,
            )
        )
        if exists.scalar_one_or_none():
            continue
        session.add(
            PortfolioItem(
                photographer_id=profile_id,
                media_url=url,
                media_type="image",
                category=category,
                caption=caption,
                display_order=i,
            )
        )
    await session.flush()
    logger.info("Ensured portfolio items for profile %s", profile_id)


async def _ensure_availability(
    session, profile_id: uuid.UUID, day: date, is_booked: bool
) -> None:
    result = await session.execute(
        select(Availability).where(
            Availability.photographer_id == profile_id,
            Availability.date == day,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        row.is_booked = is_booked
        return
    session.add(
        Availability(
            photographer_id=profile_id,
            date=day,
            is_booked=is_booked,
        )
    )
    await session.flush()


async def _booking_exists(
    session, client_id: uuid.UUID, photographer_profile_id: uuid.UUID, day: date
) -> bool:
    r = await session.execute(
        select(Booking.id).where(
            Booking.client_id == client_id,
            Booking.photographer_id == photographer_profile_id,
            Booking.date == day,
        )
    )
    return r.scalar_one_or_none() is not None


async def _ensure_booking(
    session,
    *,
    client_id: uuid.UUID,
    photographer_profile_id: uuid.UUID,
    day: date,
    status: BookingStatus,
    total: float,
    advance: float,
    remaining: float,
) -> Booking | None:
    if await _booking_exists(session, client_id, photographer_profile_id, day):
        return None
    b = Booking(
        client_id=client_id,
        photographer_id=photographer_profile_id,
        date=day,
        status=status,
        total_amount=total,
        advance_amount=advance,
        remaining_amount=remaining,
    )
    session.add(b)
    await session.flush()
    await session.refresh(b)
    logger.info("Added booking %s on %s (%s)", b.id, day, status.value)
    return b


async def _ensure_review(
    session,
    booking_id: uuid.UUID,
    reviewer_id: uuid.UUID,
    photographer_profile_id: uuid.UUID,
) -> None:
    r = await session.execute(select(Review).where(Review.booking_id == booking_id))
    if r.scalar_one_or_none():
        return
    session.add(
        Review(
            booking_id=booking_id,
            reviewer_id=reviewer_id,
            photographer_id=photographer_profile_id,
            rating=5,
            comment="Wonderful experience — punctual, creative, and easy to work with.",
        )
    )
    prof = await session.get(PhotographerProfile, photographer_profile_id)
    if prof:
        prof.total_reviews = (prof.total_reviews or 0) + 1
        prof.rating = 5.0
    await session.flush()
    logger.info("Added review for booking %s", booking_id)


async def _ensure_messages(
    session, client_id: uuid.UUID, photographer_user_id: uuid.UUID
) -> None:
    r = await session.execute(
        select(func.count(Message.id)).where(
            Message.sender_id == client_id,
            Message.receiver_id == photographer_user_id,
        )
    )
    if r.scalar_one() > 0:
        return
    now = datetime.now(timezone.utc)
    session.add_all(
        [
            Message(
                sender_id=client_id,
                receiver_id=photographer_user_id,
                message=(
                    "Hi! I'm planning a half-day shoot in Dubai Marina next month. "
                    "Are you taking new bookings?"
                ),
                timestamp=now - timedelta(hours=5),
            ),
            Message(
                sender_id=photographer_user_id,
                receiver_id=client_id,
                message=(
                    "Hello — thanks for reaching out. Yes, I have openings. "
                    "Happy to share packages and a mood board."
                ),
                timestamp=now - timedelta(hours=4),
            ),
        ]
    )
    await session.flush()
    logger.info("Added sample messages between client and photographer")


async def seed() -> None:
    today = datetime.now(timezone.utc).date()

    async with AsyncSessionLocal() as session:
        admin = await _user_by_email(session, ADMIN_EMAIL)
        photographer_user = await _user_by_email(session, PHOTOGRAPHER_EMAIL)
        client = await _user_by_email(session, CLIENT_EMAIL)

        if not admin:
            raise SystemExit(f"User not found: {ADMIN_EMAIL}")
        if not photographer_user:
            raise SystemExit(f"User not found: {PHOTOGRAPHER_EMAIL}")
        if not client:
            raise SystemExit(f"User not found: {CLIENT_EMAIL}")

        if photographer_user.role != UserRole.photographer:
            logger.warning(
                "User %s has role %s (expected photographer). Continuing anyway.",
                PHOTOGRAPHER_EMAIL,
                photographer_user.role,
            )
        if client.role != UserRole.client:
            logger.warning(
                "User %s has role %s (expected client). Continuing anyway.",
                CLIENT_EMAIL,
                client.role,
            )

        admin.status = UserStatus.active
        if not admin.full_name or "admin" in admin.full_name.lower():
            admin.full_name = "Anshuman (Admin)"
        client.status = UserStatus.active
        if not client.full_name or "@" in (client.full_name or ""):
            client.full_name = "Sample Client"

        profile = await _ensure_photographer_profile(session, photographer_user)
        await _ensure_portfolio(session, profile.id)

        # Open calendar windows (next 21 days, not booked)
        for offset in range(3, 22, 2):
            d = today + timedelta(days=offset)
            await _ensure_availability(session, profile.id, d, is_booked=False)

        d_requested = today + timedelta(days=10)
        d_accepted = today + timedelta(days=17)
        d_completed = today - timedelta(days=45)
        d_rejected = today + timedelta(days=24)

        await _ensure_availability(session, profile.id, d_requested, is_booked=False)
        await _ensure_availability(session, profile.id, d_accepted, is_booked=True)

        await _ensure_booking(
            session,
            client_id=client.id,
            photographer_profile_id=profile.id,
            day=d_requested,
            status=BookingStatus.requested,
            total=5200.0,
            advance=1500.0,
            remaining=3700.0,
        )
        await _ensure_booking(
            session,
            client_id=client.id,
            photographer_profile_id=profile.id,
            day=d_accepted,
            status=BookingStatus.accepted,
            total=4800.0,
            advance=1200.0,
            remaining=3600.0,
        )
        await _ensure_booking(
            session,
            client_id=client.id,
            photographer_profile_id=profile.id,
            day=d_completed,
            status=BookingStatus.completed_by_client,
            total=4000.0,
            advance=1000.0,
            remaining=0.0,
        )
        await _ensure_booking(
            session,
            client_id=client.id,
            photographer_profile_id=profile.id,
            day=d_rejected,
            status=BookingStatus.rejected,
            total=3000.0,
            advance=0.0,
            remaining=3000.0,
        )

        done_row = await session.execute(
            select(Booking).where(
                Booking.client_id == client.id,
                Booking.photographer_id == profile.id,
                Booking.date == d_completed,
                Booking.status == BookingStatus.completed_by_client,
            )
        )
        booking_for_review = done_row.scalar_one_or_none()
        if booking_for_review:
            await _ensure_review(
                session,
                booking_id=booking_for_review.id,
                reviewer_id=client.id,
                photographer_profile_id=profile.id,
            )

        await _ensure_messages(session, client.id, photographer_user.id)

        profile.total_bookings = (
            await session.execute(
                select(func.count(Booking.id)).where(
                    Booking.photographer_id == profile.id
                )
            )
        ).scalar_one()

        await session.commit()
        logger.info("Sample data seed finished successfully.")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
