from fastapi import APIRouter
from app.api.v1 import auth, users, photographers, bookings, availability, messages, admin, payments

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(photographers.router, prefix="/photographers", tags=["Photographers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(availability.router, prefix="/availability", tags=["Availability"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])

