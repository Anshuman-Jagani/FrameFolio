import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.api.router import api_router

# ──────────────────────────────── Logging ────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ──────────────────────────────── Lifespan ────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting up...")
    yield
    logger.info("🛑 Shutting down...")


# ──────────────────────────────── App Factory ────────────────────────────────
def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Production-grade REST API for FrameFolio UAE — "
            "a photographer marketplace platform. "
            "Supports booking management, availability scheduling, "
            "in-app messaging, and role-based access control."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global exception handlers ──
    @app.middleware("http")
    async def add_cors_headers(request, call_next):
        response = await call_next(request)
        origin = request.headers.get("Origin")
        if origin in settings.ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization"
            )
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        errors = []
        for error in exc.errors():
            errors.append(
                {
                    "field": " → ".join(str(loc) for loc in error["loc"][1:]),
                    "message": error["msg"],
                    "type": error["type"],
                }
            )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Validation failed", "errors": errors},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred"},
        )
        response.headers["Access-Control-Allow-Origin"] = request.headers.get(
            "Origin", "*"
        )
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    # ── Routers ──
    app.include_router(api_router)

    # ── Health check ──
    @app.get("/health", tags=["Health"], summary="Health check")
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_application()
