import logging

import stripe
from fastapi import APIRouter, Query, Request, status
from fastapi.responses import JSONResponse

from app.api.deps import DBSession, CurrentUser
from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.schemas.payment import (
    CreateCheckoutRequest,
    CheckoutSessionResponse,
    PaymentResponse,
)
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────────── POST /payments/checkout ────────────────────────────────

@router.post(
    "/checkout",
    response_model=CheckoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Stripe Checkout Session",
    description=(
        "Creates a Stripe Checkout Session for a one-time payment and persists "
        "a PENDING Payment record. Returns the Checkout URL to redirect the user to."
    ),
)
async def create_checkout(
    data: CreateCheckoutRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    service = PaymentService(db)
    checkout_url, session_id, payment = await service.create_checkout_session(
        current_user, data
    )
    return CheckoutSessionResponse(
        checkout_url=checkout_url,
        session_id=session_id,
        payment_id=payment.id,
    )


# ──────────────────────────────── GET /payments/success ────────────────────────────────

@router.get(
    "/success",
    response_model=PaymentResponse,
    summary="Payment success callback",
    description=(
        "Public endpoint called by the frontend after a successful Stripe redirect. "
        "Reads ?session_id=... and returns the corresponding Payment record."
    ),
)
async def payment_success(
    db: DBSession,
    session_id: str = Query(..., description="Stripe Checkout Session ID"),
):
    service = PaymentService(db)
    payment = await service.get_payment_by_session(session_id)
    return payment


# ──────────────────────────────── GET /payments/history ────────────────────────────────

@router.get(
    "/history",
    response_model=list[PaymentResponse],
    summary="Payment history for the current user",
    description="Returns all payments for the authenticated user, ordered by most recent first.",
)
async def payment_history(
    db: DBSession,
    current_user: CurrentUser,
):
    service = PaymentService(db)
    return await service.list_user_payments(current_user)


# ──────────────────────────────── POST /payments/webhook ────────────────────────────────

@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Stripe webhook receiver",
    description=(
        "Receives raw Stripe webhook events. Verifies the signature using "
        "STRIPE_WEBHOOK_SECRET and dispatches to the service layer."
    ),
    include_in_schema=True,
)
async def stripe_webhook(request: Request, db: DBSession):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Webhook secret not configured"},
        )

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        # Invalid payload
        logger.warning("Stripe webhook: invalid payload received")
        raise BadRequestException("Invalid webhook payload")
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook: signature verification failed")
        raise BadRequestException("Invalid webhook signature")

    service = PaymentService(db)
    await service.handle_webhook_event(event)

    return {"received": True}
