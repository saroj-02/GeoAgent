"""
Device management service using Motor async MongoDB driver.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models import Device


logger = logging.getLogger(__name__)


class DeviceService:
    """Device management service."""

    @staticmethod
    async def create_device(
        db: AsyncIOMotorDatabase,
        user_id: str,
        name: str,
        device_type: str,
        unique_identifier: str,
    ) -> Device:
        """
        Create a new device for a user.

        Raises:
            ValueError: If device already exists or user not found.
        """

        # Check that the user exists.
        if not await db.users.find_one(
            {"_id": user_id}
        ):
            raise ValueError(
                f"User {user_id} not found"
            )

        # Prevent duplicate device identifiers.
        if await db.devices.find_one(
            {
                "unique_identifier": unique_identifier
            }
        ):
            raise ValueError(
                "Device with identifier "
                f"{unique_identifier} already exists"
            )

        device = Device(
            user_id=user_id,
            name=name,
            device_type=device_type,
            unique_identifier=unique_identifier,
        )

        await db.devices.insert_one(
            device.to_mongo()
        )

        logger.info(
            "Device created: %s (owner: %s)",
            device.id,
            user_id,
        )

        return device

    @staticmethod
    async def get_device(
        db: AsyncIOMotorDatabase,
        device_id: str,
    ) -> Optional[Device]:
        """Get a device by its ID."""

        raw = await db.devices.find_one(
            {"_id": device_id}
        )

        if not raw:
            return None

        device = Device.from_mongo(raw)

        return device

    @staticmethod
    async def get_user_devices(
        db: AsyncIOMotorDatabase,
        user_id: str,
    ) -> List[Device]:
        """Get all devices belonging to a user."""

        cursor = (
            db.devices
            .find(
                {"user_id": user_id}
            )
            .sort(
                "created_at",
                -1,
            )
        )

        devices: List[Device] = []

        async for document in cursor:

            device = Device.from_mongo(
                document
            )

            if device is not None:
                devices.append(device)

        return devices

    @staticmethod
    async def update_device(
        db: AsyncIOMotorDatabase,
        device_id: str,
        name: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Device:
        """Update device details."""

        updates: dict = {
            "updated_at": datetime.now(
                timezone.utc
            )
        }

        if name is not None:
            updates["name"] = name

        if is_active is not None:
            updates["is_active"] = is_active

        result = await db.devices.find_one_and_update(
            {"_id": device_id},
            {"$set": updates},
            return_document=ReturnDocument.AFTER,
        )

        if not result:
            raise ValueError(
                f"Device {device_id} not found"
            )

        logger.info(
            "Device updated: %s",
            device_id,
        )

        device = Device.from_mongo(
            result
        )

        if device is None:
            raise ValueError(
                f"Could not convert device "
                f"{device_id} from MongoDB"
            )

        return device

    @staticmethod
    async def delete_device(
        db: AsyncIOMotorDatabase,
        device_id: str,
    ) -> None:
        """Delete a device and associated data."""

        result = await db.devices.delete_one(
            {"_id": device_id}
        )

        if result.deleted_count == 0:
            raise ValueError(
                f"Device {device_id} not found"
            )

        # Cascade delete location history.
        await db.locations.delete_many(
            {"device_id": device_id}
        )

        # Cascade delete permissions.
        await db.permissions.delete_many(
            {"device_id": device_id}
        )

        logger.info(
            "Device deleted: %s",
            device_id,
        )

    @staticmethod
    async def get_device_by_identifier(
        db: AsyncIOMotorDatabase,
        unique_identifier: str,
    ) -> Optional[Device]:
        """Get a device by unique identifier."""

        raw = await db.devices.find_one(
            {
                "unique_identifier":
                    unique_identifier
            }
        )

        if not raw:
            return None

        return Device.from_mongo(raw)