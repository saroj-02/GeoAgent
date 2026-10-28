"""
Location permission API routes.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_async_db
from app.core.security import SecurityService
from app.services.auth import AuthService
from app.services.permission import PermissionService
from app.services.device import DeviceService
from app.models import User
from app.schemas import (
    LocationPermissionCreateRequest,
    LocationPermissionResponse,
    PermissionListResponse,
)

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/permissions", tags=["Permissions"])


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


def _perm_response(p) -> LocationPermissionResponse:
    """Convert permission model into API response."""

    return LocationPermissionResponse(
        id=p.id,
        device_id=p.device_id,
        granted_by_id=p.granted_by_id,
        granted_to_id=p.granted_to_id,
        can_view_current=p.can_view_current,
        can_view_history=p.can_view_history,
        can_view_trail=p.can_view_trail,
        status=p.status,
        permission_level=p.permission_level,
        expires_at=p.expires_at,
        created_at=p.created_at,
    )


@router.post(
    "/location",
    response_model=LocationPermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def grant_location_permission(
    request: LocationPermissionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Grant location viewing permission for a device."""

    try:
        device = await DeviceService.get_device(
            db,
            str(request.device_id),
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

        grantee = await AuthService.get_user_by_email(
            db,
            request.granted_to_email,
        )

        if not grantee:
            raise ValueError(
                f"User with email {request.granted_to_email} not found"
            )

        permission = await PermissionService.grant_permission(
            db=db,
            device_id=str(request.device_id),
            granted_by_id=current_user.id,
            granted_to_id=grantee.id,
            can_view_current=request.can_view_current,
            can_view_history=request.can_view_history,
            can_view_trail=request.can_view_trail,
            permission_level=request.permission_level,
            expires_at=request.expires_at,
        )

        logger.info(
            f"Permission granted: {current_user.email} -> "
            f"{grantee.email} (Device {request.device_id})"
        )

        return _perm_response(permission)

    except HTTPException:
        raise

    except ValueError as e:
        logger.warning(f"Permission grant failed: {e}")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Permission grant error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to grant permission",
        )


@router.delete(
    "/location/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_location_permission(
    permission_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Revoke a location permission. Only the permission grantor can revoke."""

    try:
        raw = await db.permissions.find_one(
            {"_id": permission_id}
        )

        if not raw:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found",
            )

        if raw.get("granted_by_id") != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You did not grant this permission",
            )

        await PermissionService.revoke_permission(
            db,
            permission_id,
        )

        logger.info(
            f"Permission revoked: {permission_id}"
        )

        return None

    except HTTPException:
        raise

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(
            f"Permission revocation error: {e}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke permission",
        )


@router.get(
    "",
    response_model=PermissionListResponse,
)
async def list_permissions(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """List all location permissions for the current user."""

    try:
        granted_by = (
            await PermissionService
            .get_user_permissions_granted_by_them(
                db,
                current_user.id,
            )
        )

        granted_to = (
            await PermissionService
            .get_user_permissions_granted_to_them(
                db,
                current_user.id,
            )
        )

        return PermissionListResponse(
            granted_by_me=[
                _perm_response(p)
                for p in granted_by
            ],
            granted_to_me=[
                _perm_response(p)
                for p in granted_to
            ],
        )

    except Exception as e:
        logger.error(
            f"Error listing permissions: {e}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list permissions",
        )