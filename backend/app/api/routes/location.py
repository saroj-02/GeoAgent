"""
Location API routes - for submitting and retrieving location data.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Security, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_async_db
from app.core.security import SecurityService
from app.core.config import get_settings
from app.services.auth import AuthService
from app.services.location import LocationService
from app.models import User
from app.schemas import (
    LocationPointCreateRequest,
    LocationPointResponse,
    LocationHistoryResponse,
)

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer()

router = APIRouter(prefix="/locations", tags=["Locations"])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> User:
    """Get current user from Bearer token."""
    token = credentials.credentials

    try:
        payload = SecurityService.verify_token(token)
        user_id = payload.get("sub")

        if not user_id or payload.get("type") != "access":
            raise ValueError("Invalid token")

        user = await AuthService.get_user_by_id(db, user_id)

        if not user or not user.is_active:
            raise ValueError("User not found or inactive")

        return user

    except Exception as e:
        logger.warning(f"Authentication failed: {e}")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _location_response(loc) -> LocationPointResponse:
    """Convert a Location model into an API response."""

    return LocationPointResponse(
        id=loc.id,
        device_id=loc.device_id,
        latitude=loc.latitude,
        longitude=loc.longitude,
        accuracy=loc.accuracy,
        altitude=loc.altitude,
        speed=loc.speed,
        heading=loc.heading,
        timestamp=loc.timestamp,
        created_at=loc.created_at,
        source=loc.source,
        is_valid=loc.is_valid,
    )


@router.post(
    "",
    response_model=LocationPointResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_location(
    device_id: str,
    request: LocationPointCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Submit a location update from a device."""

    try:
        from app.services.device import DeviceService

        device = await DeviceService.get_device(
            db,
            device_id,
        )

        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found",
            )

        if device.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this device",
            )

        location = await LocationService.create_location(
            db=db,
            device_id=device_id,
            latitude=request.latitude,
            longitude=request.longitude,
            accuracy=request.accuracy,
            altitude=request.altitude,
            speed=request.speed,
            heading=request.heading,
            timestamp=request.timestamp,
            source=request.source,
        )

        logger.info(
            f"Location submitted by {current_user.email}: "
            f"Device {device_id}, Valid: {location.is_valid}"
        )

        return _location_response(location)

    except HTTPException:
        raise

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Location submission error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit location",
        )


@router.get(
    "/current/{device_id}",
    response_model=LocationPointResponse,
)
async def get_current_location(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Get the current location of a device."""

    try:
        location = await LocationService.get_location_with_permission_check(
            db,
            device_id,
            current_user.id,
        )

        if location is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this device's location",
            )

        return _location_response(location)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error retrieving current location: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve location",
        )


@router.get(
    "/history/{device_id}",
    response_model=LocationHistoryResponse,
)
async def get_location_history(
    device_id: str,
    start_date: datetime = Query(
        None,
        description="Start date (ISO format)",
    ),
    end_date: datetime = Query(
        None,
        description="End date (ISO format)",
    ),
    limit: int = Query(
        1000,
        ge=1,
        le=10000,
        description="Max results",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Get location history for a device."""

    try:
        history = await LocationService.get_location_history_with_permission_check(
            db,
            device_id,
            current_user.id,
            start_date,
            end_date,
            limit,
        )

        if history is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this device's history",
            )

        if end_date is None:
            end_date = datetime.now(timezone.utc)

        if start_date is None:
            start_date = end_date - timedelta(
                days=settings.LOCATION_RETENTION_DAYS
            )

        return LocationHistoryResponse(
            device_id=device_id,
            points=[_location_response(p) for p in history],
            count=len(history),
            period_start=start_date,
            period_end=end_date,
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error retrieving location history: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history",
        )