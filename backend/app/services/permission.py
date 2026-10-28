"""
Location permission management service using Motor async MongoDB driver.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models import LocationPermission


logger = logging.getLogger(__name__)


class PermissionService:
    """Location permission management service."""

    @staticmethod
    async def grant_permission(
        db: AsyncIOMotorDatabase,
        device_id: str,
        granted_by_id: str,
        granted_to_id: str,
        can_view_current: bool = True,
        can_view_history: bool = False,
        can_view_trail: bool = True,
        permission_level: str = "viewer",
        expires_at: Optional[datetime] = None,
    ) -> LocationPermission:
        """
        Grant location viewing permission for a device.
        """

        device = await db.devices.find_one(
            {"_id": device_id}
        )

        if not device:
            raise ValueError(
                f"Device {device_id} not found"
            )

        if device["user_id"] != granted_by_id:
            raise ValueError(
                "Only device owner can grant permissions"
            )

        if not await db.users.find_one(
            {"_id": granted_by_id}
        ):
            raise ValueError(
                f"User {granted_by_id} not found"
            )

        if not await db.users.find_one(
            {"_id": granted_to_id}
        ):
            raise ValueError(
                f"User {granted_to_id} not found"
            )

        if granted_by_id == granted_to_id:
            raise ValueError(
                "Cannot grant permission to yourself"
            )

        existing = await db.permissions.find_one(
            {
                "device_id": device_id,
                "granted_to_id": granted_to_id,
            }
        )

        if existing:
            return await PermissionService.update_permission(
                db,
                str(existing["_id"]),
                can_view_current=can_view_current,
                can_view_history=can_view_history,
                can_view_trail=can_view_trail,
                permission_level=permission_level,
                expires_at=expires_at,
            )

        permission = LocationPermission(
            device_id=device_id,
            granted_by_id=granted_by_id,
            granted_to_id=granted_to_id,
            can_view_current=can_view_current,
            can_view_history=can_view_history,
            can_view_trail=can_view_trail,
            permission_level=permission_level,
            status="active",
            expires_at=expires_at,
        )

        await db.permissions.insert_one(
            permission.to_mongo()
        )

        logger.info(
            "Permission granted: %s -> Device %s",
            granted_to_id,
            device_id,
        )

        return permission

    @staticmethod
    async def update_permission(
        db: AsyncIOMotorDatabase,
        permission_id: str,
        can_view_current: Optional[bool] = None,
        can_view_history: Optional[bool] = None,
        can_view_trail: Optional[bool] = None,
        permission_level: Optional[str] = None,
        expires_at: Optional[datetime] = None,
    ) -> LocationPermission:
        """Update an existing permission."""

        updates: dict = {
            "updated_at": datetime.now(
                timezone.utc
            )
        }

        if can_view_current is not None:
            updates["can_view_current"] = (
                can_view_current
            )

        if can_view_history is not None:
            updates["can_view_history"] = (
                can_view_history
            )

        if can_view_trail is not None:
            updates["can_view_trail"] = (
                can_view_trail
            )

        if permission_level is not None:
            updates["permission_level"] = (
                permission_level
            )

        if expires_at is not None:
            updates["expires_at"] = expires_at

        result = await db.permissions.find_one_and_update(
            {"_id": permission_id},
            {"$set": updates},
            return_document=ReturnDocument.AFTER,
        )

        if not result:
            raise ValueError(
                f"Permission {permission_id} not found"
            )

        logger.info(
            "Permission updated: %s",
            permission_id,
        )

        permission = LocationPermission.from_mongo(
            result
        )

        if permission is None:
            raise ValueError(
                "Could not convert permission "
                f"{permission_id} from MongoDB"
            )

        return permission

    @staticmethod
    async def revoke_permission(
        db: AsyncIOMotorDatabase,
        permission_id: str,
    ) -> None:
        """Revoke a permission."""

        result = await db.permissions.update_one(
            {"_id": permission_id},
            {
                "$set": {
                    "status": "revoked",
                    "updated_at": datetime.now(
                        timezone.utc
                    ),
                }
            },
        )

        if result.matched_count == 0:
            raise ValueError(
                f"Permission {permission_id} not found"
            )

        logger.info(
            "Permission revoked: %s",
            permission_id,
        )

    @staticmethod
    async def check_permission(
        db: AsyncIOMotorDatabase,
        device_id: str,
        requester_id: str,
        permission_type: str = "current",
    ) -> bool:
        """
        Check whether a user can access a device location.

        permission_type:
            current
            history
            trail
        """

        # Device owner always has access.
        device = await db.devices.find_one(
            {"_id": device_id}
        )

        if (
            device
            and device.get("user_id")
            == requester_id
        ):
            return True

        # Check explicit permission.
        perm_raw = await db.permissions.find_one(
            {
                "device_id": device_id,
                "granted_to_id": requester_id,
                "status": "active",
            }
        )

        if not perm_raw:
            return False

        # Check expiration.
        expires_at = perm_raw.get(
            "expires_at"
        )

        if (
            expires_at
            and expires_at
            < datetime.now(timezone.utc)
        ):
            return False

        if permission_type == "current":
            return bool(
                perm_raw.get(
                    "can_view_current",
                    False,
                )
            )

        if permission_type == "history":
            return bool(
                perm_raw.get(
                    "can_view_history",
                    False,
                )
            )

        if permission_type == "trail":
            return bool(
                perm_raw.get(
                    "can_view_trail",
                    False,
                )
            )

        return False

    @staticmethod
    async def get_user_permissions_granted_by_them(
        db: AsyncIOMotorDatabase,
        user_id: str,
    ) -> List[LocationPermission]:
        """Get permissions granted by a user."""

        cursor = (
            db.permissions
            .find(
                {"granted_by_id": user_id}
            )
            .sort(
                "created_at",
                -1,
            )
        )

        permissions: List[
            LocationPermission
        ] = []

        async for document in cursor:

            permission = (
                LocationPermission.from_mongo(
                    document
                )
            )

            if permission is not None:
                permissions.append(
                    permission
                )

        return permissions

    @staticmethod
    async def get_user_permissions_granted_to_them(
        db: AsyncIOMotorDatabase,
        user_id: str,
    ) -> List[LocationPermission]:
        """Get permissions granted to a user."""

        cursor = (
            db.permissions
            .find(
                {"granted_to_id": user_id}
            )
            .sort(
                "created_at",
                -1,
            )
        )

        permissions: List[
            LocationPermission
        ] = []

        async for document in cursor:

            permission = (
                LocationPermission.from_mongo(
                    document
                )
            )

            if permission is not None:
                permissions.append(
                    permission
                )

        return permissions