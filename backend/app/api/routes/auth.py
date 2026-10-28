"""
Authentication API routes.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import get_async_db
from app.core.security import SecurityService
from app.schemas import (
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth import AuthService


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

settings = get_settings()


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def _user_response(user: Any) -> UserResponse:
    """Convert internal User model into public API response."""
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        email_verified=user.email_verified,
        is_active=user.is_active,
        created_at=user.created_at,
    )


# ----------------------------------------------------------------------
# Register
# ----------------------------------------------------------------------


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: UserRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> UserResponse:
    """Register a new GeoAgent account."""

    try:
        user = await AuthService.register_user(
            db=db,
            email=payload.email,
            username=payload.username,
            password=payload.password,
            full_name=payload.full_name,
        )

        return _user_response(user)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {exc}",
        ) from exc


# ----------------------------------------------------------------------
# Login
# ----------------------------------------------------------------------


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    payload: UserLoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> TokenResponse:
    """Authenticate a user and return access/refresh tokens."""

    try:
        user = await AuthService.login_user(
            db=db,
            email=payload.email,
            password=payload.password,
        )

        access_token = AuthService.create_access_token(user)
        refresh_token = AuthService.create_refresh_token(user)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {exc}",
        ) from exc


# ----------------------------------------------------------------------
# Refresh token
# ----------------------------------------------------------------------


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> TokenResponse:
    """Create a new access token using a valid refresh token."""

    try:
        token_data = SecurityService.decode_token(
            payload.refresh_token
        )

        if token_data.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        subject = token_data.get("sub")

        if not subject:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user = await AuthService.get_user_by_id(
            db=db,
            user_id=subject,
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User no longer exists",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
            )

        access_token = AuthService.create_access_token(user)
        new_refresh_token = AuthService.create_refresh_token(user)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {exc}",
        ) from exc


# ----------------------------------------------------------------------
# Verify token
# ----------------------------------------------------------------------


@router.get(
    "/verify",
)
async def verify_token(
    token: str,
) -> dict[str, Any]:
    """Verify a JWT token."""
    try:
        payload = SecurityService.decode_token(token)

        return {
            "valid": True,
            "payload": payload,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc