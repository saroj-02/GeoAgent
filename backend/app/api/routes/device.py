"""
Device management API routes.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_async_db
from app.core.security import SecurityService
from app.models import User
from app.schemas import (
    DeviceCreateRequest,
    DeviceResponse,
    DeviceUpdateRequest,
)
from app.services.auth import AuthService
from app.services.device import DeviceService


logger = logging.getLogger(__name__)

security = HTTPBearer()

router = APIRouter(
    prefix="/devices",
    tags=["Devices"],
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> User:
    """Authenticate the request and return the current user."""

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

    except Exception as exc:
        logger.warning("Authentication failed: %s", exc)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _device_response(device) -> DeviceResponse:
    """Convert a Device model into a DeviceResponse."""

    return DeviceResponse(
        id=str(device.id),
        user_id=str(device.user_id),
        name=device.name,
        device_type=device.device_type,
        unique_identifier=device.unique_identifier,
        is_active=device.is_active,
        last_seen=device.last_seen,
        created_at=device.created_at,
    )


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_device(
    request: DeviceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Create a new device for the authenticated user."""

    try:
        device = await DeviceService.create_device(
            db=db,
            user_id=current_user.id,
            name=request.name,
            device_type=request.device_type,
            unique_identifier=request.unique_identifier,
        )

        logger.info(
            "Device created by user %s: %s",
            current_user.email,
            device.id,
        )

        return _device_response(device)

    except ValueError as exc:
        logger.warning("Device creation failed: %s", exc)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        logger.exception("Device creation error: %s", exc)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create device",
        )


@router.get(
    "",
    response_model=List[DeviceResponse],
)
async def list_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """List all devices belonging to the authenticated user."""

    try:
        devices = await DeviceService.get_user_devices(
            db,
            current_user.id,
        )

        return [_device_response(device) for device in devices]

    except Exception as exc:
        logger.exception("Error listing devices: %s", exc)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list devices",
        )


@router.get(
    "/{device_id}",
    response_model=DeviceResponse,
)
async def get_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Get a single device belonging to the authenticated user."""

    try:
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
                detail="You do not have access to this device",
            )

        return _device_response(device)

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Error getting device: %s", exc)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get device",
        )


@router.patch(
    "/{device_id}",
    response_model=DeviceResponse,
)
async def update_device(
    device_id: str,
    request: DeviceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Update a device belonging to the authenticated user."""

    try:
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
                detail="You do not have permission to update this device",
            )

        updated_device = await DeviceService.update_device(
            db,
            device_id,
            name=request.name,
            is_active=request.is_active,
        )

        if not updated_device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found",
            )

        logger.info("Device updated: %s", device_id)

        return _device_response(updated_device)

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        logger.exception("Device update error: %s", exc)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update device",
        )


@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """
    Delete a device and its associated location/permission data.
    """

    try:
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
                detail="You do not have permission to delete this device",
            )

        await DeviceService.delete_device(
            db,
            device_id,
        )

        logger.info("Device deleted: %s", device_id)

        return None

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        logger.exception("Device deletion error: %s", exc)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete device",
        )