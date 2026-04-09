from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import metadata — MUST import all models so Alembic sees them
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.db.base import Base
import app.models  # noqa: F401 — registers all models

target_metadata = Base.metadata


def get_sync_url() -> str:
    """
    Convert async DB driver URLs to their synchronous equivalents.
    Alembic always uses a synchronous engine — async drivers (aiosqlite,
    asyncpg) will cause a MissingGreenlet error.

    Mapping:
      sqlite+aiosqlite:///  →  sqlite:///
      postgresql+asyncpg://  →  postgresql+psycopg2://
      postgres+asyncpg://    →  postgresql+psycopg2://
    """
    url: str = settings.DATABASE_URL

    # SQLite async → sync
    if url.startswith("sqlite+aiosqlite"):
        return url.replace("sqlite+aiosqlite", "sqlite", 1)

    # PostgreSQL asyncpg → psycopg2
    for async_prefix in ("postgresql+asyncpg://", "postgres+asyncpg://"):
        if url.startswith(async_prefix):
            return "postgresql+psycopg2://" + url[len(async_prefix):]

    # Already a sync URL (e.g. postgresql://, sqlite:///)
    return url


def run_migrations_offline() -> None:
    url = get_sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_sync_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
