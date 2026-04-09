import logging
from typing import Optional
import uuid

import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.schemas.payment import CreateCheckoutRequest, PaymentResponse

logger = logging.getLogger(__name__)


# Initialise Stripe with the secret key on import
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────── Helpers ────────────────────────────────

    async def get_payment_or_404(self, payment_id: uuid.UUID) -> Payment:
        result = await self.db.execute(
            select(Payment).where(Payment.id == payment_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise NotFoundException("Payment", payment_id)
        return payment

    # ──────────────────────────────── Core Methods ────────────────────────────────

    async def create_checkout_session(
        self,
        user: User,
        data: CreateCheckoutRequest,
    ) -> tuple[str, str, Payment]:
        """
        Create a Stripe Checkout Session in `payment` mode and persist a
        PENDING Payment record.

        Returns:
            (checkout_url, stripe_session_id, payment)
        """
        try:
            metadata = {"user_id": str(user.id)}
            if data.booking_id:
                metadata["booking_id"] = str(data.booking_id)

            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                line_items=[
                    {
                        "price_data": {
                            "currency": data.currency,
                            "unit_amount": data.amount,
                            "product_data": {
                                "name": data.product_name,
                                **(
                                    {"description": data.description}
                                    if data.description
                                    else {}
                                ),
                            },
                        },
                        "quantity": 1,
                    }
                ],
                success_url=(
                    f"{settings.FRONTEND_URL}/payments/success"
                    "?session_id={CHECKOUT_SESSION_ID}"
                ),
                cancel_url=(
                    f"{settings.FRONTEND_URL}/payments/cancel"
                    "?session_id={CHECKOUT_SESSION_ID}"
                ),
                metadata=metadata,
            )
        except stripe.error.StripeError as exc:
            logger.error("Stripe API error during checkout session creation: %s", exc)
            raise BadRequestException(f"Stripe error: {exc.user_message or str(exc)}")

        payment = Payment(
            user_id=user.id,
            booking_id=data.booking_id,
            stripe_session_id=session.id,
            stripe_payment_intent_id=None,  # populated via webhook
            amount=data.amount,
            currency=data.currency,
            status=PaymentStatus.pending,
            description=data.description,
        )
        self.db.add(payment)
        await self.db.flush()
        await self.db.refresh(payment)

        logger.info(
            "Created checkout session %s for user %s (booking %s, payment %s)",
            session.id,
            user.id,
            data.booking_id,
            payment.id,
        )
        return session.url, session.id, payment

    async def get_payment_by_session(self, session_id: str) -> Payment:
        """Fetch a Payment record by its Stripe session ID."""
        result = await self.db.execute(
            select(Payment).where(Payment.stripe_session_id == session_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise NotFoundException("Payment for session", session_id)
        return payment

    async def list_user_payments(self, user: User) -> list[Payment]:
        """Return all payments for a given user, newest first."""
        result = await self.db.execute(
            select(Payment)
            .where(Payment.user_id == user.id)
            .order_by(Payment.created_at.desc())
        )
        return list(result.scalars().all())

    async def handle_webhook_event(self, event: stripe.Event) -> None:
        """
        Process incoming Stripe webhook events.
        """
        event_type: str = event["type"]
        data_obj = event["data"]["object"]

        if event_type == "checkout.session.completed":
            session_id: str = data_obj.get("id", "")
            payment_intent_id: Optional[str] = data_obj.get("payment_intent")

            result = await self.db.execute(
                select(Payment).where(Payment.stripe_session_id == session_id)
            )
            payment = result.scalar_one_or_none()
            if not payment:
                logger.error("Payment not found for session %s in webhook", session_id)
                return

            payment.status = PaymentStatus.succeeded
            payment.stripe_payment_intent_id = payment_intent_id
            await self.db.flush()

            logger.info("Payment %s succeeded via webhook (Booking: %s)", payment.id, payment.booking_id)

            if payment.booking_id:
                from app.services.booking_service import BookingService
                booking_service = BookingService(self.db)
                await booking_service.mark_as_paid(
                    booking_id=payment.booking_id,
                    amount_cents=payment.amount,
                )

        elif event_type in ["payment_intent.payment_failed", "invoice.payment_failed"]:
            pi_id: str = data_obj.get("id") or data_obj.get("payment_intent", "")
            result = await self.db.execute(
                select(Payment).where(Payment.stripe_payment_intent_id == pi_id)
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.status = PaymentStatus.failed
                await self.db.flush()
                logger.warning("Payment %s marked as failed via webhook", payment.id)

        else:
            logger.debug("Unhandled Stripe event type: %s", event_type)
