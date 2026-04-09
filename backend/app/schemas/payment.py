import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.payment import PaymentStatus


# ──────────────────────────────── Request Schemas ────────────────────────────────

class CreateCheckoutRequest(BaseModel):
    """Payload for creating a Stripe Checkout Session."""
    amount: int  # in cents, e.g. 5000 = $50.00
    currency: str = "usd"
    description: Optional[str] = None
    product_name: str
    booking_id: Optional[uuid.UUID] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        # Stripe minimum is 50 cents for USD
        if v < 50:
            raise ValueError("Amount must be at least 50 cents")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("product_name")
    @classmethod
    def validate_product_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Product name cannot be empty")
        return v


# ──────────────────────────────── Response Schemas ────────────────────────────────

class CheckoutSessionResponse(BaseModel):
    """Returned after creating a Checkout Session — client should redirect to checkout_url."""
    checkout_url: str
    session_id: str
    payment_id: uuid.UUID


class PaymentResponse(BaseModel):
    """Full representation of a Payment record."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    stripe_payment_intent_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    amount: int
    currency: str
    status: PaymentStatus
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
