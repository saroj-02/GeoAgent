"""
MongoDB database connection using Motor (async MongoDB driver).
Replaces the previous SQLAlchemy / PostgreSQL setup.
"""

import logging
from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Client singleton
# ---------------------------------------------------------------------------
_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    """Return (or lazily create) the shared Motor client."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=30000,
        )
        logger.info("MongoDB client created (Atlas cluster)")
    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Return the application database handle."""
    return get_client()[settings.MONGODB_DB_NAME]


# ---------------------------------------------------------------------------
# FastAPI dependency helpers
# ---------------------------------------------------------------------------

async def get_async_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """
    Async generator — use as a FastAPI dependency:

        db: AsyncIOMotorDatabase = Depends(get_async_db)
    """
    db = get_database()
    try:
        yield db
    except Exception as exc:
        logger.error(f"Database operation error: {exc}")
        raise


def get_sync_db():
    """
    Compatibility shim.  MongoDB does not need a separate sync engine;
    return the same Motor database (Motor is safe to call from sync
    contexts via run_until_complete when needed).
    """
    return get_database()


# ---------------------------------------------------------------------------
# Lifecycle helpers (call from FastAPI lifespan)
# ---------------------------------------------------------------------------

async def init_db():
    """
    Create indexes on all collections for optimal query performance.
    Safe to call multiple times (createIndex is idempotent).
    """
    db = get_database()

    # users
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)

    # devices
    await db.devices.create_index("unique_identifier", unique=True)
    await db.devices.create_index("user_id")

    # locations
    await db.locations.create_index([("device_id", 1), ("timestamp", -1)])

    # permissions
    await db.permissions.create_index("device_id")
    await db.permissions.create_index("granted_to_id")
    await db.permissions.create_index("granted_by_id")

    # geofences
    await db.geofences.create_index("owner_id")

    logger.info("MongoDB indexes created successfully")


async def close_db():
    """Close the Motor client — call on app shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB client closed")