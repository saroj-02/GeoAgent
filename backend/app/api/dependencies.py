"""
FastAPI dependencies for authentication and authorization.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_async_db
from app.core.security import SecurityService
from app.services.auth import AuthService
from app.models import User

logger = logging.getLogger(__name__)


async def get_current_user(
    token: str = Depends(lambda: None),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> User:
    """
    Get current authenticated user from JWT token.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = SecurityService.verify_token(token)
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = await AuthService.get_user_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    token: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> Optional[User]:
    """Get optional authenticated user (allows unauthenticated access)."""
    if not token:
        return None

    try:
        user = await get_current_user(token=token, db=db)
        return user
    except HTTPException:
        return None
