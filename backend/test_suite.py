"""
FrameFolio Backend Test Suite — Expanded
Coverage: Booking, Cancellation, Availability, Reviews, Email, Messages, Edge Cases
Run: .venv/bin/python -m pytest test_suite.py -v
"""
import asyncio
import uuid
import unittest
import smtplib
from datetime import datetime, timezone, timedelta, date
from unittest.mock import AsyncMock, MagicMock, patch, call

from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus, Review
from app.models.availability import Availability
from app.models.photographer import PhotographerProfile
from app.schemas.booking import BookingCreate, BookingStatusUpdate, ReviewCreate
from app.core.exceptions import (
    ForbiddenException, ConflictException, BadRequestException, NotFoundException
)
from app.services.booking_service import BookingService, ALLOWED_TRANSITIONS
from app.services.availability_service import AvailabilityService
from app.services.email_service import EmailService
from app.services.message_service import MessageService
from app.schemas.message import MessageCreate
from app.schemas.availability import AvailabilityCreate


# ─── Helpers ──────────────────────────────────────────────────────────────────

def future_date(days: int = 10) -> date:
    return (datetime.now(timezone.utc) + timedelta(days=days)).date()

def past_date(days: int = 2) -> date:
    return (datetime.now(timezone.utc) - timedelta(days=days)).date()

def today() -> date:
    return datetime.now(timezone.utc).date()

def make_client(uid=None):
    u = User()
    u.id = uid or uuid.uuid4()
    u.email = "client@test.com"
    u.full_name = "Test Client"
    u.role = UserRole.client
    return u

def make_photographer_user(uid=None):
    u = User()
    u.id = uid or uuid.uuid4()
    u.email = "photo@test.com"
    u.full_name = "Test Photographer"
    u.role = UserRole.photographer
    return u

def make_admin():
    u = User()
    u.id = uuid.uuid4()
    u.email = "admin@test.com"
    u.full_name = "Admin"
    u.role = UserRole.admin
    return u

def make_booking(status=BookingStatus.requested, booking_date=None,
                 client_id=None, photographer_id=None):
    b = Booking()
    b.id = uuid.uuid4()
    b.client_id = client_id or uuid.uuid4()
    b.photographer_id = photographer_id or uuid.uuid4()
    b.date = booking_date or future_date()
    b.status = status
    b.total_amount = 500.0
    b.advance_amount = 100.0
    b.remaining_amount = 400.0
    return b

def make_availability(photographer_id=None, avail_date=None, is_booked=False):
    a = Availability()
    a.id = uuid.uuid4()
    a.photographer_id = photographer_id or uuid.uuid4()
    a.date = avail_date or future_date()
    a.is_booked = is_booked
    return a

def make_photographer_profile(uid=None, profile_id=None):
    p = PhotographerProfile()
    p.id = profile_id or uuid.uuid4()
    p.user_id = uid or uuid.uuid4()
    p.rating = 0.0
    p.total_reviews = 0
    return p

def make_review(booking_id=None, reviewer_id=None, photographer_id=None, rating=5):
    r = Review()
    r.id = uuid.uuid4()
    r.booking_id = booking_id or uuid.uuid4()
    r.reviewer_id = reviewer_id or uuid.uuid4()
    r.photographer_id = photographer_id or uuid.uuid4()
    r.rating = rating
    r.comment = "Great shot!"
    return r

def make_mock_db():
    db = AsyncMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    return db

def mock_execute_sequence(db, return_values):
    mock_results = []
    for val in return_values:
        r = MagicMock()
        if isinstance(val, list):
            r.scalars.return_value.all.return_value = val
            r.scalar_one_or_none.return_value = val[0] if val else None
        elif isinstance(val, tuple):
            # For avg_result.one() calls
            r.one.return_value = val
        else:
            r.scalar_one_or_none.return_value = val
            r.scalar_one.return_value = val if val is not None else 0
            r.scalars.return_value.all.return_value = [val] if val else []
        mock_results.append(r)
    db.execute = AsyncMock(side_effect=mock_results)


# ═══════════════════════════════════════════════════════════════════════════════
# BOOKING: CREATE
# ═══════════════════════════════════════════════════════════════════════════════

class TestCreateBooking(unittest.IsolatedAsyncioTestCase):

    async def test_create_booking_past_date_raises(self):
        client = make_client()
        db = make_mock_db()
        profile = make_photographer_profile()
        mock_execute_sequence(db, [profile])
        service = BookingService(db)
        data = BookingCreate(
            photographer_id=profile.id, date=past_date(),
            total_amount=100, advance_amount=20, remaining_amount=80
        )
        with self.assertRaises(BadRequestException) as ctx:
            await service.create_booking(client, data)
        self.assertIn("future", ctx.exception.detail)

    async def test_create_booking_today_raises(self):
        """Booking for today (not strictly future) should fail."""
        client = make_client()
        db = make_mock_db()
        profile = make_photographer_profile()
        mock_execute_sequence(db, [profile])
        service = BookingService(db)
        data = BookingCreate(
            photographer_id=profile.id, date=today(),
            total_amount=100, advance_amount=20, remaining_amount=80
        )
        with self.assertRaises(BadRequestException):
            await service.create_booking(client, data)

    async def test_create_booking_no_availability_raises(self):
        client = make_client()
        db = make_mock_db()
        profile = make_photographer_profile()
        mock_execute_sequence(db, [profile, None])
        service = BookingService(db)
        data = BookingCreate(
            photographer_id=profile.id, date=future_date(),
            total_amount=100, advance_amount=20, remaining_amount=80
        )
        with self.assertRaises(BadRequestException) as ctx:
            await service.create_booking(client, data)
        self.assertIn("availability", ctx.exception.detail.lower())

    async def test_create_booking_already_booked_raises(self):
        client = make_client()
        db = make_mock_db()
        profile = make_photographer_profile()
        avail = make_availability(photographer_id=profile.id, is_booked=True)
        mock_execute_sequence(db, [profile, avail])
        service = BookingService(db)
        data = BookingCreate(
            photographer_id=profile.id, date=future_date(),
            total_amount=100, advance_amount=20, remaining_amount=80
        )
        with self.assertRaises(ConflictException) as ctx:
            await service.create_booking(client, data)
        self.assertIn("booked", ctx.exception.detail.lower())

    async def test_create_booking_duplicate_request_raises(self):
        client = make_client()
        db = make_mock_db()
        profile = make_photographer_profile()
        avail = make_availability(photographer_id=profile.id, is_booked=False)
        existing = make_booking(client_id=client.id)
        mock_execute_sequence(db, [profile, avail, existing])
        service = BookingService(db)
        data = BookingCreate(
            photographer_id=profile.id, date=future_date(),
            total_amount=100, advance_amount=20, remaining_amount=80
        )
        with self.assertRaises(ConflictException) as ctx:
            await service.create_booking(client, data)
        self.assertIn("already have", ctx.exception.detail.lower())

    async def test_create_booking_photographer_not_found_raises(self):
        client = make_client()
        db = make_mock_db()
        mock_execute_sequence(db, [None])
        service = BookingService(db)
        data = BookingCreate(
            photographer_id=uuid.uuid4(), date=future_date(),
            total_amount=100, advance_amount=20, remaining_amount=80
        )
        with self.assertRaises(NotFoundException):
            await service.create_booking(client, data)

    async def test_create_booking_success_fires_email(self):
        """Successful booking creation should trigger photographer email."""
        client = make_client()
        db = make_mock_db()
        profile = make_photographer_profile()
        avail = make_availability(photographer_id=profile.id, is_booked=False)
        photographer_user = make_photographer_user(uid=profile.user_id)
        mock_execute_sequence(db, [profile, avail, None, photographer_user])
        service = BookingService(db)
        data = BookingCreate(
            photographer_id=profile.id, date=future_date(),
            total_amount=100, advance_amount=20, remaining_amount=80
        )
        with patch("app.services.email_service.EmailService.send_booking_request_email",
                   new_callable=AsyncMock):
            result = await service.create_booking(client, data)
        db.add.assert_called_once()
        self.assertEqual(result.client_id, client.id)


# ═══════════════════════════════════════════════════════════════════════════════
# BOOKING: STATE MACHINE
# ═══════════════════════════════════════════════════════════════════════════════

class TestBookingStatusTransitions(unittest.IsolatedAsyncioTestCase):

    async def test_invalid_transition_rejected_to_accepted(self):
        booking = make_booking(status=BookingStatus.rejected)
        service = BookingService(make_mock_db())
        data = BookingStatusUpdate(status=BookingStatus.accepted)
        with self.assertRaises(BadRequestException) as ctx:
            await service.update_status(booking, make_photographer_user(), data)
        self.assertIn("Cannot transition", ctx.exception.detail)

    async def test_invalid_transition_cancelled_to_any(self):
        """Once cancelled, no further transitions allowed."""
        for target in [BookingStatus.accepted, BookingStatus.requested, BookingStatus.completed_by_admin]:
            booking = make_booking(status=BookingStatus.cancelled)
            service = BookingService(make_mock_db())
            data = BookingStatusUpdate(status=target)
            with self.assertRaises(BadRequestException):
                await service.update_status(booking, make_admin(), data)

    async def test_invalid_transition_completed_admin_is_terminal(self):
        """completed_by_admin is a terminal state."""
        booking = make_booking(status=BookingStatus.completed_by_admin)
        service = BookingService(make_mock_db())
        data = BookingStatusUpdate(status=BookingStatus.cancelled)
        with self.assertRaises(BadRequestException):
            await service.update_status(booking, make_admin(), data)

    async def test_allowed_transitions_cover_all_statuses(self):
        """Every BookingStatus must be a key in ALLOWED_TRANSITIONS."""
        for status in BookingStatus:
            self.assertIn(status, ALLOWED_TRANSITIONS,
                          f"Missing transition map for status: {status}")

    async def test_only_photographer_can_accept(self):
        client = make_client()
        photographer_id = uuid.uuid4()
        booking = make_booking(
            status=BookingStatus.requested, client_id=client.id,
            photographer_id=photographer_id
        )
        service = BookingService(make_mock_db())
        data = BookingStatusUpdate(status=BookingStatus.accepted)
        with self.assertRaises(ForbiddenException) as ctx:
            await service.update_status(booking, client, data)
        self.assertIn("photographer", ctx.exception.detail.lower())

    async def test_only_photographer_can_reject(self):
        client = make_client()
        booking = make_booking(status=BookingStatus.requested, client_id=client.id)
        service = BookingService(make_mock_db())
        data = BookingStatusUpdate(status=BookingStatus.rejected)
        with self.assertRaises(ForbiddenException):
            await service.update_status(booking, client, data)

    async def test_only_client_can_mark_completed(self):
        photographer_user = make_photographer_user()
        photographer_profile = make_photographer_profile(uid=photographer_user.id)
        photographer_user.__dict__['photographer_profile'] = photographer_profile
        booking = make_booking(
            status=BookingStatus.accepted, photographer_id=photographer_profile.id
        )
        service = BookingService(make_mock_db())
        data = BookingStatusUpdate(status=BookingStatus.completed_by_client)
        with self.assertRaises(ForbiddenException) as ctx:
            await service.update_status(booking, photographer_user, data)
        self.assertIn("client", ctx.exception.detail.lower())

    async def test_only_admin_can_finalize_completion(self):
        client = make_client()
        booking = make_booking(
            status=BookingStatus.completed_by_client, client_id=client.id
        )
        service = BookingService(make_mock_db())
        data = BookingStatusUpdate(status=BookingStatus.completed_by_admin)
        with self.assertRaises(ForbiddenException) as ctx:
            await service.update_status(booking, client, data)
        self.assertIn("admin", ctx.exception.detail.lower())

    async def test_admin_can_finalize_completion(self):
        admin = make_admin()
        client = make_client()
        booking = make_booking(
            status=BookingStatus.completed_by_client, client_id=client.id
        )
        db = make_mock_db()
        mock_execute_sequence(db, [client, make_photographer_profile(), make_photographer_user()])
        service = BookingService(db)
        data = BookingStatusUpdate(status=BookingStatus.completed_by_admin)
        result = await service.update_status(booking, admin, data)
        self.assertEqual(result.status, BookingStatus.completed_by_admin)

    async def test_photographer_reject_valid(self):
        """Photographer can validly reject a requested booking."""
        photographer_user = make_photographer_user()
        photographer_profile = make_photographer_profile(uid=photographer_user.id)
        photographer_user.__dict__['photographer_profile'] = photographer_profile
        booking = make_booking(
            status=BookingStatus.requested,
            photographer_id=photographer_profile.id
        )
        db = make_mock_db()
        service = BookingService(db)
        data = BookingStatusUpdate(status=BookingStatus.rejected)
        result = await service.update_status(booking, photographer_user, data)
        self.assertEqual(result.status, BookingStatus.rejected)

    async def test_client_mark_completed_valid(self):
        """Client can mark an accepted booking as completed."""
        client = make_client()
        booking = make_booking(status=BookingStatus.accepted, client_id=client.id)
        db = make_mock_db()
        mock_execute_sequence(db, [client, make_photographer_profile(), make_photographer_user()])
        service = BookingService(db)
        data = BookingStatusUpdate(status=BookingStatus.completed_by_client)
        result = await service.update_status(booking, client, data)
        self.assertEqual(result.status, BookingStatus.completed_by_client)


# ═══════════════════════════════════════════════════════════════════════════════
# CANCELLATION POLICY
# ═══════════════════════════════════════════════════════════════════════════════

class TestCancellationPolicy(unittest.IsolatedAsyncioTestCase):

    async def test_client_cancel_within_48h_raises(self):
        client = make_client()
        booking = make_booking(
            status=BookingStatus.requested, client_id=client.id,
            booking_date=(datetime.now(timezone.utc) + timedelta(hours=24)).date()
        )
        service = BookingService(make_mock_db())
        with self.assertRaises(BadRequestException) as ctx:
            await service.update_status(booking, client, BookingStatusUpdate(status=BookingStatus.cancelled))
        self.assertIn("48 hours", ctx.exception.detail)

    async def test_client_cancel_exactly_at_48h_boundary_raises(self):
        """Booking exactly 47h away should raise."""
        client = make_client()
        booking = make_booking(
            status=BookingStatus.requested, client_id=client.id,
            booking_date=(datetime.now(timezone.utc) + timedelta(hours=47)).date()
        )
        service = BookingService(make_mock_db())
        with self.assertRaises(BadRequestException):
            await service.update_status(booking, client, BookingStatusUpdate(status=BookingStatus.cancelled))

    async def test_client_cancel_before_48h_succeeds(self):
        client = make_client()
        booking = make_booking(
            status=BookingStatus.requested, client_id=client.id,
            booking_date=future_date(days=5)
        )
        service = BookingService(make_mock_db())
        result = await service.update_status(booking, client, BookingStatusUpdate(status=BookingStatus.cancelled))
        self.assertEqual(result.status, BookingStatus.cancelled)

    async def test_photographer_cancel_within_3_days_raises(self):
        photographer_user = make_photographer_user()
        photographer_profile = make_photographer_profile(uid=photographer_user.id)
        photographer_user.__dict__['photographer_profile'] = photographer_profile
        booking = make_booking(
            status=BookingStatus.accepted,
            photographer_id=photographer_profile.id,
            booking_date=future_date(days=2)
        )
        service = BookingService(make_mock_db())
        with self.assertRaises(BadRequestException) as ctx:
            await service.update_status(booking, photographer_user, BookingStatusUpdate(status=BookingStatus.cancelled))
        self.assertIn("3 days", ctx.exception.detail)

    async def test_photographer_cancel_after_3_days_succeeds(self):
        photographer_user = make_photographer_user()
        photographer_profile = make_photographer_profile(uid=photographer_user.id)
        photographer_user.__dict__['photographer_profile'] = photographer_profile
        booking = make_booking(
            status=BookingStatus.requested,
            photographer_id=photographer_profile.id,
            booking_date=future_date(days=10)
        )
        db = make_mock_db()
        service = BookingService(db)
        result = await service.update_status(booking, photographer_user, BookingStatusUpdate(status=BookingStatus.cancelled))
        self.assertEqual(result.status, BookingStatus.cancelled)

    async def test_third_party_cannot_cancel(self):
        random_user = make_client()
        booking = make_booking(status=BookingStatus.requested)  # different IDs
        service = BookingService(make_mock_db())
        with self.assertRaises(ForbiddenException):
            await service.update_status(booking, random_user, BookingStatusUpdate(status=BookingStatus.cancelled))

    async def test_admin_can_cancel_any_time(self):
        """Admin bypass: can cancel regardless of time window."""
        admin = make_admin()
        booking = make_booking(
            status=BookingStatus.requested,
            # Only 1 hour away — would fail for client/photographer
            booking_date=(datetime.now(timezone.utc) + timedelta(hours=1)).date()
        )
        db = make_mock_db()
        service = BookingService(db)
        result = await service.update_status(booking, admin, BookingStatusUpdate(status=BookingStatus.cancelled))
        self.assertEqual(result.status, BookingStatus.cancelled)

    async def test_cancel_accepted_booking_unlocks_availability(self):
        """Cancelling an accepted booking should unlock the availability slot."""
        client = make_client()
        photographer_id = uuid.uuid4()
        avail = make_availability(photographer_id=photographer_id, is_booked=True)
        booking = make_booking(
            status=BookingStatus.accepted,
            client_id=client.id,
            photographer_id=photographer_id,
            booking_date=future_date(days=10)
        )
        db = make_mock_db()
        avail_result = MagicMock()
        avail_result.scalar_one_or_none.return_value = avail
        db.execute = AsyncMock(return_value=avail_result)
        service = BookingService(db)
        result = await service.update_status(booking, client, BookingStatusUpdate(status=BookingStatus.cancelled))
        self.assertEqual(result.status, BookingStatus.cancelled)
        self.assertFalse(avail.is_booked)  # Must be unlocked!

    async def test_cancel_requested_booking_does_not_touch_availability(self):
        """Cancelling a requested (not yet accepted) booking should NOT touch availability."""
        client = make_client()
        photographer_id = uuid.uuid4()
        booking = make_booking(
            status=BookingStatus.requested,
            client_id=client.id,
            photographer_id=photographer_id,
            booking_date=future_date(days=10)
        )
        db = make_mock_db()
        service = BookingService(db)
        result = await service.update_status(booking, client, BookingStatusUpdate(status=BookingStatus.cancelled))
        # DB should NOT have been called (no availability unlock attempted)
        db.execute.assert_not_called()
        self.assertEqual(result.status, BookingStatus.cancelled)


# ═══════════════════════════════════════════════════════════════════════════════
# AVAILABILITY LOCKING
# ═══════════════════════════════════════════════════════════════════════════════

class TestAcceptBookingLocksAvailability(unittest.IsolatedAsyncioTestCase):

    async def test_accept_locks_availability_and_auto_rejects_others(self):
        photographer_user = make_photographer_user()
        photographer_profile = make_photographer_profile(uid=photographer_user.id)
        photographer_user.__dict__['photographer_profile'] = photographer_profile

        avail = make_availability(photographer_id=photographer_profile.id, is_booked=False)
        booking = make_booking(
            status=BookingStatus.requested,
            photographer_id=photographer_profile.id,
            booking_date=avail.date
        )

        # Competing booking that should get auto-rejected
        competing = make_booking(
            status=BookingStatus.requested,
            photographer_id=photographer_profile.id,
            booking_date=avail.date
        )

        db = make_mock_db()
        avail_result = MagicMock()
        avail_result.scalar_one_or_none.return_value = avail
        competing_result = MagicMock()
        competing_result.scalars.return_value.all.return_value = [competing]
        client_result = MagicMock()
        client_result.scalar_one_or_none.return_value = make_client()
        ph_profile_result = MagicMock()
        ph_profile_result.scalar_one_or_none.return_value = photographer_profile
        ph_user_result = MagicMock()
        ph_user_result.scalar_one_or_none.return_value = photographer_user
        db.execute = AsyncMock(side_effect=[avail_result, competing_result, client_result, ph_profile_result, ph_user_result])

        service = BookingService(db)
        result = await service.update_status(booking, photographer_user, BookingStatusUpdate(status=BookingStatus.accepted))

        self.assertEqual(result.status, BookingStatus.accepted)
        self.assertTrue(avail.is_booked)  # Slot locked
        self.assertEqual(competing.status, BookingStatus.rejected)  # Competing auto-rejected!

    async def test_accept_already_locked_raises_conflict(self):
        photographer_user = make_photographer_user()
        photographer_profile = make_photographer_profile(uid=photographer_user.id)
        photographer_user.__dict__['photographer_profile'] = photographer_profile
        avail = make_availability(photographer_id=photographer_profile.id, is_booked=True)
        booking = make_booking(
            status=BookingStatus.requested,
            photographer_id=photographer_profile.id,
            booking_date=avail.date
        )
        db = make_mock_db()
        r = MagicMock()
        r.scalar_one_or_none.return_value = avail
        db.execute = AsyncMock(return_value=r)
        service = BookingService(db)
        with self.assertRaises(ConflictException) as ctx:
            await service.update_status(booking, photographer_user, BookingStatusUpdate(status=BookingStatus.accepted))
        self.assertIn("locked", ctx.exception.detail.lower())

    async def test_accept_missing_availability_record_raises(self):
        """If availability row doesn't exist on accept, raise NotFoundException."""
        photographer_user = make_photographer_user()
        photographer_profile = make_photographer_profile(uid=photographer_user.id)
        photographer_user.__dict__['photographer_profile'] = photographer_profile
        booking = make_booking(
            status=BookingStatus.requested,
            photographer_id=photographer_profile.id
        )
        db = make_mock_db()
        r = MagicMock()
        r.scalar_one_or_none.return_value = None  # No availability record
        db.execute = AsyncMock(return_value=r)
        service = BookingService(db)
        with self.assertRaises(NotFoundException):
            await service.update_status(booking, photographer_user, BookingStatusUpdate(status=BookingStatus.accepted))


# ═══════════════════════════════════════════════════════════════════════════════
# AVAILABILITY SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class TestAvailabilityService(unittest.IsolatedAsyncioTestCase):

    async def test_only_photographer_can_set_availability(self):
        """Non-photographers cannot set availability."""
        client = make_client()
        db = make_mock_db()
        # No photographer profile for this user
        mock_execute_sequence(db, [None])
        service = AvailabilityService(db)
        data = AvailabilityCreate(dates=[future_date()], is_booked=False)
        with self.assertRaises(ForbiddenException) as ctx:
            await service.set_availability(client, data)
        self.assertIn("photographer", ctx.exception.detail.lower())

    async def test_set_availability_creates_new_records(self):
        photographer_user = make_photographer_user()
        profile = make_photographer_profile(uid=photographer_user.id)
        db = make_mock_db()
        # First call: find profile; next calls: no existing availability for each date
        mock_execute_sequence(db, [profile, None, None])
        service = AvailabilityService(db)
        dates = [future_date(5), future_date(10)]
        data = AvailabilityCreate(dates=dates, is_booked=False)
        result = await service.set_availability(photographer_user, data)
        self.assertEqual(db.add.call_count, 2)  # 2 new records added

    async def test_set_availability_upserts_existing_records(self):
        """Existing availability rows should be updated, not duplicated."""
        photographer_user = make_photographer_user()
        profile = make_photographer_profile(uid=photographer_user.id)
        existing_avail = make_availability(photographer_id=profile.id, is_booked=False)
        db = make_mock_db()
        # Return profile, then return the existing avail record for the single date
        mock_execute_sequence(db, [profile, existing_avail])
        service = AvailabilityService(db)
        data = AvailabilityCreate(dates=[existing_avail.date], is_booked=True)
        await service.set_availability(photographer_user, data)
        # Should NOT call db.add (upsert)
        db.add.assert_not_called()
        # Should have toggled the existing row
        self.assertTrue(existing_avail.is_booked)

    async def test_get_photographer_availabilities_filters_by_booked(self):
        photographer_id = uuid.uuid4()
        db = make_mock_db()
        avail_list = [make_availability(is_booked=False), make_availability(is_booked=False)]
        r = MagicMock()
        r.scalars.return_value.all.return_value = avail_list
        db.execute = AsyncMock(return_value=r)
        service = AvailabilityService(db)
        result = await service.get_photographer_availabilities(
            photographer_id, future_date(1), future_date(30), is_booked=False
        )
        self.assertEqual(len(result), 2)
        for item in result:
            self.assertFalse(item.is_booked)


# ═══════════════════════════════════════════════════════════════════════════════
# REVIEWS
# ═══════════════════════════════════════════════════════════════════════════════

class TestReviews(unittest.IsolatedAsyncioTestCase):

    async def test_review_requires_completed_status(self):
        reviewer = make_client()
        db = make_mock_db()
        # Booking is only accepted (not completed)
        booking = make_booking(status=BookingStatus.accepted, client_id=reviewer.id)
        mock_execute_sequence(db, [booking, None])
        service = BookingService(db)
        data = ReviewCreate(booking_id=booking.id, rating=5, comment="Great!")
        with self.assertRaises(BadRequestException) as ctx:
            await service.create_review(reviewer, data)
        self.assertIn("completed", ctx.exception.detail.lower())

    async def test_review_requires_requested_status(self):
        """requested booking also cannot be reviewed."""
        reviewer = make_client()
        db = make_mock_db()
        booking = make_booking(status=BookingStatus.requested, client_id=reviewer.id)
        mock_execute_sequence(db, [booking])
        service = BookingService(db)
        data = ReviewCreate(booking_id=booking.id, rating=4, comment="OK")
        with self.assertRaises(BadRequestException):
            await service.create_review(reviewer, data)

    async def test_only_client_can_review(self):
        """Someone who is not the client cannot review."""
        reviewer = make_client()
        different_client_id = uuid.uuid4()
        db = make_mock_db()
        booking = make_booking(
            status=BookingStatus.completed_by_admin,
            client_id=different_client_id  # !== reviewer.id
        )
        mock_execute_sequence(db, [booking])
        service = BookingService(db)
        data = ReviewCreate(booking_id=booking.id, rating=5)
        with self.assertRaises(ForbiddenException) as ctx:
            await service.create_review(reviewer, data)
        self.assertIn("your own", ctx.exception.detail.lower())

    async def test_cannot_review_twice(self):
        reviewer = make_client()
        db = make_mock_db()
        booking = make_booking(status=BookingStatus.completed_by_client, client_id=reviewer.id)
        existing_review = make_review(booking_id=booking.id, reviewer_id=reviewer.id)
        mock_execute_sequence(db, [booking, existing_review])
        service = BookingService(db)
        data = ReviewCreate(booking_id=booking.id, rating=4)
        with self.assertRaises(ConflictException) as ctx:
            await service.create_review(reviewer, data)
        self.assertIn("already exists", ctx.exception.detail.lower())

    async def test_review_not_found_raises(self):
        reviewer = make_client()
        db = make_mock_db()
        mock_execute_sequence(db, [None])  # Booking not found
        service = BookingService(db)
        data = ReviewCreate(booking_id=uuid.uuid4(), rating=5)
        with self.assertRaises(NotFoundException):
            await service.create_review(reviewer, data)

    async def test_review_updates_photographer_rating(self):
        """Successful review should recalculate the photographer's avg rating."""
        reviewer = make_client()
        photographer_id = uuid.uuid4()
        profile = make_photographer_profile(profile_id=photographer_id)
        db = make_mock_db()
        booking = make_booking(
            status=BookingStatus.completed_by_admin,
            client_id=reviewer.id,
            photographer_id=photographer_id
        )
        # Sequence: booking, no-existing-review, avg_result tuple, photographer_profile
        booking_result = MagicMock()
        booking_result.scalar_one_or_none.return_value = booking
        no_review_result = MagicMock()
        no_review_result.scalar_one_or_none.return_value = None
        avg_result = MagicMock()
        avg_result.one.return_value = (4.5, 10)  # (avg_rating, count)
        profile_result = MagicMock()
        profile_result.scalar_one_or_none.return_value = profile
        db.execute = AsyncMock(side_effect=[booking_result, no_review_result, avg_result, profile_result])

        service = BookingService(db)
        data = ReviewCreate(booking_id=booking.id, rating=5, comment="Excellent!")
        await service.create_review(reviewer, data)
        self.assertEqual(profile.rating, 4.5)  # Updated!
        self.assertEqual(profile.total_reviews, 10)

    async def test_review_valid_completed_by_client(self):
        """completed_by_client status allows review."""
        reviewer = make_client()
        photographer_id = uuid.uuid4()
        profile = make_photographer_profile(profile_id=photographer_id)
        db = make_mock_db()
        booking = make_booking(
            status=BookingStatus.completed_by_client,
            client_id=reviewer.id,
            photographer_id=photographer_id
        )
        booking_result = MagicMock()
        booking_result.scalar_one_or_none.return_value = booking
        no_review_result = MagicMock()
        no_review_result.scalar_one_or_none.return_value = None
        avg_result = MagicMock()
        avg_result.one.return_value = (5.0, 1)
        profile_result = MagicMock()
        profile_result.scalar_one_or_none.return_value = profile
        db.execute = AsyncMock(side_effect=[booking_result, no_review_result, avg_result, profile_result])

        service = BookingService(db)
        data = ReviewCreate(booking_id=booking.id, rating=5)
        await service.create_review(reviewer, data)
        db.add.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════════
# EMAIL SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class TestEmailService(unittest.IsolatedAsyncioTestCase):

    def test_no_crash_when_credentials_missing(self):
        """Should silently log, not raise, when SMTP creds are empty."""
        with patch("app.services.email_service.settings") as mock_settings:
            mock_settings.SMTP_USER = ""
            mock_settings.SMTP_PASSWORD = ""
            # Should not raise
            EmailService._send_email_sync("test@test.com", "Subject", "<p>Hello</p>")

    @patch('app.services.email_service.settings')
    @patch('smtplib.SMTP')
    def test_email_sends_correctly(self, mock_smtp_cls, mock_settings):
        mock_settings.SMTP_USER = "user@gmail.com"
        mock_settings.SMTP_PASSWORD = "secret"
        mock_settings.SMTP_HOST = "smtp.gmail.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.EMAILS_FROM_NAME = "FrameFolio"
        mock_settings.EMAILS_FROM_EMAIL = "noreply@framefolio.ae"
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server
        EmailService._send_email_sync("client@test.com", "Test", "<p>Hi</p>")
        mock_smtp_cls.assert_called_once_with("smtp.gmail.com", 587)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user@gmail.com", "secret")
        mock_server.send_message.assert_called_once()

    @patch('app.services.email_service.settings')
    @patch('smtplib.SMTP')
    def test_smtp_error_is_logged_not_raised(self, mock_smtp_cls, mock_settings):
        """SMTP connection errors should be caught and logged, not crash the app."""
        mock_settings.SMTP_USER = "user@gmail.com"
        mock_settings.SMTP_PASSWORD = "bad_password"
        mock_settings.SMTP_HOST = "smtp.gmail.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.EMAILS_FROM_NAME = "FrameFolio"
        mock_settings.EMAILS_FROM_EMAIL = "noreply@framefolio.ae"
        mock_smtp_cls.side_effect = smtplib.SMTPAuthenticationError(535, b"Auth failed")
        # Should not raise — error is swallowed gracefully
        try:
            EmailService._send_email_sync("test@test.com", "Test", "<p>Hi</p>")
        except Exception as e:
            self.fail(f"EmailService raised an exception unexpectedly: {e}")

    async def test_booking_request_email_subject_contains_client_name(self):
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            await EmailService.send_booking_request_email("photo@test.com", "Alice", "2026-05-01")
            args = mock_send.call_args[0]
            self.assertIn("Alice", args[1])   # subject
            self.assertIn("2026-05-01", args[2])  # body

    async def test_booking_accepted_email_subject_contains_date(self):
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            await EmailService.send_booking_accepted_email("client@test.com", "Bob", "2026-07-15")
            args = mock_send.call_args[0]
            self.assertIn("2026-07-15", args[1])

    async def test_booking_completed_email_subject_contains_photographer(self):
        with patch.object(EmailService, 'send_email', new_callable=AsyncMock) as mock_send:
            await EmailService.send_booking_completed_email("client@test.com", "Charlie")
            args = mock_send.call_args[0]
            self.assertIn("Charlie", args[1])


# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGE SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class TestMessageService(unittest.IsolatedAsyncioTestCase):

    async def test_send_message_receiver_not_found_raises(self):
        sender = make_client()
        db = make_mock_db()
        mock_execute_sequence(db, [None])
        service = MessageService(db)
        data = MessageCreate(receiver_id=uuid.uuid4(), message="Hello!")
        with self.assertRaises(NotFoundException):
            await service.send_message(sender, data)

    async def test_send_message_success(self):
        sender = make_client()
        receiver = make_photographer_user()
        db = make_mock_db()
        mock_execute_sequence(db, [receiver])
        service = MessageService(db)
        data = MessageCreate(receiver_id=receiver.id, message="Hello!")
        await service.send_message(sender, data)
        db.add.assert_called_once()
        db.flush.assert_called()

    async def test_send_message_empty_string_is_valid(self):
        """Empty message strings are not blocked at service level."""
        sender = make_client()
        receiver = make_photographer_user()
        db = make_mock_db()
        mock_execute_sequence(db, [receiver])
        service = MessageService(db)
        data = MessageCreate(receiver_id=receiver.id, message="")
        await service.send_message(sender, data)
        db.add.assert_called_once()

    async def test_get_conversation_returns_ordered_messages(self):
        current_user = make_client()
        other_user_id = uuid.uuid4()
        db = make_mock_db()
        r = MagicMock()
        r.scalars.return_value.all.return_value = ["msg1", "msg2", "msg3"]
        db.execute = AsyncMock(return_value=r)
        service = MessageService(db)
        result = await service.get_conversation(current_user, other_user_id)
        self.assertEqual(result, ["msg1", "msg2", "msg3"])

    async def test_get_conversation_empty(self):
        current_user = make_client()
        db = make_mock_db()
        r = MagicMock()
        r.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=r)
        service = MessageService(db)
        result = await service.get_conversation(current_user, uuid.uuid4())
        self.assertEqual(result, [])

    async def test_get_user_chats_deduplication(self):
        """Inbox: 2 messages from same partner → 1 chat entry."""
        current_user = make_client()
        other_id = uuid.uuid4()
        db = make_mock_db()
        from app.models.message import Message
        m1 = MagicMock(spec=Message)
        m1.sender_id = current_user.id
        m1.receiver_id = other_id
        m1.message = "hi"
        m1.timestamp = datetime.now(timezone.utc)
        m2 = MagicMock(spec=Message)
        m2.sender_id = other_id
        m2.receiver_id = current_user.id
        m2.message = "hello back"
        m2.timestamp = datetime.now(timezone.utc) - timedelta(hours=1)
        r = MagicMock()
        r.scalars.return_value.all.return_value = [m1, m2]
        db.execute = AsyncMock(return_value=r)
        service = MessageService(db)
        result = await service.get_user_chats(current_user)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["other_user_id"], other_id)
        self.assertEqual(result[0]["last_message"], "hi")

    async def test_get_user_chats_multiple_partners(self):
        """Inbox: 1 message each from 3 different partners → 3 chat entries."""
        current_user = make_client()
        other_ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
        db = make_mock_db()
        from app.models.message import Message
        messages = []
        for i, oid in enumerate(other_ids):
            m = MagicMock(spec=Message)
            m.sender_id = oid
            m.receiver_id = current_user.id
            m.message = f"msg from {i}"
            m.timestamp = datetime.now(timezone.utc) - timedelta(hours=i)
            messages.append(m)
        r = MagicMock()
        r.scalars.return_value.all.return_value = messages
        db.execute = AsyncMock(return_value=r)
        service = MessageService(db)
        result = await service.get_user_chats(current_user)
        self.assertEqual(len(result), 3)


# ═══════════════════════════════════════════════════════════════════════════════
# GET_OR_404
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetOrRaise(unittest.IsolatedAsyncioTestCase):

    async def test_get_or_404_found(self):
        booking = make_booking()
        db = make_mock_db()
        r = MagicMock()
        r.scalar_one_or_none.return_value = booking
        db.execute = AsyncMock(return_value=r)
        service = BookingService(db)
        result = await service.get_or_404(booking.id)
        self.assertEqual(result.id, booking.id)

    async def test_get_or_404_not_found_raises(self):
        db = make_mock_db()
        r = MagicMock()
        r.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=r)
        service = BookingService(db)
        with self.assertRaises(NotFoundException):
            await service.get_or_404(uuid.uuid4())


# ═══════════════════════════════════════════════════════════════════════════════
# LIST BOOKINGS
# ═══════════════════════════════════════════════════════════════════════════════

class TestListBookings(unittest.IsolatedAsyncioTestCase):

    async def test_client_list_returns_paginated(self):
        client = make_client()
        db = make_mock_db()
        b1, b2 = make_booking(client_id=client.id), make_booking(client_id=client.id)
        count_result = MagicMock()
        count_result.scalar_one.return_value = 2
        items_result = MagicMock()
        items_result.scalars.return_value.all.return_value = [b1, b2]
        db.execute = AsyncMock(side_effect=[count_result, items_result])
        service = BookingService(db)
        response = await service.list_user_bookings(client, page=1, page_size=20)
        self.assertEqual(response.total, 2)
        self.assertEqual(response.pages, 1)

    async def test_photographer_with_no_profile_returns_empty(self):
        photographer_user = make_photographer_user()
        db = make_mock_db()
        mock_execute_sequence(db, [None])  # No photographer profile found
        service = BookingService(db)
        response = await service.list_user_bookings(photographer_user, page=1, page_size=20)
        self.assertEqual(response.total, 0)
        self.assertEqual(response.items, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
