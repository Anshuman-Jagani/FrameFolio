from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings

# Correctly handle SQLite vs Postgres
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://").replace("postgres://", "postgresql+asyncpg://")

# SQLite needs connect_args for multithreading, but Postgres doesn't
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Engine configuration
engine_params = {
    "echo": settings.DEBUG,
}

# Only add pool-specific params for non-sqlite (Postgres/MySQL)
if not DATABASE_URL.startswith("sqlite"):
    engine_params.update({
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
        "pool_timeout": settings.DATABASE_POOL_TIMEOUT,
        "pool_pre_ping": True,
    })

engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_params
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    """FastAPI dependency that provides an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            # Note: Committing inside the generator depends on use case.
            # Usually handled by the endpoint, but keeping consistent with original.
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
